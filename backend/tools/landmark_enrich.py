"""
tools/landmark_enrich.py
────────────────────────
Generate bite-sized AI flashcards for a detected landmark using Gemini + Search.

Given a landmark name (and optional country / city), this module returns
exactly **3 flashcard items** covering:

  1. **Pronunciation** – local name with phonetic guide
  2. **Secret**        – a surprising lesser-known fact
  3. **Fun Fact**      – cultural / historical insight with learn-more URL

The flashcard content is grounded via Google Search for factual accuracy.
"""

from __future__ import annotations

import json
import random
import re
from dataclasses import dataclass, field
from typing import Any

from google.genai import types
from supabase import create_client, Client

from config import settings
from gemini_client import gemini
from tools.google_search import build_tool as _search_tool

# ─── Prompts ──────────────────────────────────────────────────────────────────

_SYSTEM_INSTRUCTION = """\
You are a world-class cultural educator that creates engaging, bite-sized
learning cards about landmarks and heritage sites.

CRITICAL RULES
──────────────
1. ALWAYS create SPECIFIC, DETAILED content about the EXACT landmark mentioned.
2. NEVER use generic phrases like "remarkable cultural heritage", "unique significance", or "amazing place".
3. Use the provided database facts as the PRIMARY source when available.
4. For pronunciation: Find the ACTUAL local name and create an ACCURATE phonetic guide.
5. For secret facts: Use intriguing phrasing like "Few know that..." or "Hidden beneath..." with REAL secrets.
6. For fun facts: Share SPECIFIC cultural, historical, or architectural details.
7. Each fact must be ≤ 160 characters and captivating.
8. ONLY use verified database facts or Google Search results - NEVER make up facts.
9. Include learn_more_url with Wikipedia or official site links.

OUTPUT FORMAT REQUIREMENT
──────────────────────────
YOU MUST respond with ONLY a valid JSON array - NO other text before or after.
NO markdown code fences (```json), NO explanations, NO prose.
Just the raw JSON array starting with [ and ending with ].
"""

_ENRICH_PROMPT_TEMPLATE = """\
Your task: Create exactly 3 learning flashcards for this landmark.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANDMARK INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Name    : {landmark_name}
  Country : {country}
  City    : {city}

{facts_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLASHCARD REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{special_instructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON ONLY - NO TEXT BEFORE OR AFTER):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[{{
  "type": "pronunciation",
  "title": "How to Say It",
  "subtitle": "[Actual local name in native script/language]",
  "content": "[Brief meaning or translation of the name]",
  "phonetic": "[Phonetic guide like: moh-NAHS or tah-ZHEE mah-HAHL]"
}}, {{
  "type": "secret",
  "title": "Hidden Secret",
  "subtitle": "Did You Know?",
  "content": "[Intriguing fact starting with 'Few know that...' or 'Hidden beneath...']"
}}, {{
  "type": "fun_fact",
  "title": "Fun Fact",
  "subtitle": "Cultural Insight",
  "content": "[Specific historical, cultural, or architectural detail]",
  "learn_more_url": "[Wikipedia or official site URL]"
}}]

⚠️ CRITICAL: Every field marked with [...] MUST contain SPECIFIC facts about {landmark_name}.
⚠️ FORBIDDEN: Generic text like "remarkable heritage", "unique significance", "amazing place".
⚠️ REQUIRED: Use REAL facts from database or Search - no made-up content.
"""

_ENRICH_WITH_DB_FACTS = """\
✓ VERIFIED DATABASE FACTS (PRIMARY SOURCE - USE THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{numbered_facts}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ MANDATORY TRANSFORMATIONS:
- SECRET card: Transform fact #{secret_index} into mysterious revelation
  • Start with "Few know that..." or "Hidden beneath..." or "Locals whisper that..."
  • Make it intriguing and surprising
  • Maximum 160 characters

- FUN FACT card: Transform fact #{fun_index} into engaging cultural insight
  • Focus on cultural, historical, or architectural significance
  • Use specific details and numbers when available
  • Maximum 160 characters

- PRONUNCIATION: Use Google Search to find the local name and phonetic
  • Find the ACTUAL local language name (not just English)
  • Create accurate phonetic pronunciation
  • Explain what the name means if possible
"""

_ENRICH_WITHOUT_DB_FACTS = """\
⚠️ NO DATABASE FACTS AVAILABLE - MUST USE GOOGLE SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED RESEARCH (use Google Search tool):
1. Search for "{landmark_name}" to find verified facts
2. Find the local/native name and pronunciation
3. Find one SPECIFIC secret or lesser-known fact
4. Find one SPECIFIC cultural/historical detail
5. Find the Wikipedia or official website URL

⚠️ CRITICAL: ALL content MUST come from Search results - NO generic text allowed!
"""

