"""
tools/code_execution.py
────────────────────────
Code Execution built-in tool.

Use-cases:
  • Solving complex mathematical equations
  • Processing and analysing text / data accurately

Docs: https://ai.google.dev/gemini-api/docs/code-execution

Note: Gemini writes and runs Python internally; you do NOT execute anything
locally – all execution happens on Google's sandboxed servers.
"""

from __future__ import annotations

from dataclasses import dataclass

from google.genai import types

from config import settings
from gemini_client import gemini


def build_tool() -> types.Tool:
    """Return a pre-configured Code Execution tool object."""
    return types.Tool(code_execution=types.ToolCodeExecution())


@dataclass
class CodeExecutionResult:
    text: str
    code_blocks: list[str]
    execution_outputs: list[str]
    raw: object  # GenerateContentResponse


def run(
    prompt: str,
    *,
    model: str | None = None,
    system_instruction: str | None = None,
) -> CodeExecutionResult:
    """
    Send *prompt* to Gemini with Code Execution enabled.

    Gemini may generate and run Python code internally before answering.
    The function parses the multi-part response and surfaces:
      • text           – the model's final explanatory text
      • code_blocks    – list of Python snippets Gemini generated
      • outputs        – list of stdout strings from each execution

    Returns
    -------
    CodeExecutionResult
    """
    config_kwargs: dict = {
        "tools": [build_tool()],
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    response = gemini.models.generate_content(
        model=model or settings.default_model,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    text_parts: list[str] = []
    code_blocks: list[str] = []
    execution_outputs: list[str] = []

    for part in response.candidates[0].content.parts:
        if part.text:
            text_parts.append(part.text)
        if part.executable_code:
            code_blocks.append(part.executable_code.code)
        if part.code_execution_result:
            execution_outputs.append(part.code_execution_result.output)

    return CodeExecutionResult(
        text="\n".join(text_parts),
        code_blocks=code_blocks,
        execution_outputs=execution_outputs,
        raw=response,
    )
