"""
smoke_test.py
─────────────
Quick sanity checks for every tool – run against the real Gemini API.
Requires a valid GEMINI_API_KEY in backend/.env (copy from .env.example).

Usage:
    python -m smoke_test
"""

from __future__ import annotations

import sys

from agent import GeminiAgent, ToolName


def section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print("─" * 60)


def check(result: dict, key: str = "text") -> None:
    value = result.get(key, "")
    if not value:
        print(f"  [FAIL] Missing '{key}' in result")
        sys.exit(1)
    preview = str(value)[:200].replace("\n", " ")
    print(f"  [OK] {preview}…")


agent = GeminiAgent()


# ── 1. Google Search ─────────────────────────────────────────────────────────
section("1 – Google Search")
result = agent.run(ToolName.google_search, "What day is today and who won the last FIFA World Cup?")
check(result)
print(f"  Queries: {result.get('search_queries')}")
print(f"  Sources: {[s['title'] for s in result.get('sources', [])][:3]}")


# ── 2. Google Maps ───────────────────────────────────────────────────────────
section("2 – Google Maps  (Bali, Indonesia)")
result = agent.run(
    ToolName.google_maps,
    "What are the top-rated warungs near Seminyak Beach?",
    latitude=-8.6918,
    longitude=115.1661,
)
check(result)
print(f"  Sources: {[s['title'] for s in result.get('sources', [])][:3]}")


# ── 3. Code Execution ────────────────────────────────────────────────────────
section("3 – Code Execution")
result = agent.run(
    ToolName.code_execution,
    "Calculate the first 10 Fibonacci numbers and show me the code.",
)
check(result)
print(f"  Code blocks generated: {len(result.get('code_blocks', []))}")
print(f"  Execution outputs:     {result.get('execution_outputs', [])}")


# ── 4. URL Context ───────────────────────────────────────────────────────────
section("4 – URL Context")
result = agent.run(
    ToolName.url_context,
    "Summarise the key points from this page.",
    urls=["https://ai.google.dev/gemini-api/docs/tools"],
)
check(result)
print(f"  URL statuses: {result.get('url_statuses')}")


# ── 5. Search + URL Context ──────────────────────────────────────────────────
section("5 – Google Search + URL Context combined")
result = agent.run(
    ToolName.search_and_url,
    "Find the latest Gemini model release notes and summarise them.",
    urls=["https://ai.google.dev/gemini-api/docs/changelog"],
)
check(result)


# ── 6. File Search (skipped if no stores configured) ─────────────────────────
from config import settings

section("6 – File Search (RAG)")
if not settings.file_search_store_names:
    print("  [SKIP] Set FILE_SEARCH_STORE_NAMES in .env to test File Search.")
else:
    result = agent.run(ToolName.file_search, "What are the main topics in the indexed documents?")
    check(result)


print("\n✅  All smoke tests passed!")
