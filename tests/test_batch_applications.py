"""Tests for batch application endpoint."""

import json
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from autoapply.server import app
from autoapply.auth_store import get_auth_store, Role
from autoapply.evidence import load_evidence_entries, EVIDENCE_LOG_PATH


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test claimant user."""
    store = get_auth_store()
    user = store.create_user(
        email="test@example.com",
        password="testpass123",
        role=Role.CLAIMANT,
        display_name="Test Claimant",
    )
    return user


@pytest.fixture
def auth_headers(test_user):
    """Get auth headers for test user."""
    # Login to get session cookie
    client = TestClient(app)
    response = client.post(
        "/auth/login",
        json={"email": test_user.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    
    # Extract session cookie
    cookies = response.cookies
    return {"Cookie": f"autoapply_session={cookies.get('autoapply_session')}"}


@pytest.fixture
def jobs_queue_file(tmp_path, monkeypatch):
    """Create a temporary jobs queue file."""
    queue_file = tmp_path / "jobs_queue.json"
    
    # Mock the JOBS_QUEUE_PATH
    from autoapply import server
    original_path = server.JOBS_QUEUE_PATH
    server.JOBS_QUEUE_PATH = queue_file
    
    # Initialize with test jobs
    jobs = [
        {
            "id": "job-1",
            "platform": "indeed",
            "title": "Software Engineer",
            "job_title": "Software Engineer",
            "company": "Tech Corp",
            "location": "London, UK",
            "url": "https://indeed.com/job1",
            "status": "pending",
        },
        {
            "id": "job-2",
            "platform": "greenhouse",
            "title": "Data Scientist",
            "job_title": "Data Scientist",
            "company": "Data Inc",
            "location": "Remote",
            "url": "https://greenhouse.io/job2",
            "status": "pending",
        },
    ]
    queue_file.write_text(json.dumps(jobs), encoding="utf-8")
    
    yield queue_file
    
    # Restore original path
    server.JOBS_QUEUE_PATH = original_path


@pytest.fixture
def evidence_log_file(tmp_path, monkeypatch):
    """Create a temporary evidence log file."""
    evidence_file = tmp_path / "evidence.csv"
    
    # Mock the EVIDENCE_LOG_PATH
    from autoapply import evidence
    original_path = evidence.EVIDENCE_LOG_PATH
    evidence.EVIDENCE_LOG_PATH = evidence_file
    
    yield evidence_file
    
    # Restore original path
    evidence.EVIDENCE_LOG_PATH = original_path


def test_batch_approve_applications_success(
    client, test_user, auth_headers, jobs_queue_file, evidence_log_file
):
    """Test successful batch approval of applications."""
    # Approve job-1, reject job-2
    response = client.post(
        "/api/claimant/applications/batch",
        json={
            "applications": [
                {"jobId": "job-1", "action": "approve"},
                {"jobId": "job-2", "action": "reject"},
            ]
        },
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["approved"] == 1
    assert data["rejected"] == 1
    assert "job-1" in data["approvedJobIds"]
    assert "job-2" in data["rejectedJobIds"]
    
    # Verify jobs queue was updated
    jobs = json.loads(jobs_queue_file.read_text(encoding="utf-8"))
    jobs_dict = {j["id"]: j for j in jobs}
    assert jobs_dict["job-1"]["status"] == "approved"
    assert "approvedAt" in jobs_dict["job-1"]
    assert jobs_dict["job-2"]["status"] == "rejected"
    assert "rejectedAt" in jobs_dict["job-2"]
    
    # Verify evidence entries were created
    evidence_entries = load_evidence_entries(
        claimant_id=str(test_user.id),
        evidence_log_path=evidence_log_file,
    )
    
    # Should have 2 evidence entries (one for approve, one for reject)
    assert len(evidence_entries) >= 2
    
    approved_evidence = [e for e in evidence_entries if e.event_type == "application_approved"]
    rejected_evidence = [e for e in evidence_entries if e.event_type == "application_rejected"]
    
    assert len(approved_evidence) >= 1
    assert len(rejected_evidence) >= 1
    
    # Verify evidence entry details
    approve_entry = approved_evidence[0]
    assert approve_entry.job_id == "job-1"
    assert approve_entry.job_title == "Software Engineer"
    assert approve_entry.company == "Tech Corp"
    assert approve_entry.platform == "indeed"
    assert approve_entry.source == "claimant_dashboard"


def test_batch_approve_applications_invalid_job_id(
    client, test_user, auth_headers, jobs_queue_file
):
    """Test batch approval with invalid job ID."""
    response = client.post(
        "/api/claimant/applications/batch",
        json={
            "applications": [
                {"jobId": "nonexistent-job", "action": "approve"},
            ]
        },
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["approved"] == 0  # Invalid job ID is skipped


def test_batch_approve_applications_unauthorized(client, jobs_queue_file):
    """Test batch approval without authentication."""
    response = client.post(
        "/api/claimant/applications/batch",
        json={
            "applications": [
                {"jobId": "job-1", "action": "approve"},
            ]
        },
    )
    
    assert response.status_code == 401  # Unauthorized


def test_batch_approve_applications_wrong_role(client):
    """Test batch approval with non-claimant role."""
    # Create a coach user
    store = get_auth_store()
    coach_user = store.create_user(
        email="coach@example.com",
        password="coachpass123",
        role=Role.COACH,
        display_name="Test Coach",
    )
    
    # Login as coach
    login_response = client.post(
        "/auth/login",
        json={"email": coach_user.email, "password": "coachpass123"},
    )
    cookies = login_response.cookies
    headers = {"Cookie": f"autoapply_session={cookies.get('autoapply_session')}"}
    
    # Try to access claimant endpoint
    response = client.post(
        "/api/claimant/applications/batch",
        json={
            "applications": [
                {"jobId": "job-1", "action": "approve"},
            ]
        },
        headers=headers,
    )
    
    assert response.status_code == 403  # Forbidden

