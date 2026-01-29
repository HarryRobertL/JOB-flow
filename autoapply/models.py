"""Pydantic models for job listings, applications, and evidence tracking."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class JobListing(BaseModel):
    """Model for a discovered job listing."""
    
    id: str = Field(..., description="Unique identifier for the job listing")
    platform: str = Field(..., description="Platform name (indeed, greenhouse, lever)")
    job_title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Job location")
    url: Optional[str] = Field(None, description="URL to the job listing")
    status: str = Field(default="pending", description="Status: pending, approved, rejected, applied, skip, error")
    discovered_at: Optional[str] = Field(None, description="ISO timestamp when job was discovered")
    salary: Optional[str] = Field(None, description="Salary information if available")
    description: Optional[str] = Field(None, description="Job description if available")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "job-123",
                "platform": "indeed",
                "job_title": "Software Engineer",
                "company": "Tech Corp",
                "location": "London, UK",
                "url": "https://indeed.com/viewjob?jk=123",
                "status": "pending",
                "discovered_at": "2025-01-15T10:00:00Z",
            }
        }


class JobApplication(BaseModel):
    """Model for a job application record."""
    
    job_id: str = Field(..., description="Reference to the job listing ID")
    claimant_id: str = Field(..., description="Claimant identifier (user ID or name)")
    status: Literal["pending", "approved", "rejected", "applied", "skip", "error"] = Field(
        ..., description="Application status"
    )
    applied_at: Optional[str] = Field(None, description="ISO timestamp when application was submitted")
    platform: str = Field(..., description="Platform name")
    notes: Optional[str] = Field(None, description="Additional notes or error messages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "job-123",
                "claimant_id": "claimant-1",
                "status": "applied",
                "applied_at": "2025-01-15T10:30:00Z",
                "platform": "indeed",
                "notes": "Application submitted successfully",
            }
        }


class EvidenceEntry(BaseModel):
    """Model for evidence entries in the audit log."""
    
    claimant_id: str = Field(..., description="Claimant identifier")
    event_type: Literal[
        "job_discovered",
        "application_approved",
        "application_rejected",
        "application_submitted",
        "application_failed",
        "evidence_exported",
    ] = Field(..., description="Type of evidence event")
    description: str = Field(..., description="Human-readable description of the event")
    timestamp: str = Field(..., description="ISO timestamp of the event")
    week_start_date: Optional[str] = Field(None, description="ISO date (YYYY-MM-DD) of the Monday for this week")
    source: str = Field(..., description="Source system or user action that generated the evidence")
    # Additional context fields
    job_id: Optional[str] = Field(None, description="Related job ID if applicable")
    job_title: Optional[str] = Field(None, description="Related job title if applicable")
    company: Optional[str] = Field(None, description="Related company name if applicable")
    platform: Optional[str] = Field(None, description="Platform name if applicable")
    url: Optional[str] = Field(None, description="Job URL if applicable")
    
    class Config:
        json_schema_extra = {
            "example": {
                "claimant_id": "claimant-1",
                "event_type": "application_submitted",
                "description": "Applied to Software Engineer at Tech Corp via Indeed",
                "timestamp": "2025-01-15T10:30:00Z",
                "week_start_date": "2025-01-13",
                "source": "automation_engine",
                "job_id": "job-123",
                "job_title": "Software Engineer",
                "company": "Tech Corp",
                "platform": "indeed",
                "url": "https://indeed.com/viewjob?jk=123",
            }
        }


class WeeklyComplianceSummary(BaseModel):
    """Model for weekly compliance aggregation."""
    
    week_start_date: str = Field(..., description="ISO date (YYYY-MM-DD) of the Monday for this week")
    week_end_date: str = Field(..., description="ISO date (YYYY-MM-DD) of the Sunday for this week")
    applications_count: int = Field(0, description="Number of applications submitted this week")
    required_count: int = Field(10, description="Required number of applications per week")
    missed_requirement: bool = Field(False, description="Whether the required count was not met")
    evidence_entries: list[EvidenceEntry] = Field(default_factory=list, description="Evidence entries for this week")
    
    class Config:
        json_schema_extra = {
            "example": {
                "week_start_date": "2025-01-13",
                "week_end_date": "2025-01-19",
                "applications_count": 12,
                "required_count": 10,
                "missed_requirement": False,
                "evidence_entries": [],
            }
        }