# ─── JSON extraction helpers ─────────────────────────────────────────────────

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


def _parse_json_array(raw: str) -> list[dict[str, Any]]:
    """Robustly extract a JSON array from model output."""
    text = raw.strip()

    # Attempt 1 – direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Attempt 2 – strip markdown fences
    fence_match = _FENCE_RE.search(text)
    if fence_match:
        try:
            parsed = json.loads(fence_match.group(1).strip())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    # Attempt 3 – extract first [...] block
    arr_match = _ARRAY_RE.search(text)
    if arr_match:
        try:
            parsed = json.loads(arr_match.group(0))
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    return []


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class FlashcardItem:
    """A single flashcard."""

    type: str
    title: str
    subtitle: str
    content: str
    phonetic: str | None = None
    learn_more_url: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FlashcardItem:
        return cls(
            type=data.get("type", "fun_fact"),
            title=data.get("title", ""),
            subtitle=data.get("subtitle", ""),
            content=data.get("content", ""),
            phonetic=data.get("phonetic"),
            learn_more_url=data.get("learn_more_url"),
        )

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "type": self.type,
            "title": self.title,
            "subtitle": self.subtitle,
            "content": self.content,
        }
        if self.phonetic is not None:
            d["phonetic"] = self.phonetic
        if self.learn_more_url is not None:
            d["learn_more_url"] = self.learn_more_url
        return d


@dataclass
class LandmarkEnrichResult:
    """Full response returned by :func:`run`."""

    flashcards: list[FlashcardItem] = field(default_factory=list)
    model_used: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "flashcards": [fc.to_dict() for fc in self.flashcards],
            "model_used": self.model_used,
        }


# ─── Public API ───────────────────────────────────────────────────────────────

def _fetch_db_facts(landmark_id: str) -> list[str]:
    """
    Fetch all fun facts for a landmark from the database.
    Returns empty list if no facts found or DB unavailable.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return []

    try:
        client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

        rows = (
            client.table("landmark_facts")
            .select("fact_content")
            .eq("landmark_id", landmark_id)
            .order("created_at", desc=False)  # Keep consistent order
            .execute()
            .data
        ) or []

        return [r["fact_content"] for r in rows if r.get("fact_content")]
    except Exception as e:
        import logging
        logging.warning(f"Failed to fetch DB facts for {landmark_id}: {e}")
        return []


def _select_random_facts(facts: list[str], count: int = 2) -> tuple[list[str], list[int]]:
    """
    Randomly select 'count' facts from the list.
    Returns (selected_facts, selected_indices).
    
    Ensures different users get different facts (randomized),
    but the same user could get the same facts on subsequent runs.
    """
    if len(facts) <= count:
        return facts, list(range(len(facts)))
    
    # Random sample without replacement
    indices = random.sample(range(len(facts)), count)
    selected = [facts[i] for i in indices]
    return selected, indices


def run(
    landmark_name: str,
    *,
    country: str | None = None,
    city: str | None = None,
    landmark_id: str | None = None,
    model: str | None = None,
) -> LandmarkEnrichResult:
    """
    Generate 3 flashcard items for *landmark_name* using DB facts + Gemini formatting.

    Parameters
    ----------
    landmark_name:
        Official name of the landmark.
    country:
        Country where the landmark is located (optional).
    city:
        City / region where the landmark is located (optional).
    landmark_id:
        Database UUID for the landmark. If provided, facts are sourced from
        landmark_facts table with randomization (optional).
    model:
        Override the Gemini model to use.  Defaults to ``settings.default_model``.

    Returns
    -------
    LandmarkEnrichResult
        Contains a list of 3 FlashcardItem objects with pronunciation,
        secret fact (most obscure), and fun fact.
    """
    resolved_model = model or settings.default_model

    # Fetch and randomize database facts if landmark_id provided
    db_facts: list[str] = []
    selected_indices: list[int] = []
    if landmark_id:
        all_facts = _fetch_db_facts(landmark_id)
        if all_facts:
            db_facts, selected_indices = _select_random_facts(all_facts, count=2)

    # Build facts context for the prompt
    if db_facts:
        # Number the facts for reference in instructions
        numbered = "\n".join(f"{i+1}. {fact}" for i, fact in enumerate(db_facts))
        facts_context = _ENRICH_WITH_DB_FACTS.format(
            numbered_facts=numbered,
            secret_index=1,  # Use first selected fact as "secret"
            fun_index=2,     # Use second selected fact as "fun fact"
        )
        special_instructions = """\
