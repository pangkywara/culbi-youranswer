"""
main.py
────────
FastAPI application – exposes all Gemini tools via REST endpoints.

Run locally (from inside the backend/ directory):
    cd backend && venv/bin/uvicorn main:app --reload --port 8000

Or use the helper script from the project root:
    ./backend/start.sh

Endpoints
─────────
POST /search           – Google Search grounding
POST /maps             – Google Maps grounding
POST /code             – Code Execution
POST /url-context      – URL Context (+ optional Search)
POST /file-search      – File Search (RAG)
POST /agent            – Generic agent endpoint (choose tool in body)

GET  /health           – Health check
GET  /tools            – List available tools
"""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import secrets

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agent import GeminiAgent, ToolName
from config import settings
from tools.file_search import FileSearchStore
from tools.chat import chat as gemini_chat, ChatTurn
from tools.user_context import UserProfile
from tools.location import UserLocation
import tools.landmark_detection as _landmark_mod
import tools.landmark_enrich as _enrich_mod
import tools.trip_concierge as _concierge_mod
import tools.landmark_db as _landmark_db_mod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thread pool for running blocking Gemini SDK calls inside async endpoints.
# Both the landmark detection pre-pass and the main chat call are blocking I/O,
# so they must be offloaded to threads to avoid stalling the event loop.
_THREAD_POOL = ThreadPoolExecutor(max_workers=8)

app = FastAPI(
    title="Cultural Bridge – Gemini AI Backend",
    version="1.0.0",
    description="Modular Gemini API backend with Google Search, Maps, Code Execution, URL Context and File Search.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent = GeminiAgent()


# ──────────────────────────────────────────────────────────────────────────────
# API Key authentication middleware
# ──────────────────────────────────────────────────────────────────────────────

_SKIP_AUTH_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    """Reject requests that don't carry a valid X-API-Key header.
    Auth is skipped when BACKEND_API_KEY is empty (local dev).
    """
    api_key = settings.backend_api_key
    if api_key and request.url.path not in _SKIP_AUTH_PATHS:
        client_key = request.headers.get("X-API-Key", "")
        if not secrets.compare_digest(client_key, api_key):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )
    return await call_next(request)


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────────────────────────────────────

class BaseRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User prompt / question")
    model: str | None = Field(None, description="Override the Gemini model to use")
    system_instruction: str | None = Field(None, description="Optional system-level instruction")


class SearchRequest(BaseRequest):
    pass


class MapsRequest(BaseRequest):
    latitude: float | None = Field(None, description="User latitude for geo-context")
    longitude: float | None = Field(None, description="User longitude for geo-context")
    enable_widget: bool = Field(False, description="Return a Maps widget context token")


class CodeRequest(BaseRequest):
    pass


class UrlContextRequest(BaseRequest):
    urls: list[str] | None = Field(None, max_length=20, description="Up to 20 URLs to fetch")
    also_use_search: bool = Field(False, description="Combine with Google Search")


class FileSearchRequest(BaseRequest):
    store_names: list[str] | None = Field(None, description="Override file search store names")
    metadata_filter: str | None = Field(None, description="AIP-160 metadata filter string")


class AgentRequest(BaseRequest):
    tool: ToolName = Field(..., description="Which tool to use")
    kwargs: dict[str, Any] = Field(default_factory=dict, description="Tool-specific keyword arguments")


class LandmarkDetectRequest(BaseModel):
    """Request body for POST /landmark-detect."""
    base64_image: str = Field(
        ...,
        description="Raw base64-encoded image bytes (no data-URI prefix).",
    )
    mime_type: str = Field(
        "image/jpeg",
        description="MIME type of the image: image/jpeg | image/png | image/webp | image/heic",
    )
    model: str | None = Field(None, description="Override Gemini model")
    extra_context: str | None = Field(
        None,
        description="Optional free-text hint (soft signal). Passed only for camera captures.",
    )
    user_id: str | None = Field(
        None,
        description="auth.uid() from the frontend — used to record scan history. Optional.",
    )


class LandmarkEnrichRequest(BaseModel):
    """Request body for POST /landmark-enrich."""
    landmark_name: str = Field(..., description="Official name of the detected landmark.")
    country: str | None = Field(None, description="Country where the landmark is located.")
    city: str | None = Field(None, description="City / region where the landmark is located.")
    landmark_id: str | None = Field(None, description="Database UUID for verified facts lookup.")


