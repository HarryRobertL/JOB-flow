"""Backward-compatible wrapper for autoapply.core.autofill"""

from autoapply.core.autofill import (
    fill_text,
    upload_file,
    click_first_matching,
    tick_checkbox_or_radio,
    fill_by_name,
    SUBMIT_TEXTS,
)

__all__ = [
    "fill_text",
    "upload_file",
    "click_first_matching",
    "tick_checkbox_or_radio",
    "fill_by_name",
    "SUBMIT_TEXTS",
]
