"""
tools/file_search.py
─────────────────────
File Search (RAG) built-in tool.

Use-cases:
  • Searching technical manuals / proprietary documents
  • Question answering over your own indexed content

Docs: https://ai.google.dev/gemini-api/docs/file-search

Supported models: gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash-lite
Note: File Search CANNOT be combined with Google Search, URL Context, etc.

This module provides:
  1. FileSearchStore – CRUD helpers for managing your stores
  2. build_tool()    – returns a configured Tool object
  3. run()           – query Gemini with file search enabled
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from google.genai import types

from config import settings
from gemini_client import gemini

# File Search is available on Gemini 3 Flash Preview
_FILE_SEARCH_DEFAULT_MODEL = "gemini-3-flash-preview"


# ──────────────────────────────────────────────────────────────────────────────
# Store management helpers
# ──────────────────────────────────────────────────────────────────────────────

class FileSearchStore:
    """
    Helpers for creating, listing, and deleting File Search stores.

    Usage
    -----
    store = FileSearchStore.create("my-store")
    FileSearchStore.upload(store_name=store.name, file_path="docs/manual.pdf")
    stores = FileSearchStore.list_all()
    FileSearchStore.delete(store.name)
    """

    @staticmethod
    def create(display_name: str) -> object:
        """Create a new File Search store and return the store object."""
        store = gemini.file_search_stores.create(
            config={"display_name": display_name}
        )
        return store

    @staticmethod
    def list_all() -> list:
        """Return a list of all File Search stores in the project."""
        return list(gemini.file_search_stores.list())

    @staticmethod
    def get(store_name: str) -> object:
        """Fetch a store by its resource name (e.g. 'fileSearchStores/my-store')."""
        return gemini.file_search_stores.get(name=store_name)

    @staticmethod
    def delete(store_name: str, *, force: bool = True) -> None:
        """Delete a store and all its indexed documents."""
        gemini.file_search_stores.delete(name=store_name, config={"force": force})

    @staticmethod
    def upload(
        store_name: str,
        file_path: str,
        *,
        display_name: str | None = None,
        poll_interval: int = 5,
    ) -> object:
        """
        Upload *file_path* directly into *store_name* and wait for indexing.

        Parameters
        ----------
        store_name:
            Resource name of the target store
            (e.g. 'fileSearchStores/my-store-123').
        file_path:
            Local path to the file to upload (text, PDF, CSV …).
        display_name:
            Human-readable label shown in citations.
        poll_interval:
            Seconds to wait between polling the operation status.
        """
        cfg: dict = {}
        if display_name:
            cfg["display_name"] = display_name

        operation = gemini.file_search_stores.upload_to_file_search_store(
            file=file_path,
            file_search_store_name=store_name,
            config=cfg or None,
        )
        # Poll until the indexing operation completes
        while not operation.done:
            time.sleep(poll_interval)
            operation = gemini.operations.get(operation)

        return operation

    @staticmethod
    def import_file(
        store_name: str,
        file_name: str,
        *,
        custom_metadata: list[dict] | None = None,
        poll_interval: int = 5,
    ) -> object:
        """
        Import an already-uploaded Files API file into *store_name*.

        Parameters
        ----------
        store_name:
            Resource name of the target store.
        file_name:
            Resource name of the file returned by the Files API upload,
            e.g. 'files/abc123'.
        custom_metadata:
            Optional list of {key, string_value | numeric_value} dicts
            for later filtering with metadata_filter.
        """
        kwargs: dict = {
            "file_search_store_name": store_name,
            "file_name": file_name,
        }
        if custom_metadata:
            kwargs["custom_metadata"] = custom_metadata

        operation = gemini.file_search_stores.import_file(**kwargs)
        while not operation.done:
            time.sleep(poll_interval)
            operation = gemini.operations.get(operation)

        return operation


# ──────────────────────────────────────────────────────────────────────────────
# Tool builder & query helper
# ──────────────────────────────────────────────────────────────────────────────

def build_tool(
    store_names: list[str] | None = None,
    *,
    metadata_filter: str | None = None,
) -> types.Tool:
    """
    Return a pre-configured File Search tool object.

    Parameters
    ----------
    store_names:
        List of file-search-store resource names to search.
        Defaults to settings.file_search_store_names.
    metadata_filter:
        AIP-160 filter string, e.g. 'author="Alice"'.
    """
    names = store_names or settings.file_search_store_names
    if not names:
        raise ValueError(
            "No File Search store names provided. "
            "Set FILE_SEARCH_STORE_NAMES in .env or pass store_names explicitly."
        )

    fs_kwargs: dict = {"file_search_store_names": names}
    if metadata_filter:
        fs_kwargs["metadata_filter"] = metadata_filter

    return types.Tool(file_search=types.FileSearch(**fs_kwargs))


@dataclass
class FileSearchResult:
    text: str
    grounding_metadata: object | None
    raw: object  # GenerateContentResponse


def run(
    prompt: str,
    *,
    store_names: list[str] | None = None,
    metadata_filter: str | None = None,
    model: str | None = None,
    system_instruction: str | None = None,
) -> FileSearchResult:
    """
    Send *prompt* to Gemini with File Search (RAG) enabled.

    Parameters
    ----------
    prompt:
        The user question answered using the indexed documents.
    store_names:
        Override which stores to search; falls back to settings.
    metadata_filter:
        Narrow results with an AIP-160 expression, e.g. 'year=2024'.

    Returns
    -------
    FileSearchResult
    """
    config_kwargs: dict = {
        "tools": [build_tool(store_names, metadata_filter=metadata_filter)],
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    response = gemini.models.generate_content(
        model=model or _FILE_SEARCH_DEFAULT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    grounding = getattr(response.candidates[0], "grounding_metadata", None)

    return FileSearchResult(
        text=response.text,
        grounding_metadata=grounding,
        raw=response,
    )
