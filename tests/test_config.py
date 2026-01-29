"""Tests for configuration loading and validation."""

from pathlib import Path

import pytest

from autoapply.core.config import AppConfig, ConfigError, load_config

_VALID_BASE = """
account:
  email: "test@example.com"
  first_name: "Test"
  last_name: "User"
  phone: "+44 1234567890"
  location: "London, UK"

defaults:
  cv_path: "/path/to/cv.pdf"
  cover_letter_template: "/path/to/template.md"

searches:
  - name: "test_search"
    platform: "indeed"
    query: "Software Engineer"
    location: "London"
    radius_km: 25
    easy_apply: true
"""


def test_config_load_from_file(tmp_path: Path) -> None:
    """Test loading configuration from a YAML file."""
    config_file = tmp_path / "test_config.yaml"
    config_file.write_text(_VALID_BASE)

    cfg = AppConfig.load_from_file(config_file)
    assert cfg.account.email == "test@example.com"
    assert len(cfg.searches) == 1
    assert cfg.searches[0].platform == "indeed"


def test_config_legacy_format(tmp_path: Path) -> None:
    """Test loading configuration with legacy format (site -> platform, cv -> cv_path)."""
    config_content = """
account:
  email: "test@example.com"
  first_name: "Test"
  last_name: "User"
  phone: "+44 1234567890"
  location: "London, UK"

defaults:
  cv: "/path/to/cv.pdf"
  cover_template: "/path/to/template.md"

searches:
  - name: "test_search"
    site: "indeed"
    query: "Software Engineer"
    location: "London"
    radius_km: 25
"""
    config_file = tmp_path / "test_config.yaml"
    config_file.write_text(config_content)

    cfg = AppConfig.load_from_file(config_file)
    assert cfg.defaults.cv_path == "/path/to/cv.pdf"
    assert cfg.defaults.cover_letter_template == "/path/to/template.md"


def test_load_config_valid(tmp_path: Path) -> None:
    """Valid config loads via load_config."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(_VALID_BASE)

    cfg = load_config(config_file)
    assert cfg.account.email == "test@example.com"
    assert cfg.limits.daily_apply_cap == 60
    assert cfg.limits.pause_between_apps_seconds == (6, 18)
    assert cfg.limits.run_timeout_minutes == 60


def test_load_config_missing_file(tmp_path: Path) -> None:
    """load_config raises ConfigError when file does not exist."""
    missing = tmp_path / "nonexistent_config.yaml"
    assert not missing.exists()
    with pytest.raises(ConfigError) as exc_info:
        load_config(missing)
    assert "not found" in str(exc_info.value).lower()


def test_load_config_invalid_yaml_syntax(tmp_path: Path) -> None:
    """load_config raises ConfigError when YAML is malformed."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text("account:\n  email: [unclosed\n  name: test")
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "yaml" in str(exc_info.value).lower() or "invalid" in str(exc_info.value).lower()


def test_load_config_invalid_daily_cap(tmp_path: Path) -> None:
    """Daily cap must be positive and at most 200."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 250
  per_site_cap: 40
  pause_between_apps_seconds: [6, 18]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "daily_apply_cap" in str(exc_info.value)
    assert "200" in str(exc_info.value)

    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 0
  per_site_cap: 0
  pause_between_apps_seconds: [6, 18]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "daily_apply_cap" in str(exc_info.value)


def test_load_config_invalid_per_site_cap(tmp_path: Path) -> None:
    """Per-site cap must be non-negative and not exceed daily cap."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 60
  per_site_cap: 80
  pause_between_apps_seconds: [6, 18]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "per_site_cap" in str(exc_info.value)
    assert "daily_apply_cap" in str(exc_info.value)

    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 60
  per_site_cap: -1
  pause_between_apps_seconds: [6, 18]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "per_site_cap" in str(exc_info.value)


def test_load_config_invalid_pause_range(tmp_path: Path) -> None:
    """Pause range must be [min, max] with min <= max and both positive."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 60
  per_site_cap: 40
  pause_between_apps_seconds: [20, 10]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "pause" in str(exc_info.value).lower()
    assert "min" in str(exc_info.value).lower()

    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 60
  per_site_cap: 40
  pause_between_apps_seconds: [0, 10]
"""
    )
    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "pause" in str(exc_info.value).lower()


def test_load_config_missing_required_account(tmp_path: Path) -> None:
    """Required account fields must be non-empty."""
    config_content = """
account:
  email: ""
  first_name: "Test"
  last_name: "User"
  phone: "+44 1234567890"
  location: "London, UK"

defaults:
  cv_path: "/path/to/cv.pdf"
  cover_letter_template: "/path/to/template.md"

searches:
  - name: "test_search"
    platform: "indeed"
    query: "Software Engineer"
    location: "London"
    radius_km: 25
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)

    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "account" in str(exc_info.value).lower() or "email" in str(exc_info.value).lower()
    assert "Required" in str(exc_info.value) or "empty" in str(exc_info.value).lower()


def test_load_config_empty_searches(tmp_path: Path) -> None:
    """At least one search is required."""
    config_content = """
account:
  email: "test@example.com"
  first_name: "Test"
  last_name: "User"
  phone: "+44 1234567890"
  location: "London, UK"

defaults:
  cv_path: "/path/to/cv.pdf"
  cover_letter_template: "/path/to/template.md"

searches: []
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)

    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "search" in str(exc_info.value).lower()


def test_load_config_search_per_site_exceeds_daily(tmp_path: Path) -> None:
    """Search-level per_site_cap must not exceed search daily_cap."""
    config_content = """
account:
  email: "test@example.com"
  first_name: "Test"
  last_name: "User"
  phone: "+44 1234567890"
  location: "London, UK"

defaults:
  cv_path: "/path/to/cv.pdf"
  cover_letter_template: "/path/to/template.md"

searches:
  - name: "test_search"
    platform: "indeed"
    query: "Software Engineer"
    location: "London"
    radius_km: 25
    easy_apply: true
    daily_cap: 10
    per_site_cap: 20
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)

    with pytest.raises(ConfigError) as exc_info:
        load_config(config_file)
    assert "per_site_cap" in str(exc_info.value)
    assert "daily_cap" in str(exc_info.value)


def test_load_config_run_timeout_valid(tmp_path: Path) -> None:
    """run_timeout_minutes loads and defaults to 60 when omitted."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(_VALID_BASE)
    cfg = load_config(config_file)
    assert cfg.limits.run_timeout_minutes == 60

    config_file.write_text(
        _VALID_BASE
        + """
limits:
  daily_apply_cap: 60
  per_site_cap: 40
  pause_between_apps_seconds: [6, 18]
  run_timeout_minutes: 120
"""
    )
    cfg = load_config(config_file)
    assert cfg.limits.run_timeout_minutes == 120


def test_load_config_run_timeout_invalid(tmp_path: Path) -> None:
    """run_timeout_minutes must be 1–480."""
    config_file = tmp_path / "config.yaml"
    for val in (0, 500):
        config_file.write_text(
            _VALID_BASE
            + f"""
limits:
  daily_apply_cap: 60
  per_site_cap: 40
  pause_between_apps_seconds: [6, 18]
  run_timeout_minutes: {val}
"""
        )
        with pytest.raises(ConfigError) as exc_info:
            load_config(config_file)
        assert "run_timeout" in str(exc_info.value).lower()
