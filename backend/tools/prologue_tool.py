"""Prologue tool for fetching the pre-generated prologue from session state."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from google.adk.tools.tool_context import ToolContext


def get_prologue(tool_context: "ToolContext") -> str:
    """
    Retrieves the pre-generated prologue from session state.

    Use this tool on the FIRST story message (when story_started is False)
    to get the opening prologue that was generated during onboarding.
    The prologue is already personalized with the character name and world name.

    Args:
        tool_context: ADK tool context containing session state

    Returns:
        The prologue text prefixed with "PROLOGUE_TEXT: ", or error message if not found
    """
    # Access session state through tool_context.state (ADK 1.15.1 API)
    session_state = tool_context.state if hasattr(tool_context, 'state') else {}
    prologue = session_state.get('prologue', '')

    if prologue:
        return f"PROLOGUE_TEXT: {prologue}"
    return "No prologue found in session state. Generate a fresh opening scene instead."
