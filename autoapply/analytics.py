"""Analytics helper for processing AutoApplyer logs."""

import csv
from datetime import datetime
from pathlib import Path
from typing import Any

from autoapply.core.storage import normalize_status_for_read


def load_logs(log_path: str | Path = "data/logs.csv") -> list[dict]:
    """
    Load logs from CSV file into a list of dictionaries.
    
    Args:
        log_path: Path to the logs CSV file
        
    Returns:
        List of log entries as dictionaries
    """
    log_file = Path(log_path)
    if not log_file.exists():
        return []
    
    logs = []
    with log_file.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            logs.append(row)
    
    return logs


def summary_by_week(logs: list[dict]) -> dict:
    """
    Group logs by ISO week and by site, counting statuses.
    
    Args:
        logs: List of log dictionaries with 'ts', 'site', and 'status' fields
        
    Returns:
        Dictionary structure:
        {
            "2025-W46": {
                "total": 42,
                "by_status": {"applied": 30, "skip": 10, "error": 2},
                "by_site": {
                    "indeed": {"applied": 25, "skip": 8, "error": 1},
                    "greenhouse": {...},
                },
            },
            ...
        }
    """
    summary: dict[str, Any] = {}
    
    for log_entry in logs:
        # Parse timestamp
        ts_str = log_entry.get("ts", "")
        if not ts_str:
            continue
        
        try:
            # Parse ISO format timestamp
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            # Get ISO week (YYYY-Www format)
            year, week, _ = dt.isocalendar()
            week_key = f"{year}-W{week:02d}"
        except (ValueError, AttributeError):
            # Skip entries with invalid timestamps
            continue
        
        site = log_entry.get("site", "unknown")
        status = normalize_status_for_read(log_entry.get("status", "unknown"))

        # Initialize week entry if needed
        if week_key not in summary:
            summary[week_key] = {
                "total": 0,
                "by_status": {},
                "by_site": {},
            }
        
        # Update totals
        summary[week_key]["total"] += 1
        
        # Update by_status
        if status not in summary[week_key]["by_status"]:
            summary[week_key]["by_status"][status] = 0
        summary[week_key]["by_status"][status] += 1
        
        # Update by_site
        if site not in summary[week_key]["by_site"]:
            summary[week_key]["by_site"][site] = {}
        if status not in summary[week_key]["by_site"][site]:
            summary[week_key]["by_site"][site][status] = 0
        summary[week_key]["by_site"][site][status] += 1
    
    return summary


def export_summary_csv(
    summary: dict | None = None,
    log_path: str | Path = "data/logs.csv",
    out_path: str | Path = "data/summary.csv",
) -> None:
    """
    Export a flattened summary table to CSV for DWP Excel import.
    
    Args:
        summary: Optional pre-computed summary dict. If None, loads from log_path.
        log_path: Path to logs CSV if summary is not provided
        out_path: Path to write the summary CSV
    """
    if summary is None:
        logs = load_logs(log_path)
        summary = summary_by_week(logs)
    
    # Flatten the summary into rows
    rows = []
    for week, data in sorted(summary.items()):
        # Overall row for the week
        rows.append({
            "week": week,
            "site": "all",
            "total": data["total"],
            "applied": data["by_status"].get("applied", 0),
            "skipped": data["by_status"].get("skipped", 0),
            "error": data["by_status"].get("error", 0),
        })

        # Per-site rows
        for site, site_data in sorted(data["by_site"].items()):
            site_total = sum(site_data.values())
            rows.append({
                "week": week,
                "site": site,
                "total": site_total,
                "applied": site_data.get("applied", 0),
                "skipped": site_data.get("skipped", 0),
                "error": site_data.get("error", 0),
            })
    
    # Write CSV
    out_file = Path(out_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    
    fieldnames = ["week", "site", "total", "applied", "skipped", "error"]
    with out_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    """Print a simple text summary when run as a module."""
    logs = load_logs()
    
    if not logs:
        print("No logs found in data/logs.csv")
        exit(0)
    
    summary = summary_by_week(logs)
    
    print(f"\nAutoApplyer Analytics Summary")
    print("=" * 60)
    print(f"Total log entries: {len(logs)}")
    print(f"Weeks covered: {len(summary)}")
    print()
    
    # Print per-week summary
    for week in sorted(summary.keys()):
        data = summary[week]
        print(f"Week {week}:")
        print(f"  Total: {data['total']}")
        print(f"  By status:")
        for status, count in sorted(data["by_status"].items()):
            print(f"    {status}: {count}")
        print(f"  By site:")
        for site, site_data in sorted(data["by_site"].items()):
            site_total = sum(site_data.values())
            print(f"    {site}: {site_total} total", end="")
            status_parts = []
            for status, count in sorted(site_data.items()):
                status_parts.append(f"{status}={count}")
            if status_parts:
                print(f" ({', '.join(status_parts)})")
            else:
                print()
        print()
    
    # Export summary CSV
    export_summary_csv(summary=summary)
    print(f"Summary CSV exported to: data/summary.csv")

