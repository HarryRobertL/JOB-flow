"""Configuration loading and validation using Pydantic."""

from __future__ import annotations

import warnings
from pathlib import Path
from typing import Any, Literal, Optional

import yaml
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

Platform = Literal["indeed", "greenhouse", "lever", "workday"]

# Upper bound for daily caps (DWP pilot safety).
DAILY_CAP_MAX = 200


class ConfigError(Exception):
    """Raised when configuration loading or validation fails."""

    pass


def _normalize_legacy_config(data: dict[str, Any]) -> None:
    """Mutate raw YAML dict to normalize legacy keys before validation."""
    if "searches" in data:
        for idx, search in enumerate(data["searches"]):
            if not isinstance(search, dict):
                continue
            if "site" in search and "platform" not in search:
                search["platform"] = search.pop("site")
            if "easy" in search and isinstance(search["easy"], bool):
                search["easy_apply"] = search.pop("easy")
            if "name" not in search:
                query = (search.get("query") or "").strip()
                loc = (search.get("location") or "").strip()
                if query and loc:
                    search["name"] = f"{query.lower().replace(' ', '_')}_{loc.lower().replace(' ', '_')}"
                elif query:
                    search["name"] = f"{query.lower().replace(' ', '_')}_{idx}"
                else:
                    search["name"] = f"search_{idx}"
            if "limits" in search and isinstance(search["limits"], dict):
                limits_dict = search["limits"]
                if "daily_cap" in limits_dict:
                    search["daily_cap"] = limits_dict.pop("daily_cap")
                if "per_site_cap" in limits_dict:
                    search["per_site_cap"] = limits_dict.pop("per_site_cap")
                if not limits_dict:
                    search.pop("limits")
            if "random_delay_range" in search and isinstance(search["random_delay_range"], dict):
                rd = search["random_delay_range"]
                if "min_seconds" in rd and "max_seconds" in rd:
                    search["pause_between_apps_seconds"] = [rd["min_seconds"], rd["max_seconds"]]
                    search.pop("random_delay_range")

    if "defaults" in data and isinstance(data["defaults"], dict):
        d = data["defaults"]
        if "cv" in d and "cv_path" not in d:
            d["cv_path"] = d.pop("cv")
        if "cover_template" in d and "cover_letter_template" not in d:
            d["cover_letter_template"] = d.pop("cover_template")

    if "limits" in data and isinstance(data["limits"], dict):
        limits = data["limits"]
        if "random_delay_range" in limits and isinstance(limits.get("random_delay_range"), dict):
            rd = limits["random_delay_range"]
            if "min_seconds" in rd and "max_seconds" in rd:
                limits["pause_between_apps_seconds"] = [rd["min_seconds"], rd["max_seconds"]]


