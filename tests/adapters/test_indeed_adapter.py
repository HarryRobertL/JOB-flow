"""Tests for Indeed adapter."""

# Placeholder for Indeed adapter tests
# These would require mocking Playwright page objects


def test_indeed_search_url():
    """Test Indeed search URL generation."""
    from autoapply.adapters.indeed import search_url

    url = search_url("Software Engineer", "London", radius_km=25, easy_apply=True)
    assert "indeed.com" in url
    assert "Software+Engineer" in url
    assert "London" in url