class UploadFileRequest(BaseModel):
    store_name: str = Field(..., description="Target file search store resource name")
    file_path: str = Field(..., description="Local path to the file to upload")
    display_name: str | None = None


class ChatTurnModel(BaseModel):
    role: str = Field(..., description="'user' or 'model'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Latest user message")
    history: list[ChatTurnModel] = Field(
        default_factory=list,
        description="Previous turns, oldest first. role='user' or 'model'.",
    )
    use_search: bool = Field(True, description="Enable Google Search grounding")
    model: str | None = None
    # User profile — forwarded from the frontend so Culbi can personalise replies.
    # Optional: unauthenticated / guest users won't supply these.
    user_name:   str | None = Field(None, description="User's display name from their profile")
    user_region: str | None = Field(None, description="User's home region from their profile")
    # Image attachment — base64-encoded photo from the user's camera / library.
    # The frontend encodes the picked image to base64 before sending.
    image_base64: str | None = Field(None, description="Raw base64 image bytes (no data-URI prefix)")
    image_mime:   str        = Field("image/jpeg", description="MIME type: image/jpeg | image/png | image/webp")
    # GPS location — only present when the user has granted location permission.
    user_latitude:            float | None = Field(None, description="GPS latitude from the user's device")
    user_longitude:           float | None = Field(None, description="GPS longitude from the user's device")
    user_city:                str   | None = Field(None, description="City hint from device reverse-geocode")
    user_location_timestamp:  str   | None = Field(None, description="ISO 8601 timestamp of when the GPS fix was taken")
    # Trip editing mode — when user is editing an existing trip via TripPlanningBotSheet
    trip_edit_mode: bool = Field(False, description="True when editing an existing trip, False when creating new")
    trip_data: dict | None = Field(None, description="Current trip data with stops for editing context")


class TripStopLandmark(BaseModel):
    name: str
    thumbnail_url: str | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    rarity_weight: float | None = None
    sign_count: int | None = None


class TripStopModel(BaseModel):
    stop_order: int
    date: str | None = None
    landmark: TripStopLandmark


class ConciergeRequest(BaseModel):
    """Body for POST /trip-concierge."""
    message:   str = Field(..., min_length=1, description="User's natural-language request")
    trip_id:   str = Field(..., description="Local trip ID from TripContext")
    trip_name: str = Field(..., description="Human-readable trip name for context")
    stops:     list[TripStopModel] = Field(default_factory=list)
    user_id:   str = Field(..., description="auth.uid() from the frontend — enforces identity lock")
    history:   list[ChatTurnModel] = Field(default_factory=list)
    model:     str | None = None


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok", "model": settings.default_model}


@app.get("/tools", tags=["Meta"])
def list_tools():
    """Return all available tool names."""
    return {
        "tools": [t.value for t in ToolName],
        "descriptions": {
            ToolName.google_search:       "Ground responses in real-time web content",
            ToolName.google_maps:         "Location-aware responses using Google Maps data",
            ToolName.code_execution:      "Write and run Python code server-side",
            ToolName.url_context:         "Fetch and analyse content from specific URLs",
            ToolName.file_search:         "RAG over your own indexed File Search documents",
            ToolName.search_and_url:      "Google Search + URL Context combined",
            ToolName.landmark_detection:  "Multimodal landmark detection via Gemini vision + Search",
        },
    }


@app.post("/search", tags=["Tools"])
def search(req: SearchRequest):
    """Ground the response using real-time Google Search results."""
    try:
        return _agent.run(
            ToolName.google_search,
            req.prompt,
            model=req.model,
            system_instruction=req.system_instruction,
        )
    except Exception as exc:
        logger.exception("Google Search tool failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/maps", tags=["Tools"])
def maps(req: MapsRequest):
    """Return location-aware answers grounded in Google Maps data."""
    try:
        return _agent.run(
            ToolName.google_maps,
            req.prompt,
            latitude=req.latitude,
            longitude=req.longitude,
            enable_widget=req.enable_widget,
            model=req.model,
            system_instruction=req.system_instruction,
        )
    except Exception as exc:
        logger.exception("Google Maps tool failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/code", tags=["Tools"])
def code(req: CodeRequest):
    """Let Gemini write and run Python code to answer the prompt."""
    try:
        return _agent.run(
            ToolName.code_execution,
            req.prompt,
            model=req.model,
            system_instruction=req.system_instruction,
        )
    except Exception as exc:
        logger.exception("Code Execution tool failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/url-context", tags=["Tools"])
