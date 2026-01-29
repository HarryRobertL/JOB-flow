"""Authentication utilities for FastAPI sessions.

Provides cookie-based session management with signed cookies.
"""

import base64
import hmac
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Cookie, HTTPException, status

from autoapply.auth_store import Role, User, get_auth_store

# Session secret key - in production, this should come from environment variable
# For now, we'll use a default that should be changed in production
SESSION_SECRET_KEY = "autoapplyer-session-secret-change-in-production"  # noqa: S105

# Session cookie name
SESSION_COOKIE_NAME = "autoapply_session"

# Session duration (7 days)
SESSION_DURATION = timedelta(days=7)


def get_session_secret() -> str:
    """Get the session secret key from environment or use default."""
    import os

    return os.environ.get("AUTOAPPLYER_SESSION_SECRET", SESSION_SECRET_KEY)


def create_session_token(user_id: str, role: Role, tenant_id: str) -> str:
    """Create a signed session token containing tenant_id, user_id and role."""
    secret = get_session_secret()
    role_value = role.value if hasattr(role, "value") else str(role)
    payload = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "role": role_value,
        "expires": (datetime.utcnow() + SESSION_DURATION).isoformat(),
    }
    payload_json = json.dumps(payload, sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")
    signature = hmac.new(
        secret.encode("utf-8"), payload_b64.encode("utf-8"), "sha256"
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_session_token(token: str) -> Optional[dict]:
    """Verify and decode a session token. Returns payload dict or None if invalid."""
    try:
        secret = get_session_secret()
        payload_b64, signature = token.split(".", 1)
        expected_signature = hmac.new(
            secret.encode("utf-8"), payload_b64.encode("utf-8"), "sha256"
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            return None
        payload_json = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
        payload = json.loads(payload_json)
        # Check expiration
        expires_str = payload.get("expires")
        if expires_str:
            expires = datetime.fromisoformat(expires_str)
            if datetime.utcnow() > expires:
                return None
        return payload
    except (ValueError, json.JSONDecodeError, KeyError):
        return None


async def get_current_user(
    session: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
) -> User:
    """FastAPI dependency to get the current authenticated user from session cookie."""
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = verify_session_token(session)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    tenant_id = payload.get("tenant_id") or "default"
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    store = get_auth_store()
    user = store.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if getattr(user, "tenant_id", "default") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session tenant",
        )

    return user


async def get_current_user_optional(
    session: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
) -> Optional[User]:
    """FastAPI dependency to get the current user if authenticated, None otherwise."""
    if session is None:
        return None

    payload = verify_session_token(session)
    if payload is None:
        return None

    tenant_id = payload.get("tenant_id") or "default"
    user_id = payload.get("user_id")
    if not user_id:
        return None

    store = get_auth_store()
    u = store.get_user_by_id(user_id)
    if u is None:
        return None
    if getattr(u, "tenant_id", "default") != tenant_id:
        return None
    return u


def check_role(user: User, allowed_roles: list[Role]) -> None:
    """Check if user has one of the allowed roles. Raises HTTPException if not."""
    user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    allowed = {r.value if hasattr(r, "value") else str(r) for r in allowed_roles}
    if user_role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of roles: {', '.join(allowed_roles)}. Current role: {user.role}",
        )

