"""Backward-compatible wrapper for autoapply.core"""

# Import modules directly to avoid circular imports
import autoapply.core.storage as storage
import autoapply.core.browser as browser
import autoapply.core.router as router
import autoapply.core.autofill as autofill
import autoapply.core.tailor as tailor

__all__ = ["storage", "browser", "router", "autofill", "tailor"]

