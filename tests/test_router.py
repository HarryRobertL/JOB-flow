"""Tests for router/platform detection."""

from unittest.mock import Mock

from autoapply.core.router import detect


def test_detect_greenhouse() -> None:
    """Test detection of Greenhouse platform."""
    mock_page = Mock()
    mock_page.url = "https://example.greenhouse.io/jobs/123"
    mock_page.locator.return_value.count.return_value = 0

    result = detect(mock_page.url, mock_page)
    assert result == "greenhouse"


def test_detect_lever() -> None:
    """Test detection of Lever platform."""
    mock_page = Mock()
    mock_page.url = "https://jobs.lever.co/example/123"
    mock_page.locator.return_value.count.return_value = 0

    result = detect(mock_page.url, mock_page)
    assert result == "lever"


def test_detect_unknown() -> None:
    """Test detection of unknown platform."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    mock_page.locator.return_value.count.return_value = 0

    result = detect(mock_page.url, mock_page)
    assert result == "unknown"