FOR THE FLASHCARDS:
- Secret card: Transform database fact #1 into a mysterious, intriguing revelation (under 140 chars)
- Fun fact card: Transform database fact #2 into an engaging cultural insight (under 140 chars)
- Pronunciation: Use Search to find the local name and phonetic guide
"""
    else:
        facts_context = _ENRICH_WITHOUT_DB_FACTS.format(landmark_name=landmark_name)
        special_instructions = """
📋 FLASHCARD CREATION INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ PRONUNCIATION CARD:
   • Search for "{landmark_name} local name" or "{landmark_name} native language"
   • Find the ACTUAL name in local language (e.g., Thai, Arabic, Chinese)
   • Create phonetic guide (e.g., "wah-LAHT prah-KEH-ow" for Thai landmark)
   • Explain what the name means (e.g., "Temple of the Emerald Buddha")

2️⃣ SECRET CARD:
   • Search for "{landmark_name} secrets" or "{landmark_name} hidden facts"
   • Find ONE specific, little-known fact
   • Start with "Few know that..." or "Hidden beneath..." or "Locals say..."
   • Examples of GOOD secrets:
     ✓ "Few know that 872 diamonds decorate the hidden chamber"
     ✓ "Hidden beneath lies a 14th-century escape tunnel"
     ✗ "This landmark has remarkable cultural significance" (TOO GENERIC)

3️⃣ FUN FACT CARD:
   • Search for "{landmark_name} history" or "{landmark_name} architecture"
   • Find ONE specific cultural/historical detail
   • Include numbers, dates, or specific details
   • Examples of GOOD facts:
     ✓ "Built over 22 years by 20,000 craftsmen starting in 1632"
     ✓ "The golden spire contains 5,448 diamonds and 2,086 rubies"
     ✗ "This place has a rich history" (TOO GENERIC)

⚠️ FORBIDDEN PHRASES:
   ✗ "remarkable cultural heritage"
   ✗ "unique significance"
   ✗ "amazing place"
   ✗ "rich history"
   ✗ "fascinating landmark"
   ✗ ANY generic or template-like descriptions

✓ REQUIRED:
   • Use ONLY facts found via Google Search
   • Be SPECIFIC with names, numbers, dates
   • Maximum 160 characters per content field
   • Include Wikipedia or official site URL in fun_fact card
""".format(landmark_name=landmark_name)

    # ──────────────────────────────────────────────────────────────────────────
    # TWO-CALL APPROACH: Separate Research (Search) from Formatting (JSON)
    # ──────────────────────────────────────────────────────────────────────────
    
    import logging
    
    # ═════════════════════════════════════════════════════════════════════════
    # CALL 1: THE RESEARCHER - Use Search tool to gather accurate facts
    # ═════════════════════════════════════════════════════════════════════════
    
    research_prompt = f"""Research the landmark: {landmark_name}
Location: {city or 'Unknown'}, {country or 'Unknown'}

{facts_context}

Find the following information using Google Search:
1. The ACTUAL local/native name and its pronunciation
2. One SPECIFIC hidden secret or lesser-known fact (with numbers/dates if possible)
3. One SPECIFIC cultural, historical, or architectural detail (with numbers/dates if possible)

Return a detailed research summary with these three pieces of information clearly labeled.
Be specific - include names, numbers, dates, measurements where available.
"""

    researcher_config = types.GenerateContentConfig(
        system_instruction="You are an expert cultural researcher. Use Google Search to find accurate, specific facts about landmarks. Provide detailed, factual information with concrete details.",
        tools=[_search_tool()],
        temperature=0.2,
        max_output_tokens=1024,
    )

    try:
        research_response = gemini.models.generate_content(
            model=resolved_model,
            contents=[types.Content(role="user", parts=[types.Part(text=research_prompt)])],
            config=researcher_config,
        )
        raw_research = research_response.text or ""
        logging.info(f"[RESEARCHER] Gathered facts for {landmark_name}: {raw_research[:200]}...")
    except Exception as e:
        logging.error(f"Research call failed for {landmark_name}: {e}")
        raw_research = f"Could not find detailed information about {landmark_name}."
    
    # ═════════════════════════════════════════════════════════════════════════
    # CALL 2: THE ARCHITECT - Format research into perfect JSON with schema
    # ═════════════════════════════════════════════════════════════════════════
    
    architect_prompt = f"""Transform the following research into exactly 3 flashcards.

