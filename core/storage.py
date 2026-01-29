"""Backward-compatible wrapper for autoapply.core.storage"""

from autoapply.core.storage import (
    print_row,
    print_summary,
    log,
    save_artifacts,
)

__all__ = ["print_row", "print_summary", "log", "save_artifacts"]
