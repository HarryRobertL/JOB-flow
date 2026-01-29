"""Tests for run state storage and GET /api/automation/status."""

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from autoapply.core.storage import (
    RUN_STATUS_RUNNING,
    RunState,
    write_run_state,
)
from autoapply.server import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def claimant_user():
    from autoapply.auth_store import get_auth_store

    store = get_auth_store()
    email = f"claimant-{uuid.uuid4().hex[:8]}@runstate.test"
    user = store.create_user(
        email=email,
        password="testpass123",
        role="claimant",
        display_name="RunState Claimant",
    )
    return user


@pytest.fixture
def auth_headers(client, claimant_user):
    r = client.post(
        "/auth/login",
        json={"email": claimant_user.email, "password": "testpass123"},
    )
    assert r.status_code == 200
    c = r.cookies.get("autoapply_session")
    return {"Cookie": f"autoapply_session={c}"}


def test_automation_status_idle(client, auth_headers, tmp_path):
    """GET /api/automation/status returns status idle when no run_state.json."""
    import autoapply.server as server

    original = server.RUN_STATE_PATH
    server.RUN_STATE_PATH = tmp_path / "run_state.json"
    try:
        if server.RUN_STATE_PATH.exists():
            server.RUN_STATE_PATH.unlink()
        r = client.get("/api/automation/status", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "idle"
    finally:
        server.RUN_STATE_PATH = original


def test_automation_status_with_state(client, auth_headers, tmp_path):
    """GET /api/automation/status returns RunState when file exists."""
    import autoapply.server as server

    original = server.RUN_STATE_PATH
    server.RUN_STATE_PATH = tmp_path / "run_state.json"
    try:
        state = RunState(
            run_id="test-run-123",
            started_at="2025-01-15T12:00:00+00:00",
            finished_at=None,
            status=RUN_STATUS_RUNNING,
            total_attempted=3,
            total_applied=1,
            total_skipped=1,
            total_error=1,
            notes="",
        )
        write_run_state(state, server.RUN_STATE_PATH)
        r = client.get("/api/automation/status", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["run_id"] == "test-run-123"
        assert data["status"] == RUN_STATUS_RUNNING
        assert data["started_at"] == "2025-01-15T12:00:00+00:00"
        assert data["total_attempted"] == 3
        assert data["total_applied"] == 1
        assert data["total_skipped"] == 1
        assert data["total_error"] == 1
    finally:
        server.RUN_STATE_PATH = original