def url_context(req: UrlContextRequest):
    """Analyse content from specific URLs and answer the prompt."""
    try:
        return _agent.run(
            ToolName.search_and_url if req.also_use_search else ToolName.url_context,
            req.prompt,
            urls=req.urls,
            also_use_search=req.also_use_search,
            model=req.model,
            system_instruction=req.system_instruction,
        )
    except Exception as exc:
        logger.exception("URL Context tool failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/file-search", tags=["Tools"])
def file_search(req: FileSearchRequest):
    """Answer the prompt using RAG over your indexed File Search documents."""
    try:
        return _agent.run(
            ToolName.file_search,
            req.prompt,
            store_names=req.store_names,
            metadata_filter=req.metadata_filter,
            model=req.model,
            system_instruction=req.system_instruction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("File Search tool failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/agent", tags=["Agent"])
def agent_endpoint(req: AgentRequest):
    """
    Generic agent endpoint – choose any tool via the `tool` field
    and pass tool-specific parameters via `kwargs`.
    """
    try:
        return _agent.run(
            req.tool,
            req.prompt,
            model=req.model,
            system_instruction=req.system_instruction,
            **req.kwargs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Agent endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/chat", tags=["Chat"])
async def chat_endpoint(req: ChatRequest):
    """
    Multi-turn conversational endpoint used by the mobile app chatbot.

    The caller (React Native hook) maintains history in Supabase and
    sends the last N turns on each request so Gemini has context.

    Response schema:
        {
          "text":           str,
          "sources":        [{uri, title}],
          "search_queries": [str],
          "tool_used":      str | null
        }
    """
    loop = asyncio.get_event_loop()
    try:
        history = [ChatTurn(role=t.role, content=t.content) for t in req.history]
        profile = UserProfile(name=req.user_name, region=req.user_region) \
                  if (req.user_name or req.user_region) else None
        location = UserLocation(
            latitude=req.user_latitude,
            longitude=req.user_longitude,
            city=req.user_city,
            captured_at=req.user_location_timestamp,
        ) if (req.user_latitude is not None and req.user_longitude is not None) else None
        # ── Landmark detection pre-processing (async, hard 8 s timeout) ───────
        # Run in a thread so the event loop stays free. Hard-cap at 8 s: if
        # Vision AI is slow the hint is skipped and Culbi uses native vision.
        landmark_hint: str | None = None
        if req.image_base64:
            geo_hint: str | None = None
            if location:
                geo_parts = [f"Lat {location.latitude:.4f}, Lon {location.longitude:.4f}"]
                if location.city:
                    geo_parts.append(f"City: {location.city}")
                geo_hint = "; ".join(geo_parts)

            # Capture for closure (avoids late-binding issues inside threads)
            _image_b64  = req.image_base64
            _image_mime = req.image_mime
            _geo_hint   = geo_hint

            def _run_detection() -> str | None:
                try:
                    detection = _landmark_mod.run(
                        _image_b64,
                        mime_type=_image_mime,
                        extra_context=_geo_hint,
                    )
                    lm = detection.landmark
                    if lm.confidence_score <= 0.0:
                        return None
                    hint_lines = [
                        "[VISION PRE-ANALYSIS] An independent landmark-detection system"
                        " analysed this photo before passing it to you. Use this as a"
                        " reliable starting point, and add your own expert detail by"
                        " also visually inspecting the image above.",
                        "",
                        f"• Identification: {lm.landmark_name}",
                    ]
                    if lm.local_name:
                        hint_lines.append(f"• Local name: {lm.local_name}")
                    loc_parts = [p for p in [lm.city, lm.country] if p]
                    if loc_parts:
                        hint_lines.append(f"• Location: {', '.join(loc_parts)}")
                    if lm.latitude is not None and lm.longitude is not None:
                        hint_lines.append(f"• Coordinates: {lm.latitude:.6f}, {lm.longitude:.6f}")
                    hint_lines.append(f"• Category: {lm.category}")
                    if lm.short_description:
                        hint_lines.append(f"• Description: {lm.short_description}")
                    if lm.historical_note:
                        hint_lines.append(f"• Historical significance: {lm.historical_note}")
                    if lm.recognition_cues:
                        hint_lines.append(f"• Visual cues: {lm.recognition_cues}")
                    verified = " \u2713 search-verified" if lm.search_verified else ""
                    hint_lines.append(f"• Confidence: {lm.confidence_score:.0%}{verified}")
                    return "\n".join(hint_lines)
                except Exception as exc:
                    logger.warning("Landmark pre-processing failed (non-critical): %s", exc)
                    return None

            try:
                landmark_hint = await asyncio.wait_for(
                    loop.run_in_executor(_THREAD_POOL, _run_detection),
                    timeout=8.0,
                )
            except asyncio.TimeoutError:
                logger.warning("Landmark detection timed out (>8 s) — skipping hint")

        # ── Main chat call (blocking SDK → offload to thread) ─────────────────
        def _run_chat() -> Any:
            return gemini_chat(
                message=req.message,
                history=history,
                model=req.model,
                use_search=req.use_search,
                user_profile=profile,
                image_base64=req.image_base64,
                image_mime=req.image_mime,
                user_location=location,
                landmark_hint=landmark_hint,
                trip_edit_mode=req.trip_edit_mode,
                trip_data=req.trip_data,
            )

        result = await loop.run_in_executor(_THREAD_POOL, _run_chat)
        return {
            "text":             result.text,
            "sources":          result.sources,
            "search_queries":   result.search_queries,
            "tool_used":        result.tool_used,
            "location":         result.location,
            "landmark_context": result.landmark_context,
        }
    except Exception as exc:
        logger.exception("Chat endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/trip-concierge", tags=["Chat"])
def trip_concierge_endpoint(req: ConciergeRequest):
    """
    Culbi AI Concierge — interprets a natural-language trip request and returns
    a structured PROPOSE_CHANGES payload the frontend can render as a preview.

    Security
    --------
    • `user_id` must be the caller's auth.uid(). The backend stores this in
      `trip_proposals` (with service-role key) but RLS ensures each user can
      only read/update their own rows.
    • Gemini never sees the DB password — only the serialised trip stops.

    Response schema
    ---------------
    {
      "action_type":  "PROPOSE_CHANGES" | "CHAT",
      "summary":      str,         — human-readable explanation
      "proposal_id":  str | null,  — Supabase row UUID (null for CHAT)
      "changes": {
        "additions": [{date, stop_order, landmark: {name, thumbnail_url,
                        description, latitude, longitude, rarity_weight}}],
        "reorders":  [{stop_id, new_date, new_order}],
        "deletions": [{stop_id}]
      }
    }
    """
    try:
        stops_raw = [s.model_dump() for s in req.stops]
        result = _concierge_mod.run_concierge(
            message=req.message,
            trip_id=req.trip_id,
            trip_name=req.trip_name,
            stops=stops_raw,
            user_id=req.user_id,
            history=[{"role": t.role, "content": t.content} for t in req.history],
            model=req.model,
        )
        return {
            "action_type": result.action_type,
            "summary":     result.summary,
            "proposal_id": result.proposal_id,
            "changes": {
                "additions": result.changes.additions,
                "reorders":  result.changes.reorders,
                "deletions": result.changes.deletions,
            },
        }
    except Exception as exc:
        logger.exception("Trip concierge endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/landmark-detect", tags=["Vision"])
def landmark_detect(req: LandmarkDetectRequest):
    """
    Detect the landmark in a base64-encoded image using Gemini multimodal
    vision + Google Search grounding.

    This is intentionally a **standalone endpoint** — it does not go through
    GeminiAgent so the image payload never has to be serialised into the
    generic agent request model.

    Contrast with ``POST /landmark-detect`` vs the Google Cloud Vision
    ``LANDMARK_DETECTION`` feature:
      • Cloud Vision: fixed internal database, misses regional landmarks.
      • This endpoint: Gemini vision + live Search grounding, can identify
        Southeast Asian landmarks (Monas, Rumah Radakng, etc.) by reasoning
        about visual cues and verifying via Search.

    Request body
    ------------
    base64_image   : str   — raw base64, no ``data:image/...;base64,`` prefix
    mime_type      : str   — image/jpeg (default) | image/png | image/webp
    model          : str?  — override Gemini model (optional)
    extra_context  : str?  — hint like "Taken in Pontianak, Indonesia" (optional)

    Response
    --------
    {
      "landmark": {
        "landmark_name": str,
        "local_name": str | null,
        "confidence_score": float,
        "category": str,
        "country": str | null,
        "city": str | null,
        "latitude": float | null,
        "longitude": float | null,
        "short_description": str | null,
        "historical_note": str | null,
        "recognition_cues": str | null,
        "search_verified": bool
      },
      "sources": [{"uri": str, "title": str}],
      "search_queries": [str],
      "model_used": str,
      "raw_text": str
    }
    """
    try:
        result = _landmark_mod.run(
            base64_image=req.base64_image,
            mime_type=req.mime_type,
            model=req.model,
            extra_context=req.extra_context,
        )
        payload = result.to_dict()
        lm = result.landmark

        # ── DB enrichment: find matching landmark + fun facts ─────────────────
        # Only run when Gemini returned a real result (not "Unknown Location")
        db_match: _landmark_db_mod.DbLandmarkMatch | None = None
        if lm.landmark_name and lm.landmark_name != "Unknown Location":
            try:
                db_match = _landmark_db_mod.lookup_detected_landmark(
                    name=lm.landmark_name,
                    latitude=lm.latitude,
                    longitude=lm.longitude,
                )
            except Exception as db_exc:
                logger.warning("DB lookup failed (non-critical): %s", db_exc)

        # Augment response with DB data
        payload["db_landmark_id"] = db_match.id if db_match else None
        payload["db_image_url"]   = db_match.image_url if db_match else None
        payload["fun_facts"]      = list(db_match.fun_facts) if db_match else []
        payload["db_match_source"] = db_match.match_source if db_match else "none"

        # ── Store scan history (fire-and-forget, never blocks response) ───────
        if req.user_id and lm.landmark_name != "Unknown Location":
            try:
                from supabase import create_client as _create_client
                _sb = _create_client(
                    settings.supabase_url,
                    settings.supabase_service_role_key,
                )
                _sb.table("user_landmark_scans").insert({
                    "user_id":          req.user_id,
                    "detected_name":    lm.landmark_name,
                    "landmark_id":      db_match.id if db_match else None,
                    "confidence_score": lm.confidence_score,
                    "latitude":         lm.latitude,
                    "longitude":        lm.longitude,
                    "country":          lm.country,
                    "city":             lm.city,
                    "category":         lm.category,
                    "model_used":       result.model_used,
                    "db_match_source":  db_match.match_source if db_match else "none",
                }).execute()
            except Exception as hist_exc:
                logger.warning("Scan history insert failed (non-critical): %s", hist_exc)

        return payload
    except Exception as exc:
        logger.exception("Landmark detect endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/landmark-enrich", tags=["Vision"])
def landmark_enrich(req: LandmarkEnrichRequest):
    """
    Generate 3 AI flashcard items (pronunciation, secret, fun fact)
    for a previously detected landmark.

    When landmark_id is provided, facts are sourced from the landmark_facts
    database with randomization to ensure users get unique verified facts.

    Request body
    ------------
    landmark_name : str   — official landmark name (required)
    country       : str?  — country (optional)
    city          : str?  — city / region (optional)
    landmark_id   : str?  — database UUID for verified facts (optional)

    Response
    --------
    { "flashcards": [...], "model_used": str }
    """
    logger.info(f"[/landmark-enrich] Request for: {req.landmark_name}, landmark_id: {req.landmark_id}")
    try:
        result = _enrich_mod.run(
            landmark_name=req.landmark_name,
            country=req.country,
            city=req.city,
            landmark_id=req.landmark_id,
        )
        logger.info(f"[/landmark-enrich] Success: generated {len(result.flashcards)} flashcards")
        return result.to_dict()
    except Exception as exc:
        logger.exception("Landmark enrich endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# File Search store management endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/file-search/stores", tags=["File Search Stores"])
def list_stores():
    """List all File Search stores in the project."""
    try:
        stores = FileSearchStore.list_all()
        return {"stores": [str(s) for s in stores]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/file-search/stores", tags=["File Search Stores"])
def create_store(display_name: str):
    """Create a new File Search store."""
    try:
        store = FileSearchStore.create(display_name)
        return {"name": store.name, "display_name": display_name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/file-search/stores/{store_id}", tags=["File Search Stores"])
def delete_store(store_id: str):
    """Delete a File Search store by its ID portion of the resource name."""
    try:
        FileSearchStore.delete(f"fileSearchStores/{store_id}")
        return {"deleted": store_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/file-search/upload", tags=["File Search Stores"])
def upload_file(req: UploadFileRequest):
    """Upload a local file into a File Search store and wait for indexing."""
    try:
        FileSearchStore.upload(
            store_name=req.store_name,
            file_path=req.file_path,
            display_name=req.display_name,
        )
        return {"status": "indexed", "store": req.store_name, "file": req.file_path}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# Dev entry-point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
