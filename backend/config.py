"""
config.py
─────────
Centralised configuration loaded from environment variables.
All modules import from here – never call os.environ directly elsewhere.

Setup:
    cp backend/.env.example backend/.env
    # then fill in GEMINI_API_KEY
"""

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Resolve the .env file relative to this file's directory so it works
# regardless of which directory the user launches the process from.
_ENV_FILE = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=False)


def _require(key: str) -> str:
    """Return env var *key*, or exit with a clear message if it is missing."""
    value = os.getenv(key)
    if not value:
        print(
            f"\n[ERROR] Required environment variable '{key}' is not set.\n"
            f"  1. Copy the example:  cp backend/.env.example backend/.env\n"
            f"  2. Edit backend/.env and add your GEMINI_API_KEY.\n"
            f"  3. Get a key at:  https://aistudio.google.com/apikey\n",
            file=sys.stderr,
        )
        sys.exit(1)
    return value


@dataclass(frozen=True)
class Settings:
    # ── Gemini ──────────────────────────────────────────────────────────────
    gemini_api_key: str = field(
        default_factory=lambda: _require("GEMINI_API_KEY")
    )

    # Flash supports Search + Maps + Code Exec + URL Context.
    # For File Search use "gemini-3-flash-preview" (Gemini 3 family).
    default_model: str = field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    )

    # ── File Search ──────────────────────────────────────────────────────────
    # Comma-separated list of existing file-search-store names, e.g.
    # "fileSearchStores/my-store-1,fileSearchStores/my-store-2"
    file_search_store_names: list[str] = field(
        default_factory=lambda: [
            s.strip()
            for s in os.getenv("FILE_SEARCH_STORE_NAMES", "").split(",")
            if s.strip()
        ]
    )

    # ── Supabase ─────────────────────────────────────────────────────────────
    supabase_url: str = field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "")
    )
    # Service-role key bypasses RLS — used by the backend only, never the FE
    supabase_service_role_key: str = field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )

    # ── Security ─────────────────────────────────────────────────────────────
    # Set BACKEND_API_KEY to a strong random string in production.
    # Clients must send it as the X-API-Key header on every request.
    # Leave empty to disable the check (development only).
    backend_api_key: str = field(
        default_factory=lambda: os.getenv("BACKEND_API_KEY", "")
    )

    # ── API server ───────────────────────────────────────────────────────────
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    debug: bool = field(
        default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true"
    )


# Singleton – import this everywhere
settings = Settings()
