"""
gemini_client.py
────────────────
Singleton wrapper around google-genai Client.
Import `gemini` wherever you need to call the API.
"""

from google import genai
from config import settings


def _build_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


# Module-level singleton
gemini: genai.Client = _build_client()
