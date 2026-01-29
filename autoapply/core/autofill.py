"""Form autofill utilities for job applications."""

import re
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.sync_api import Page, Frame

SUBMIT_TEXTS = [
    "Submit application",
    "Submit",
    "Apply now",
    "Apply",
    "Finish",
    "Send application",
    "Review",
    "Confirm",
    "Next",
    "Continue",
    "Proceed",
]


def fill_text(page: "Page | Frame", label_text: str, value: str) -> bool:
    """
    Fill a text field by label, placeholder, or aria-label.

    Args:
        page: Playwright page or frame context
        label_text: Label, placeholder, or aria-label text to search for
        value: Value to fill

    Returns:
        True if field was filled, False otherwise
    """
    if not value:
        return False

    try:
        # Try get_by_label first (most semantic)
        locator = page.get_by_label(label_text, exact=False)
        if locator.count() > 0:
            locator.first.fill(value)
            return True
    except Exception:
        pass

    try:
        # Fallback to placeholder
        locator = page.get_by_placeholder(label_text, exact=False)
        if locator.count() > 0:
            locator.first.fill(value)
            return True
    except Exception:
        pass

    try:
        # Fallback to aria-label on input/textarea
        label_lower = label_text.lower()
        inputs = page.locator("input, textarea")
        count = inputs.count()
        for i in range(count):
            try:
                elem = inputs.nth(i)
                aria_label = elem.get_attribute("aria-label") or ""
                placeholder = elem.get_attribute("placeholder") or ""
                if label_lower in aria_label.lower() or label_lower in placeholder.lower():
                    if elem.is_visible() and elem.is_enabled():
                        elem.fill(value)
                        return True
            except Exception:
                continue
    except Exception:
        pass

    return False


def tick_checkbox_or_radio(page: "Page | Frame", label_text: str) -> bool:
    """
    Tick a checkbox or radio button by label.

    Args:
        page: Playwright page or frame context
        label_text: Label text to search for

    Returns:
        True if a checkbox/radio was ticked, False otherwise
    """
    try:
        # Try get_by_label first
        el = page.get_by_label(label_text, exact=False).first
        if el.count() > 0:
            # Check if it's a checkbox or radio
            tag = el.evaluate("el => el.tagName.toLowerCase()")
            if tag in ("input", "label"):
                # If it's a label, find the associated input
                if tag == "label":
                    try:
                        input_elem = el.locator("input[type='checkbox'], input[type='radio']").first
                        if input_elem.count() > 0:
                            el = input_elem
                    except Exception:
                        pass
                # Check if visible and enabled
                if el.is_visible() and el.is_enabled():
                    if not el.is_checked():
                        el.check()
                        return True
        return False
    except Exception:
        pass

    # Fallback: find by text and look for nearby checkbox/radio
    try:
        label_lower = label_text.lower()
        labels = page.locator("label")
        count = labels.count()
        for i in range(count):
            try:
                label_elem = labels.nth(i)
                text = label_elem.inner_text().lower()
                if label_lower in text:
                    # Find associated input
                    input_elem = label_elem.locator("input[type='checkbox'], input[type='radio']").first
                    if input_elem.count() > 0:
                        if input_elem.is_visible() and input_elem.is_enabled():
                            if not input_elem.is_checked():
                                input_elem.check()
                                return True
            except Exception:
                continue
    except Exception:
        pass

    return False


def fill_by_name(page: "Page | Frame", field_name: str, value: str) -> bool:
    """
    Fill a field by its name attribute.

    Args:
        page: Playwright page or frame context
        field_name: Name attribute to search for
        value: Value to fill

    Returns:
        True if field was filled, False otherwise
    """
    if not value:
        return False

    try:
        el = page.locator(f"input[name='{field_name}'], textarea[name='{field_name}'], select[name='{field_name}']").first
        if el.count() > 0:
            if el.is_visible() and el.is_enabled():
                el.fill(value)
                return True
    except Exception:
        pass

    return False


def click_first_matching(page: "Page | Frame", texts: list[str]) -> bool:
    """
    Click the first matching button/link by text.

    Normalizes text by stripping and lowering. Skips buttons that clearly
    navigate to a company site.

    Args:
        page: Playwright page or frame context
        texts: List of button/link texts to try

    Returns:
        True if a button/link was clicked, False otherwise
    """
    if not texts:
        return False

    seen = set()
    candidate_names = []

    # Combine with SUBMIT_TEXTS
    for name in list(texts) + SUBMIT_TEXTS:
        if not name:
            continue
        normalized = name.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        candidate_names.append(normalized)

    # Try each candidate
    for name in candidate_names:
        # Skip company site buttons
        name_lower = name.lower()
        if "company site" in name_lower or "company website" in name_lower:
            continue

        pattern = re.compile(re.escape(name), re.IGNORECASE)
        try:
            # Try button role first
            buttons = page.get_by_role("button", name=pattern)
            if _click_first_enabled_visible(buttons):
                return True
        except Exception:
            pass

        try:
            # Try link role
            links = page.get_by_role("link", name=pattern)
            if _click_first_enabled_visible(links):
                return True
        except Exception:
            pass

        try:
            # Try generic text match
            text_elements = page.get_by_text(pattern)
            if _click_first_enabled_visible(text_elements):
                return True
        except Exception:
            pass

    return False


def _click_first_enabled_visible(locator) -> bool:
    """Click the first enabled and visible element in a locator."""
    try:
        count = locator.count()
        for index in range(count):
            try:
                candidate = locator.nth(index)
                if not (candidate.is_visible() and candidate.is_enabled()):
                    continue
                # Double-check for company site buttons
                try:
                    text = candidate.inner_text(timeout=500).strip().lower()
                    if "company site" in text or "company website" in text:
                        continue
                except Exception:
                    pass
                candidate.click()
                return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def upload_file(page: "Page | Frame", file_path: str | Path) -> bool:
    """
    Upload a file to the first file input found.

    Args:
        page: Playwright page or frame context
        file_path: Path to the file to upload

    Returns:
        True if file was uploaded, False otherwise
    """
    if not file_path:
        return False

    path = Path(file_path)
    if not path.exists():
        return False

    try:
        file_inputs = page.locator("input[type='file']")
        count = file_inputs.count()
        if count > 0:
            # Try the first visible file input
            for i in range(count):
                try:
                    file_input = file_inputs.nth(i)
                    if file_input.is_visible():
                        file_input.set_input_files(str(path))
                        return True
                except Exception:
                    continue
            # If none are visible, try the first one anyway
            file_inputs.first.set_input_files(str(path))
            return True
    except Exception:
        pass
    return False
