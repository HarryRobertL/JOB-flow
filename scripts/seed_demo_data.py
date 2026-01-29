#!/usr/bin/env python3
"""Seed demo data for development and pilot deployment.

Creates sample job queue items and evidence entries for instant demo.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

# Get project root (assuming script is in scripts/ directory)
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
JOBS_QUEUE_PATH = DATA_DIR / "jobs_queue.json"
EVIDENCE_LOG_PATH = DATA_DIR / "evidence.csv"
LOGS_PATH = DATA_DIR / "logs.csv"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)


def seed_jobs_queue():
    """Seed jobs queue with sample job listings."""
    sample_jobs = [
        {
            "id": "job_demo_1",
            "title": "Retail Assistant",
            "company": "Tesco",
            "location": "Cardiff",
            "platform": "indeed",
            "status": "pending",
            "url": "https://indeed.com/viewjob?jk=demo1",
            "discoveredAt": (datetime.now() - timedelta(hours=2)).isoformat(),
            "salary": "£22,000 - £24,000",
        },
        {
            "id": "job_demo_2",
            "title": "Customer Service Advisor",
            "company": "BT Group",
            "location": "Cardiff",
            "platform": "greenhouse",
            "status": "pending",
            "url": "https://boards.greenhouse.io/bt/jobs/demo2",
            "discoveredAt": (datetime.now() - timedelta(hours=5)).isoformat(),
            "salary": "£23,000 - £25,000",
        },
        {
            "id": "job_demo_3",
            "title": "Office Administrator",
            "company": "Cardiff Council",
            "location": "Cardiff",
            "platform": "indeed",
            "status": "pending",
            "url": "https://indeed.com/viewjob?jk=demo3",
            "discoveredAt": (datetime.now() - timedelta(days=1)).isoformat(),
            "salary": "£24,000 - £26,000",
        },
        {
            "id": "job_demo_4",
            "title": "Warehouse Operative",
            "company": "Amazon",
            "location": "Cardiff",
            "platform": "indeed",
            "status": "approved",
            "url": "https://indeed.com/viewjob?jk=demo4",
            "discoveredAt": (datetime.now() - timedelta(days=2)).isoformat(),
            "approvedAt": (datetime.now() - timedelta(hours=1)).isoformat(),
            "salary": "£21,000 - £23,000",
        },
        {
            "id": "job_demo_5",
            "title": "Team Member",
            "company": "Marks & Spencer",
            "location": "Cardiff",
            "platform": "indeed",
            "status": "applied",
            "url": "https://indeed.com/viewjob?jk=demo5",
            "discoveredAt": (datetime.now() - timedelta(days=3)).isoformat(),
            "appliedAt": (datetime.now() - timedelta(days=2)).isoformat(),
            "salary": "£22,000 - £24,000",
        },
    ]

    # Load existing jobs if file exists
    existing_jobs = []
    if JOBS_QUEUE_PATH.exists():
        try:
            with open(JOBS_QUEUE_PATH, "r") as f:
                existing_jobs = json.load(f)
        except (json.JSONDecodeError, IOError):
            existing_jobs = []

    # Merge with existing jobs (avoid duplicates by ID)
    existing_ids = {job.get("id") for job in existing_jobs}
    new_jobs = [job for job in sample_jobs if job["id"] not in existing_ids]
    
    if new_jobs:
        all_jobs = existing_jobs + new_jobs
        with open(JOBS_QUEUE_PATH, "w") as f:
            json.dump(all_jobs, f, indent=2)
        print(f"✓ Added {len(new_jobs)} demo jobs to queue")
    else:
        print("✓ Jobs queue already contains demo data")


def seed_evidence_log():
    """Seed evidence log with sample compliance entries."""
    # Check if evidence log exists and has headers
    has_headers = False
    if EVIDENCE_LOG_PATH.exists():
        with open(EVIDENCE_LOG_PATH, "r") as f:
            first_line = f.readline().strip()
            if first_line.startswith("timestamp"):
                has_headers = True

    # Sample evidence entries
    sample_entries = [
        {
            "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
            "claimant_id": "claimant@example.com",
            "event_type": "application_approved",
            "description": "Approved application to Retail Assistant at Tesco via indeed",
            "source": "claimant_dashboard",
            "job_id": "job_demo_1",
            "job_title": "Retail Assistant",
            "company": "Tesco",
            "platform": "indeed",
            "url": "https://indeed.com/viewjob?jk=demo1",
        },
        {
            "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
            "claimant_id": "claimant@example.com",
            "event_type": "application_submitted",
            "description": "Submitted application to Team Member at Marks & Spencer via indeed",
            "source": "automation_engine",
            "job_id": "job_demo_5",
            "job_title": "Team Member",
            "company": "Marks & Spencer",
            "platform": "indeed",
            "url": "https://indeed.com/viewjob?jk=demo5",
        },
    ]

    # Write headers if needed
    if not has_headers:
        headers = [
            "timestamp",
            "claimant_id",
            "event_type",
            "description",
            "source",
            "job_id",
            "job_title",
            "company",
            "platform",
            "url",
        ]
        with open(EVIDENCE_LOG_PATH, "w") as f:
            f.write(",".join(headers) + "\n")
        print("✓ Created evidence log with headers")

    # Append sample entries
    with open(EVIDENCE_LOG_PATH, "a") as f:
        for entry in sample_entries:
            row = [
                entry.get("timestamp", ""),
                entry.get("claimant_id", ""),
                entry.get("event_type", ""),
                f'"{entry.get("description", "").replace('"', '""')}"',  # Escape quotes
                entry.get("source", ""),
                entry.get("job_id", ""),
                f'"{entry.get("job_title", "").replace('"', '""')}"',
                f'"{entry.get("company", "").replace('"', '""')}"',
                entry.get("platform", ""),
                entry.get("url", ""),
            ]
            f.write(",".join(row) + "\n")
    
    print(f"✓ Added {len(sample_entries)} demo evidence entries")


def seed_application_logs():
    """Seed application logs with sample activity."""
    # Check if logs file exists and has headers
    has_headers = False
    if LOGS_PATH.exists():
        with open(LOGS_PATH, "r") as f:
            first_line = f.readline().strip()
            if first_line.startswith("ts"):
                has_headers = True

    # Sample log entries
    sample_logs = [
        {
            "ts": (datetime.now() - timedelta(days=2)).isoformat(),
            "site": "indeed",
            "job_title": "Team Member",
            "company": "Marks & Spencer",
            "url": "https://indeed.com/viewjob?jk=demo5",
            "status": "applied",
            "notes": "Successfully applied via Easy Apply",
        },
        {
            "ts": (datetime.now() - timedelta(days=1)).isoformat(),
            "site": "indeed",
            "job_title": "Retail Assistant",
            "company": "Tesco",
            "url": "https://indeed.com/viewjob?jk=demo1",
            "status": "approved",
            "notes": "Approved for application",
        },
    ]

    # Write headers if needed
    if not has_headers:
        headers = ["ts", "site", "job_title", "company", "url", "status", "notes"]
        with open(LOGS_PATH, "w") as f:
            f.write(",".join(headers) + "\n")
        print("✓ Created application logs with headers")

    # Append sample entries
    with open(LOGS_PATH, "a") as f:
        for log in sample_logs:
            row = [
                log.get("ts", ""),
                log.get("site", ""),
                f'"{log.get("job_title", "").replace('"', '""')}"',
                f'"{log.get("company", "").replace('"', '""')}"',
                log.get("url", ""),
                log.get("status", ""),
                f'"{log.get("notes", "").replace('"', '""')}"',
            ]
            f.write(",".join(row) + "\n")
    
    print(f"✓ Added {len(sample_logs)} demo application log entries")


def main():
    """Main function to seed all demo data."""
    print("=" * 60)
    print("Seeding Demo Data for AutoApplyer AI")
    print("=" * 60)
    print()

    try:
        seed_jobs_queue()
        seed_evidence_log()
        seed_application_logs()
        
        print()
        print("=" * 60)
        print("✓ Demo data seeding complete!")
        print("=" * 60)
        print()
        print("You can now:")
        print("  - View jobs in the Jobs page (/app/jobs)")
        print("  - See activity in the Dashboard (/app/dashboard)")
        print("  - Check compliance logs in the Compliance page (/app/compliance)")
        print()
        print("Note: Make sure you've run seed_users.py first to create test users.")
    except Exception as e:
        print(f"✗ Error seeding demo data: {e}")
        raise


if __name__ == "__main__":
    main()

