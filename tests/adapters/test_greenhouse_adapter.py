"""Tests for Greenhouse adapter."""

from unittest.mock import Mock

from autoapply.adapters.greenhouse import is_greenhouse


def test_is_greenhouse_by_url():
    """Test Greenhouse detection by URL."""
    mock_page = Mock()
    mock_page.url = "https://example.greenhouse.io/jobs/123"
    mock_page.locator.return_value.count.return_value = 0

    assert is_greenhouse(mock_page) is True


def test_is_greenhouse_by_form():
    """Test Greenhouse detection by form selector."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    
    # Mock locator that finds the form
    mock_locator = Mock()
    mock_locator.count.return_value = 1
    mock_page.locator.return_value = mock_locator

    assert is_greenhouse(mock_page) is True


def test_is_greenhouse_false():
    """Test Greenhouse detection returns False for non-Greenhouse pages."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    
    # Mock locator that doesn't find the form
    mock_locator = Mock()
    mock_locator.count.return_value = 0
    mock_page.locator.return_value = mock_locator

    assert is_greenhouse(mock_page) is False


def test_is_greenhouse_handles_exception():
    """Test Greenhouse detection handles exceptions gracefully."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    mock_page.locator.side_effect = Exception("Network error")

    # Should return False when exception occurs
    assert is_greenhouse(mock_page) is False

