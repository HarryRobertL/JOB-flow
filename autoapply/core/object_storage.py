"""
Object storage abstraction for artifacts and exports (Phase 6).

When OBJECT_STORE_BUCKET (and optionally OBJECT_STORE_REGION) are set,
artifacts and exports can be stored in S3-compatible storage. URLs are
returned via pre-signed GET or a proxy endpoint that enforces tenant/claimant
scope. When not configured, artifacts remain file-based under data/artifacts.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


def object_storage_enabled() -> bool:
    """True if OBJECT_STORE_BUCKET is set (and optional boto3 available)."""
    if not os.environ.get("OBJECT_STORE_BUCKET"):
        return False
    try:
        import boto3  # noqa: F401
        return True
    except ImportError:
        return False


def upload_artifact(
    *,
    tenant_id: str,
    claimant_id: str,
    key: str,
    body: bytes,
    content_type: str = "application/octet-stream",
) -> Optional[str]:
    """
    Upload an artifact to object storage. Key should be tenant/claimant-scoped
    (e.g. {tenant_id}/{claimant_id}/artifacts/{filename}).
    Returns the key or a URL; None if not configured or upload fails.
    """
    if not object_storage_enabled():
        return None
    try:
        import boto3
        bucket = os.environ.get("OBJECT_STORE_BUCKET")
        region = os.environ.get("OBJECT_STORE_REGION") or "eu-west-2"
        s3 = boto3.client("s3", region_name=region)
        full_key = f"{tenant_id}/{claimant_id}/artifacts/{key}"
        s3.put_object(
            Bucket=bucket,
            Key=full_key,
            Body=body,
            ContentType=content_type,
        )
        return full_key
    except Exception:
        return None


def get_presigned_url(
    *,
    tenant_id: str,
    claimant_id: str,
    key: str,
    expires_in: int = 3600,
) -> Optional[str]:
    """
    Return a pre-signed GET URL for an artifact, or None.
    Caller must enforce that the key belongs to tenant_id/claimant_id.
    """
    if not object_storage_enabled():
        return None
    try:
        import boto3
        bucket = os.environ.get("OBJECT_STORE_BUCKET")
        region = os.environ.get("OBJECT_STORE_REGION") or "eu-west-2"
        s3 = boto3.client("s3", region_name=region)
        full_key = key if key.startswith(f"{tenant_id}/") else f"{tenant_id}/{claimant_id}/artifacts/{key}"
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": full_key},
            ExpiresIn=expires_in,
        )
        return url
    except Exception:
        return None


def artifact_local_path(label: str) -> Path:
    """Return local path for artifact when object store is disabled (existing behavior)."""
    from datetime import datetime, UTC
    ts = datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")
    outdir = Path("data/artifacts")
    outdir.mkdir(parents=True, exist_ok=True)
    return outdir / f"{ts}_{label}"
