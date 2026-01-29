"""Core functionality for browser automation, storage, and configuration."""

from autoapply.core.browser import get_browser
from autoapply.core.storage import log, save_artifacts, print_summary
from autoapply.core.router import detect, get_adapter, list_platforms, register_adapter, RouteName

__all__ = [
    "detect",
    "get_browser",
    "get_adapter",
    "list_platforms",
    "log",
    "print_summary",
    "register_adapter",
    "RouteName",
    "save_artifacts",
]

