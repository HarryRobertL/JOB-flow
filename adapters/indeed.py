"""Backward-compatible wrapper for autoapply.adapters.indeed"""

from autoapply.adapters.indeed import (
    run,
    search_url,
    _build_sc,
    _bump,
)

__all__ = ["run", "search_url"]
