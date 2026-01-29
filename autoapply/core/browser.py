"""Browser management using Playwright with persistent profiles."""

from pathlib import Path

from playwright.sync_api import sync_playwright

# Default navigation timeout (ms). Used for page.goto and set_default_timeout.
NAVIGATION_TIMEOUT_MS = 30000


def get_browser(profile_dir: str = "profiles/default", headless: bool = False):
    """
    Launch a persistent Chromium browser context using Playwright.

    Args:
        profile_dir: Directory path for the persistent browser profile
        headless: Whether to run in headless mode

    Returns:
        Tuple of (playwright instance, browser context, page)
    """
    Path(profile_dir).mkdir(parents=True, exist_ok=True)
    pw = sync_playwright().start()
    browser = pw.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        headless=headless,
        slow_mo=150,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    )
    page = browser.new_page()
    page.set_default_timeout(NAVIGATION_TIMEOUT_MS)
    return pw, browser, page

