"""Browser utility functions for handling anti-automation interstitials."""

import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.sync_api import Page


def wait_for_cloudflare_clear(
    page: "Page",
    context: str = "",
    interactive: bool = False,
    timeout_seconds: int = 240,
) -> bool:
    """
    Detect the Cloudflare verification interstitial and hold execution until it clears.

    Args:
        page: Playwright page object
        context: Context label for logging
        interactive: Whether to wait for user input
        timeout_seconds: Maximum time to wait

    Returns:
        True if the challenge disappears before timing out
    """
    def _blocked() -> bool:
        try:
            challenge = page.locator("text=Additional Verification Required")
            if challenge.count() > 0 and challenge.first.is_visible():
                return True
        except Exception:
            pass
        try:
            verifying = page.locator("text=/Verifying/i")
            if verifying.count() > 0 and verifying.first.is_visible():
                return True
        except Exception:
            pass
        return False

    if not _blocked():
        return True

    label = context or page.url
    print(f"\nCloudflare challenge detected while accessing {label or 'Indeed'}")
    print("Solve the verification in the open browser window.")

    if interactive:
        try:
            input("Press Enter once the challenge has cleared to continue...\n")
        except EOFError:
            pass

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not _blocked():
            print("Cloudflare verification cleared. Resuming automation.")
            return True
        page.wait_for_timeout(2000)

    print("Timed out waiting for Cloudflare verification. Continuing, but subsequent requests may be blocked.")
    return False

