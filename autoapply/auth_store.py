"""Authentication and user store for AutoApplyer.

This module provides a minimal user store for authentication.
Uses SQLite for persistence and standard library hashlib for password hashing.
Designed to be easily swappable for a production database later.
"""

import hashlib
import os
import secrets
import sqlite3
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Literal, Optional

class Role(str, Enum):
    CLAIMANT = "claimant"
    COACH = "coach"
    ADMIN = "admin"


@dataclass
class User:
    """User model with authentication information."""

    id: str
    tenant_id: str
    email: str
    password_hash: str
    role: Role
    display_name: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert user to dictionary (excluding password)."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "email": self.email,
            "role": self.role.value if isinstance(self.role, Role) else str(self.role),
            "display_name": self.display_name,
        }


class AuthStore:
    """Simple SQLite-backed user store for authentication."""

    def __init__(self, db_path: Path):
        """Initialize the auth store with a database path."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """Initialize the database schema if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL DEFAULT 'default',
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('claimant', 'coach', 'admin')),
                    display_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            # Backfill older DBs that predate tenant_id.
            try:
                conn.execute("ALTER TABLE users ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'")
            except Exception:
                pass
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS claimant_skip (
                    user_id TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_assignments (
                    coach_id TEXT NOT NULL,
                    claimant_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (coach_id, claimant_id),
                    FOREIGN KEY (coach_id) REFERENCES users(id),
                    FOREIGN KEY (claimant_id) REFERENCES users(id)
                )
                """
            )
            conn.commit()

    def _hash_password(self, password: str) -> str:
        """Hash a password using PBKDF2-HMAC-SHA256."""
        # Generate a random salt per password
        salt = secrets.token_hex(16)
        # Hash with PBKDF2 (100k iterations for reasonable security)
        hash_value = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        )
        # Store salt + hash together (salt first)
        return f"{salt}:{hash_value.hex()}"

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against a stored hash."""
        try:
            salt, stored_hash = password_hash.split(":", 1)
            hash_value = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
            )
            return hash_value.hex() == stored_hash
        except (ValueError, AttributeError):
            return False

    def create_user(
        self,
        email: str,
        password: str,
        role: Role,
        display_name: Optional[str] = None,
        tenant_id: str = "default",
    ) -> User:
        """Create a new user."""
        existing = self.get_user_by_email(email, tenant_id=tenant_id)
        if existing is not None:
            # Idempotent behavior (useful for tests/dev seeding): update and return.
            return self.update_user(
                existing.id,
                email=email,
                password=password,
                display_name=display_name,
                role=role,
            ) or existing

        user_id = secrets.token_urlsafe(16)
        password_hash = self._hash_password(password)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO users (id, tenant_id, email, password_hash, role, display_name)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, tenant_id, email, password_hash, (role.value if isinstance(role, Role) else str(role)), display_name),
            )
            conn.commit()

        return User(
            id=user_id,
            tenant_id=tenant_id,
            email=email,
            password_hash=password_hash,
            role=Role(role) if not isinstance(role, Role) else role,
            display_name=display_name,
        )

    def get_user_by_email(self, email: str, tenant_id: str = "default") -> Optional[User]:
        """Get a user by email address (scoped by tenant)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT id, tenant_id, email, password_hash, role, display_name FROM users WHERE email = ? AND tenant_id = ?",
                (email, tenant_id),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return User(
                id=row["id"],
                tenant_id=row["tenant_id"] or tenant_id,
                email=row["email"],
                password_hash=row["password_hash"],
                role=Role(row["role"]),
                display_name=row["display_name"],
            )

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT id, tenant_id, email, password_hash, role, display_name FROM users WHERE id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return User(
                id=row["id"],
                tenant_id=row["tenant_id"] or "default",
                email=row["email"],
                password_hash=row["password_hash"],
                role=Role(row["role"]),
                display_name=row["display_name"],
            )

    def verify_password(self, email: str, password: str, tenant_id: str = "default") -> Optional[User]:
        """Verify a password and return the user if valid (scoped by tenant)."""
        user = self.get_user_by_email(email, tenant_id=tenant_id)
        if user is None:
            return None
        if self._verify_password(password, user.password_hash):
            return user
        return None

    def update_user(
        self,
        user_id: str,
        email: Optional[str] = None,
        password: Optional[str] = None,
        display_name: Optional[str] = None,
        role: Optional[Role] = None,
    ) -> Optional[User]:
        """Update user information."""
        updates = []
        params = []

        if email is not None:
            updates.append("email = ?")
            params.append(email)
        if password is not None:
            password_hash = self._hash_password(password)
            updates.append("password_hash = ?")
            params.append(password_hash)
        if display_name is not None:
            updates.append("display_name = ?")
            params.append(display_name)
        if role is not None:
            updates.append("role = ?")
            params.append(role.value if isinstance(role, Role) else str(role))

        if not updates:
            return self.get_user_by_id(user_id)

        params.append(user_id)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            conn.commit()

        return self.get_user_by_id(user_id)

    def get_assignments_for_coach(self, coach_id: str) -> list[str]:
        """Return list of claimant user IDs assigned to this coach."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT claimant_id FROM user_assignments WHERE coach_id = ? ORDER BY claimant_id",
                (coach_id,),
            )
            return [row[0] for row in cursor.fetchall()]

    def set_assignments_for_coach(self, coach_id: str, claimant_ids: list[str]) -> None:
        """Replace assignments for a coach with the given list of claimant user IDs."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM user_assignments WHERE coach_id = ?", (coach_id,))
            for cid in claimant_ids:
                if cid:
                    conn.execute(
                        "INSERT INTO user_assignments (coach_id, claimant_id) VALUES (?, ?)",
                        (coach_id, cid),
                    )
            conn.commit()

    def delete_user(self, user_id: str) -> bool:
        """Delete a user by ID. Returns True if deleted, False if not found."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return cursor.rowcount > 0

    def set_claimant_skipped(self, user_id: str) -> None:
        """Mark a claimant as having skipped onboarding (can access dashboard with limited state)."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO claimant_skip (user_id) VALUES (?)",
                (user_id,),
            )
            conn.commit()

    def is_claimant_skipped(self, user_id: str) -> bool:
        """Return True if this claimant has skipped onboarding."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT 1 FROM claimant_skip WHERE user_id = ?",
                (user_id,),
            )
            return cursor.fetchone() is not None

    def list_users(self, role: Optional[Role] = None) -> list[User]:
        """List all users, optionally filtered by role."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if role:
                cursor = conn.execute(
                    "SELECT id, tenant_id, email, password_hash, role, display_name FROM users WHERE role = ?",
                    (role,),
                )
            else:
                cursor = conn.execute(
                    "SELECT id, tenant_id, email, password_hash, role, display_name FROM users"
                )
            rows = cursor.fetchall()
            return [
                User(
                    id=row["id"],
                    tenant_id=row["tenant_id"] or "default",
                    email=row["email"],
                    password_hash=row["password_hash"],
                    role=Role(row["role"]),
                    display_name=row["display_name"],
                )
                for row in rows
            ]


# Global instance - can be overridden for testing
_default_store: Optional[AuthStore] = None


def get_auth_store(db_path: Optional[Path] = None) -> AuthStore:
    """Get the default auth store instance."""
    global _default_store
    if _default_store is None:
        # SaaS foundation: keep SQLite default for dev, but allow DB URL to be configured.
        # (Tenant-aware DB auth store is implemented in a later phase.)
        _ = os.environ.get("DATABASE_URL")
        if db_path is None:
            # Default to data/auth.db in the repo root
            db_path = Path(__file__).parent.parent / "data" / "auth.db"
        _default_store = AuthStore(db_path)
    return _default_store