class AccountConfig(BaseModel):
    """Account information configuration."""

    email: str
    first_name: str
    last_name: str
    phone: str
    location: str
    postcode: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None
    """
    Optional password field for backward compatibility.
    Not used by the bot; sign in manually when prompted.
    """

    @field_validator("email", "first_name", "last_name", "phone", "location", mode="after")
    @classmethod
    def required_non_empty(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError(
                "Required field cannot be empty. Please provide a value for email, "
                "first name, last name, phone, and location in the 'account' section."
            )
        return s


class DefaultsConfig(BaseModel):
    """Default file paths configuration."""

    model_config = ConfigDict(populate_by_name=True)

    cv_path: str
    cover_letter_template: str

    @field_validator("cv_path", "cover_letter_template", mode="after")
    @classmethod
    def validate_paths(cls, v: str) -> str:
        if v and not Path(v).exists():
            warnings.warn(
                f"Path does not exist: {v}. The bot may fail when trying to use this file.",
                UserWarning,
                stacklevel=2,
            )
        return v


class LimitsConfig(BaseModel):
    """Global application limits."""

    daily_apply_cap: int = 60
    per_site_cap: int = 40
    pause_between_apps_seconds: tuple[int, int] = (6, 18)
    retry_on_error: int = 2
    run_timeout_minutes: Optional[int] = 60

    @field_validator("daily_apply_cap")
    @classmethod
    def daily_cap_range(cls, v: int) -> int:
        if not isinstance(v, int) or v < 1:
            raise ValueError(
                f"limits.daily_apply_cap must be a positive integer (got {v!r}). "
                "Recommended for DWP pilot: 15–60."
            )
        if v > DAILY_CAP_MAX:
            raise ValueError(
                f"limits.daily_apply_cap must be at most {DAILY_CAP_MAX} (got {v}). "
                "Higher values may trigger rate limiting."
            )
        return v

    @field_validator("per_site_cap")
    @classmethod
    def per_site_non_negative(cls, v: int) -> int:
        if not isinstance(v, int) or v < 0:
            raise ValueError(
                f"limits.per_site_cap must be a non-negative integer (got {v!r})."
            )
        return v

    @field_validator("pause_between_apps_seconds", mode="before")
    @classmethod
    def normalize_pause(cls, v: Any) -> tuple[int, int]:
        if v is None:
            return (6, 18)
        if isinstance(v, list) and len(v) >= 2:
            v = (int(v[0]), int(v[1]))
        if isinstance(v, tuple) and len(v) >= 2:
            mn, mx = int(v[0]), int(v[1])
            if mn < 1 or mx < 1:
                raise ValueError(
                    "limits.pause_between_apps_seconds [min, max] must both be positive. "
                    "Recommended for pilot: [5, 25] seconds."
                )
            if mn > mx:
                raise ValueError(
                    f"limits.pause_between_apps_seconds: min ({mn}) must be <= max ({mx})."
                )
            return (mn, mx)
        raise ValueError(
            "limits.pause_between_apps_seconds must be [min, max] with two positive numbers."
        )

    @field_validator("retry_on_error")
    @classmethod
    def retry_non_negative(cls, v: int) -> int:
        if not isinstance(v, int) or v < 0:
            raise ValueError(f"limits.retry_on_error must be a non-negative integer (got {v!r}).")
        return v

    @field_validator("run_timeout_minutes", mode="before")
    @classmethod
    def run_timeout_valid(cls, v: Any) -> int:
        if v is None:
            return 60
        v = int(v)
        if v < 1:
            raise ValueError(
                "limits.run_timeout_minutes must be a positive integer (e.g. 60 for pilot)."
            )
        if v > 480:
            raise ValueError(
                "limits.run_timeout_minutes must be at most 480 (8 hours)."
            )
        return v

    @model_validator(mode="after")
    def per_site_not_exceed_daily(self) -> "LimitsConfig":
        if self.per_site_cap > self.daily_apply_cap:
            raise ValueError(
                f"limits.per_site_cap ({self.per_site_cap}) must not exceed "
                f"limits.daily_apply_cap ({self.daily_apply_cap})."
            )
        return self


class SearchConfig(BaseModel):
    """Configuration for a single job search."""

    name: str
    platform: Platform
    query: str
    location: str
    radius_km: int
    easy_apply: bool = True
    daily_cap: Optional[int] = None
    per_site_cap: Optional[int] = None
    pause_between_apps_seconds: Optional[tuple[int, int]] = None
    retry_on_error: int = 2
    salary_min: Optional[int] = None
    remote: Optional[str] = None
    # Workday: full URL to the tenant job board (e.g. https://acme.wd1.myworkdayjobs.com/en-US/Careers).
    workday_base_url: Optional[str] = None

    @field_validator("daily_cap")
    @classmethod
    def daily_cap_valid(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if not isinstance(v, int) or v < 1:
            raise ValueError(
                f"search daily_cap must be a positive integer or omitted (got {v!r})."
            )
        if v > DAILY_CAP_MAX:
            raise ValueError(
                f"search daily_cap must be at most {DAILY_CAP_MAX} (got {v})."
            )
        return v

    @field_validator("per_site_cap")
    @classmethod
    def per_site_cap_valid(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if not isinstance(v, int) or v < 0:
            raise ValueError(
                f"search per_site_cap must be non-negative or omitted (got {v!r})."
            )
        return v

    @field_validator("pause_between_apps_seconds", mode="before")
    @classmethod
    def normalize_search_pause(cls, v: Any) -> Optional[tuple[int, int]]:
        if v is None:
            return None
        if isinstance(v, list) and len(v) >= 2:
            v = (int(v[0]), int(v[1]))
        if isinstance(v, tuple) and len(v) >= 2:
            mn, mx = int(v[0]), int(v[1])
            if mn < 1 or mx < 1:
                raise ValueError(
                    "search pause_between_apps_seconds [min, max] must both be positive."
                )
            if mn > mx:
                raise ValueError(
                    f"search pause_between_apps_seconds: min ({mn}) must be <= max ({mx})."
                )
            return (mn, mx)
        raise ValueError(
            "search pause_between_apps_seconds must be [min, max] or omitted."
        )

    @model_validator(mode="after")
    def per_site_not_exceed_daily(self) -> "SearchConfig":
        dc = self.daily_cap
        ps = self.per_site_cap
        if dc is not None and ps is not None and ps > dc:
            raise ValueError(
                f"search per_site_cap ({ps}) must not exceed search daily_cap ({dc})."
            )
        return self


class FiltersConfig(BaseModel):
    """Job filtering configuration."""

    titles_include: list[str] = []
    keywords_include: list[str] = []


class AppConfig(BaseModel):
    """Main application configuration."""

    account: AccountConfig
    defaults: DefaultsConfig
    searches: list[SearchConfig]
    filters: Optional[FiltersConfig] = None
    career_sites: Optional[dict[str, Any]] = None
    cv_map: Optional[dict[str, Any]] = None
    answers: Optional[dict[str, Any]] = None
    limits: LimitsConfig = LimitsConfig()
    # Settings page: discover-only mode and require manual review (optional; default from first search or legacy)
    discover_only: bool = False
    require_review: bool = True
    # Weekly compliance: agreed target (default 10); work coach can set per claimant later
    required_applications_per_week: Optional[int] = None

    @field_validator("required_applications_per_week")
    @classmethod
    def required_per_week_range(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if not isinstance(v, int) or v < 1 or v > 100:
            raise ValueError(
                f"required_applications_per_week must be between 1 and 100 (got {v!r})."
            )
        return v

    @model_validator(mode="before")
    @classmethod
    def inject_default_limits(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if "limits" not in data or data["limits"] is None:
            data = {**data, "limits": {}}
        return data

    @model_validator(mode="after")
    def at_least_one_search(self) -> "AppConfig":
        if not self.searches:
            raise ValueError(
                "At least one search is required under 'searches'. "
                "Add a search entry with name, platform, query, location, and radius_km."
            )
        return self

    def to_dict(self) -> dict[str, Any]:
        """Convert config to dictionary (for backward compatibility)."""
        return self.model_dump(mode="python", by_alias=True)


# Alias for load_config return type.
Config = AppConfig


def load_config(path: str | Path = "config.yaml") -> Config:
    """
    Load and validate configuration from a YAML file.

    Checks that the file exists, loads YAML, normalizes legacy keys,
    validates via Pydantic, and returns a Config instance.
    On failure, raises ConfigError with a clear message suitable for
    claimant support.

    Args:
        path: Path to the configuration file (default: config.yaml).

    Returns:
        Validated Config (AppConfig) instance.

    Raises:
        ConfigError: If the file is missing, YAML is invalid, or validation fails.
    """
    p = Path(path)
    if not p.exists():
        raise ConfigError(
            f"Configuration file not found: {p}\n"
            "Create a config.yaml from config.example.yaml, or use --config to specify a path."
        )

    try:
        with p.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ConfigError(f"Invalid YAML in {p}: {e}") from e

    if not isinstance(data, dict):
        data = {}

    _normalize_legacy_config(data)

    try:
        return AppConfig.model_validate(data)
    except Exception as e:
        from pydantic import ValidationError

        if isinstance(e, ValidationError):
            parts = [f"Configuration validation failed in {p}:"]
            for err in e.errors():
                loc = ".".join(str(x) for x in err["loc"])
                msg = err.get("msg", "validation error")
                parts.append(f"  - {loc}: {msg}")
            raise ConfigError("\n".join(parts)) from e
        raise ConfigError(f"Failed to load configuration from {p}: {e}") from e


def _load_config_from_file(config_path: str | Path) -> AppConfig:
    """Legacy loader: same as load_config but raises FileNotFoundError when missing."""
    p = Path(config_path)
    if not p.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {config_path}\n"
            "Create a config.yaml based on config.example.yaml"
        )
    return load_config(p)


def _default_config_path() -> Path:
    """Config path when none specified (repo root config.yaml)."""
    root = Path(__file__).resolve().parent.parent.parent
    return root / "config.yaml"


def default_config_path() -> Path:
    """Config path when none specified (repo root config.yaml). For use by run.py and CLI."""
    return _default_config_path()


# Preserve backward compatibility: load_from_file / load_default for server and tests.
def load_from_file(config_path: str | Path) -> AppConfig:
    """Load configuration from a YAML file. Raises FileNotFoundError if missing."""
    return _load_config_from_file(config_path)


def load_default() -> AppConfig:
    """Load configuration from config.yaml in the project root."""
    path = _default_config_path()
    if not path.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {path}\n"
            "Create a config.yaml file based on config.example.yaml"
        )
    return load_config(path)


# Attach class methods to AppConfig for server/cli that call load_from_file / load_default.
def _appconfig_load_from_file(cls: type[AppConfig], config_path: str | Path) -> AppConfig:
    return _load_config_from_file(config_path)


def _appconfig_load_default(cls: type[AppConfig]) -> AppConfig:
    return load_default()


AppConfig.load_from_file = classmethod(_appconfig_load_from_file)  # type: ignore[method-assign]
AppConfig.load_default = classmethod(_appconfig_load_default)  # type: ignore[method-assign]
