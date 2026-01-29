"""Tests for Lever adapter."""

from unittest.mock import Mock

from autoapply.adapters.lever import is_lever


def test_is_lever_by_url():
    """Test Lever detection by URL."""
    mock_page = Mock()
    mock_page.url = "https://jobs.lever.co/example/123"
    mock_page.locator.return_value.count.return_value = 0

    assert is_lever(mock_page) is True


def test_is_lever_by_form():
    """Test Lever detection by form selector."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    
    # Mock locator that finds the form
    mock_locator = Mock()
    mock_locator.count.return_value = 1
    mock_page.locator.return_value = mock_locator

    assert is_lever(mock_page) is True


def test_is_lever_false():
    """Test Lever detection returns False for non-Lever pages."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    
    # Mock locator that doesn't find the form
    mock_locator = Mock()
    mock_locator.count.return_value = 0
    mock_page.locator.return_value = mock_locator

    assert is_lever(mock_page) is False


def test_is_lever_handles_exception():
    """Test Lever detection handles exceptions gracefully."""
    mock_page = Mock()
    mock_page.url = "https://example.com/jobs/123"
    mock_page.locator.side_effect = Exception("Network error")

    # Should return False when exception occurs
    assert is_lever(mock_page) is False