RESEARCH DATA:
{raw_research}

{special_instructions}

Create exactly 3 flashcards following this structure:
1. Pronunciation card (type: "pronunciation") with local name, meaning, and phonetic guide
2. Secret card (type: "secret") with an intriguing hidden fact starting with "Few know that..." 
3. Fun fact card (type: "fun_fact") with specific cultural/historical detail and learn_more_url

Output ONLY the JSON array - no other text."""

    # Define strict JSON schema for the architect
    flashcard_schema = types.Schema(
        type=types.Type.ARRAY,
        items=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "type": types.Schema(type=types.Type.STRING, enum=["pronunciation", "secret", "fun_fact"]),
                "title": types.Schema(type=types.Type.STRING),
                "subtitle": types.Schema(type=types.Type.STRING),
                "content": types.Schema(type=types.Type.STRING),
                "phonetic": types.Schema(type=types.Type.STRING, nullable=True),
                "learn_more_url": types.Schema(type=types.Type.STRING, nullable=True),
            },
            required=["type", "title", "subtitle", "content"],
        ),
    )
    
    architect_config = types.GenerateContentConfig(
        system_instruction=_SYSTEM_INSTRUCTION,
        temperature=0.3,
        max_output_tokens=3072,  # Increased to prevent truncation of 3 detailed flashcards
        response_mime_type="application/json",  # Safe to use without Search tool
        response_schema=flashcard_schema,
    )

    try:
        architect_response = gemini.models.generate_content(
            model=resolved_model,
            contents=[types.Content(role="user", parts=[types.Part(text=architect_prompt)])],
            config=architect_config,
        )
        raw_text = architect_response.text or ""
        logging.info(f"[ARCHITECT] Formatted JSON for {landmark_name}: {raw_text[:200]}...")
    except Exception as e:
        logging.error(f"Architect call failed for {landmark_name}: {e}")
        raise ValueError(f"Failed to format flashcards: {str(e)}")
    
    # Parse the guaranteed JSON response
    try:
        parsed = json.loads(raw_text) if raw_text else []
        if not isinstance(parsed, list):
            parsed = _parse_json_array(raw_text)
    except json.JSONDecodeError as e:
        # Log truncation issues
        logging.error(
            f"JSON parsing failed for {landmark_name}. "
            f"Error: {e}. "
            f"Response length: {len(raw_text)} chars. "
            f"Full response: {raw_text}"
        )
        # Try fallback parser
        parsed = _parse_json_array(raw_text)
        if not parsed:
            raise ValueError(
                f"Failed to parse JSON response for {landmark_name}. "
                f"Response appears truncated at {len(raw_text)} chars. "
                f"Consider increasing max_output_tokens."
            )

    flashcards = [FlashcardItem.from_dict(item) for item in parsed]
    
    # Validate flashcards are not generic
    generic_phrases = [
        "remarkable cultural heritage",
        "unique significance",
        "amazing place",
        "rich history",
        "fascinating landmark",
        "this landmark is",
        "cultural heritage",
        "you've discovered",
    ]
    
    import logging
    for fc in flashcards:
        content_lower = fc.content.lower()
        if any(phrase in content_lower for phrase in generic_phrases):
            logging.warning(
                f"Generic content detected in {fc.type} card for {landmark_name}: '{fc.content}'"
            )
    
    # Log parsing issues for debugging
    if len(flashcards) < 3:
        logging.warning(
            f"Gemini returned only {len(flashcards)} flashcards for {landmark_name}. "
            f"Raw response: {raw_text[:500]}"
        )
    
    # If Gemini completely failed to return cards, raise error with helpful message
    if len(flashcards) == 0:
        raise ValueError(
            f"Failed to generate flashcards for {landmark_name}. "
            f"Gemini response was empty or invalid JSON. Raw response: {raw_text[:300]}"
        )

    # If we got at least some cards, ensure we have exactly 3
    # Only pad as absolute last resort (should rarely happen)
    while len(flashcards) < 3:
        import logging
        logging.error(f"Padding flashcard #{len(flashcards) + 1} for {landmark_name}")
        flashcards.append(FlashcardItem(
            type="fun_fact",
            title="Fun Fact",
            subtitle="Cultural Insight",
            content=f"Visit {landmark_name} to discover its unique cultural significance.",
        ))

    return LandmarkEnrichResult(
        flashcards=flashcards[:3],
        model_used=resolved_model,
    )
