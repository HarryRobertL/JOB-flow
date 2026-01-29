"""DB settings derived from environment.

We keep current dev flow unchanged: if DATABASE_URL is not set, callers can
continue using the existing SQLite/file-based stores.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class DbSettings:
    database_url: str | None


def get_db_settings() -> DbSettings:
    return DbSettings(database_url=os.environ.get("DATABASE_URL"))

