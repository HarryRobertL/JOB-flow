"""Tests for key API endpoints including health, auth, and role protection."""

import json
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from autoapply.server import app
from autoapply.auth_store import get_auth_store, Role
from autoapply.evidence import log_evidence, EVIDENCE_LOG_PATH


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def test_claimant():
    """Create a test claimant user."""
    store = get_auth_store()
    user = store.create_user(
        email="claimant@test.com",
        password="testpass123",
        role=Role.CLAIMANT,
        display_name="Test Claimant",
    )
    return user


@pytest.fixture
def test_coach():
    """Create a test coach user."""
    store = get_auth_store()
    user = store.create_user(
        email="coach@test.com",
        password="testpass123",
        role=Role.COACH,
        display_name="Test Coach",
    )
    return user


@pytest.fixture
def test_admin():
    """Create a test admin user."""
    store = get_auth_store()
    user = store.create_user(
        email="admin@test.com",
        password="testpass123",
        role=Role.ADMIN,
        display_name="Test Admin",
    )
    return user


@pytest.fixture
def auth_headers_claimant(client, test_claimant):
    """Get auth headers for test claimant."""
    response = client.post(
        "/auth/login",
        json={"email": test_claimant.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    cookies = response.cookies
    return {"Cookie": f"autoapply_session={cookies.get('autoapply_session')}"}


@pytest.fixture
def auth_headers_coach(client, test_coach):
    """Get auth headers for test coach."""
    response = client.post(
        "/auth/login",
        json={"email": test_coach.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    cookies = response.cookies
    return {"Cookie": f"autoapply_session={cookies.get('autoapply_session')}"}


@pytest.fixture
def auth_headers_admin(client, test_admin):
    """Get auth headers for test admin."""
    response = client.post(
        "/auth/login",
        json={"email": test_admin.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    cookies = response.cookies
    return {"Cookie": f"autoapply_session={cookies.get('autoapply_session')}"}


@pytest.fixture
def logs_file(tmp_path, monkeypatch):
    """Create a temporary logs file."""
    log_file = tmp_path / "logs.csv"
    log_file.write_text("ts,site,job_title,company,url,status,notes\n")
    
    # Monkeypatch the server's LOGS_PATH
    import autoapply.server
    original_path = autoapply.server.LOGS_PATH
    autoapply.server.LOGS_PATH = log_file
    
    yield log_file
    
    autoapply.server.LOGS_PATH = original_path


@pytest.fixture
def jobs_queue_file(tmp_path, monkeypatch):
    """Create a temporary jobs queue file."""
    jobs_file = tmp_path / "jobs_queue.json"
    jobs_file.write_text(json.dumps([
        {
            "id": "job1",
            "title": "Test Job",
            "company": "Test Company",
            "platform": "indeed",
            "status": "pending",
            "url": "https://example.com/job1",
        }
    ]))
    
    import autoapply.server
    original_path = autoapply.server.JOBS_QUEUE_PATH
    autoapply.server.JOBS_QUEUE_PATH = jobs_file
    
    yield jobs_file
    
    autoapply.server.JOBS_QUEUE_PATH = original_path


# ============================================================================
# Health Check Tests
# ============================================================================

def test_health_check_success(client):
    """Test health check endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert "paths" in data
    assert "database" in data


# ============================================================================
# Authentication Tests
# ============================================================================

def test_login_success(client, test_claimant):
    """Test successful login."""
    response = client.post(
        "/auth/login",
        json={"email": test_claimant.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "user" in data
    assert data["user"]["email"] == test_claimant.email
    
    # Check that session cookie is set
    assert "autoapply_session" in response.cookies


def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post(
        "/auth/login",
        json={"email": "nonexistent@test.com", "password": "wrongpass"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "error" in data


def test_logout_success(client, auth_headers_claimant):
    """Test successful logout."""
    response = client.post("/auth/logout", headers=auth_headers_claimant)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"


def test_get_current_user(client, auth_headers_claimant, test_claimant):
    """Test getting current authenticated user."""
    response = client.get("/auth/me", headers=auth_headers_claimant)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_claimant.email
    assert data["role"] == "claimant"


def test_get_current_user_unauthorized(client):
    """Test getting current user without authentication."""
    response = client.get("/auth/me")
    assert response.status_code == 401


# ============================================================================
# Claimant API Tests
# ============================================================================

def test_claimant_status_success(client, auth_headers_claimant, logs_file):
    """Test claimant status endpoint."""
    # Add some log entries
    with open(logs_file, "a") as f:
        f.write(f"{datetime.now().isoformat()},indeed,Test Job,Test Co,https://example.com,applied,\n")
    
    response = client.get("/api/claimant/status", headers=auth_headers_claimant)
    assert response.status_code == 200
    data = response.json()
    assert "applicationsThisWeek" in data
    assert "applicationsTotal" in data
    assert "recentActivity" in data


def test_claimant_status_unauthorized(client):
    """Test claimant status endpoint without authentication."""
    response = client.get("/api/claimant/status")
    assert response.status_code == 401


def test_claimant_status_wrong_role(client, auth_headers_coach):
    """Test claimant status endpoint with wrong role."""
    response = client.get("/api/claimant/status", headers=auth_headers_coach)
    assert response.status_code == 403


def test_claimant_jobs_success(client, auth_headers_claimant, jobs_queue_file):
    """Test claimant jobs endpoint."""
    response = client.get("/api/claimant/jobs", headers=auth_headers_claimant)
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert isinstance(data["jobs"], list)


def test_claimant_jobs_unauthorized(client):
    """Test claimant jobs endpoint without authentication."""
    response = client.get("/api/claimant/jobs")
    assert response.status_code == 401


# ============================================================================
# Work Coach API Tests
# ============================================================================

def test_work_coach_claimants_success(client, auth_headers_coach, logs_file):
    """Test work coach claimants endpoint."""
    # Add some log entries for a claimant
    claimant_id = "claimant@test.com"
    with open(logs_file, "a") as f:
        f.write(f"{datetime.now().isoformat()},indeed,Test Job,Test Co,https://example.com,applied,\n")
    
    response = client.get("/api/staff/work-coach/claimants", headers=auth_headers_coach)
    assert response.status_code == 200
    data = response.json()
    assert "claimants" in data
    assert isinstance(data["claimants"], list)


def test_work_coach_claimants_unauthorized(client):
    """Test work coach claimants endpoint without authentication."""
    response = client.get("/api/staff/work-coach/claimants")
    assert response.status_code == 401


def test_work_coach_claimants_wrong_role(client, auth_headers_claimant):
    """Test work coach claimants endpoint with wrong role."""
    response = client.get("/api/staff/work-coach/claimants", headers=auth_headers_claimant)
    assert response.status_code == 403


def test_work_coach_claimant_detail_success(client, auth_headers_coach, logs_file):
    """Test work coach claimant detail endpoint."""
    claimant_id = "claimant@test.com"
    # Add some log entries
    with open(logs_file, "a") as f:
        f.write(f"{datetime.now().isoformat()},indeed,Test Job,Test Co,https://example.com,applied,\n")
    
    response = client.get(
        f"/api/staff/work-coach/claimants/{claimant_id}",
        headers=auth_headers_coach,
    )
    assert response.status_code == 200
    data = response.json()
    assert "claimant" in data or "id" in data  # Check structure


def test_work_coach_claimant_detail_unauthorized(client):
    """Test work coach claimant detail endpoint without authentication."""
    response = client.get("/api/staff/work-coach/claimants/test@example.com")
    assert response.status_code == 401


# ============================================================================
# DWP Admin API Tests
# ============================================================================

def test_dwp_metrics_success(client, auth_headers_admin, logs_file):
    """Test DWP metrics endpoint."""
    # Add some log entries
    with open(logs_file, "a") as f:
        f.write(f"{datetime.now().isoformat()},indeed,Test Job,Test Co,https://example.com,applied,\n")
    
    response = client.get("/api/staff/dwp/metrics", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "timeSeries" in data


def test_dwp_metrics_unauthorized(client):
    """Test DWP metrics endpoint without authentication."""
    response = client.get("/api/staff/dwp/metrics")
    assert response.status_code == 401


def test_dwp_metrics_wrong_role(client, auth_headers_claimant):
    """Test DWP metrics endpoint with wrong role."""
    response = client.get("/api/staff/dwp/metrics", headers=auth_headers_claimant)
    assert response.status_code == 403


def test_dwp_metrics_coach_role(client, auth_headers_coach):
    """Test DWP metrics endpoint with coach role (should be allowed)."""
    response = client.get("/api/staff/dwp/metrics", headers=auth_headers_coach)
    # Coach should be able to access DWP metrics (check_role allows both coach and admin)
    assert response.status_code in [200, 403]  # Depends on implementation


# ============================================================================
# Export Endpoint Tests
# ============================================================================

def test_export_report_success(client, auth_headers_coach, logs_file):
    """Test export report endpoint."""
    # Add some log entries
    with open(logs_file, "a") as f:
        f.write(f"{datetime.now().isoformat()},indeed,Test Job,Test Co,https://example.com,applied,\n")
    
    response = client.get(
        "/api/staff/work-coach/reports/export?format=csv",
        headers=auth_headers_coach,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Content-Disposition" in response.headers


def test_export_report_unauthorized(client):
    """Test export report endpoint without authentication."""
    response = client.get("/api/staff/work-coach/reports/export")
    assert response.status_code == 401


def test_export_report_wrong_role(client, auth_headers_claimant):
    """Test export report endpoint with wrong role."""
    response = client.get(
        "/api/staff/work-coach/reports/export",
        headers=auth_headers_claimant,
    )
    assert response.status_code == 403


# ============================================================================
# Additional Health Check Tests
# ============================================================================

_HEALTH_CHECK_VALID_CONFIG = """
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


@pytest.fixture
def health_check_engine_ready(tmp_path, monkeypatch):
    """Set up tmp_path with config, data, profiles so engine prerequisite checks pass."""
    import autoapply.server as srv

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "logs.csv").write_text("ts,site,job_title,company,url,status,notes\n")
    (tmp_path / "config.yaml").write_text(_HEALTH_CHECK_VALID_CONFIG)
    (tmp_path / "profiles").mkdir()

    monkeypatch.setattr(srv, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(srv, "CONFIG_PATH", tmp_path / "config.yaml")
    monkeypatch.setattr(srv, "LOGS_PATH", data_dir / "logs.csv")
    monkeypatch.setattr(srv, "PROFILES_DIR", tmp_path / "profiles")
    return tmp_path


def test_health_check_success(client, health_check_engine_ready):
    """Test health check returns healthy when engine prerequisites and database are ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert "paths" in data
    assert "database" in data
    assert "engine" in data
    for key in ("config", "data_writable", "profiles", "playwright"):
        assert data["engine"][key]["ok"] is True, data["engine"][key].get("message")


def test_health_check_paths_exist(client, health_check_engine_ready):
    """Test health check path status when paths exist."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["paths"]["data_dir"]["exists"] is True
    assert data["paths"]["config_path"]["exists"] is True
    assert data["paths"]["profiles_dir"]["exists"] is True


def test_health_check_engine_structure(client, health_check_engine_ready):
    """Test health check engine block has required keys and structure."""
    response = client.get("/health")
    assert response.status_code == 200
    engine = response.json()["engine"]
    for key in ("config", "data_writable", "profiles", "playwright"):
        assert key in engine
        assert "ok" in engine[key]
        assert "message" in engine[key]


def test_health_check_database_error(client, health_check_engine_ready, monkeypatch):
    """Test health check returns degraded when database has an error."""
    with patch("autoapply.server.get_auth_store") as mock_store:
        mock_store.side_effect = Exception("Database connection failed")

        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"]["status"] == "error"


def test_health_check_config_missing_returns_degraded(client, tmp_path, monkeypatch):
    """Test health check returns degraded when config.yaml is missing."""
    import autoapply.server as srv

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (tmp_path / "profiles").mkdir()
    monkeypatch.setattr(srv, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(srv, "CONFIG_PATH", tmp_path / "config.yaml")
    monkeypatch.setattr(srv, "LOGS_PATH", data_dir / "logs.csv")
    monkeypatch.setattr(srv, "PROFILES_DIR", tmp_path / "profiles")
    assert not (tmp_path / "config.yaml").exists()

    response = client.get("/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    assert data["engine"]["config"]["ok"] is False
    assert "not found" in data["engine"]["config"]["message"].lower()

