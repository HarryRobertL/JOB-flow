"""SQLAlchemy engine/session helpers (sync).

FastAPI can use sync DB access via threadpool without changing the rest of the app
yet. We start with sync SQLAlchemy for simplicity; async can be added later.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from autoapply.db.settings import get_db_settings

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker[Session]] = None


def get_engine() -> Engine:
    global _engine
    settings = get_db_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set")
    if _engine is None:
        _engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
    return _engine


def get_sessionmaker() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    return _SessionLocal


def db_session() -> Session:
    """Convenience for short-lived sessions (use with context manager)."""
    SessionLocal = get_sessionmaker()
    return SessionLocal()

