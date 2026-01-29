"""
Worker process that consumes automation run jobs from the queue.

Run with: python -m autoapply.jobs.worker

Requires DATABASE_URL. Polls for pending runs respecting concurrency limits
(one run per claimant, configurable per tenant). Sets env and invokes the
engine; updates run status on completion/failure.
"""

import logging
import os
import sys
from datetime import datetime, timezone

from autoapply.db.repo import (
    db_enabled,
    get_next_pending_run,
    set_automation_run_status,
)
from autoapply.run import main as run_engine

logger = logging.getLogger(__name__)

# Concurrency: max 1 run per claimant, max 10 per tenant
MAX_RUNS_PER_CLAIMANT = 1
MAX_RUNS_PER_TENANT = 10
POLL_INTERVAL_SECONDS = 5


def run_worker_loop(
    *,
    max_per_claimant: int = MAX_RUNS_PER_CLAIMANT,
    max_per_tenant: int = MAX_RUNS_PER_TENANT,
    poll_interval: float = POLL_INTERVAL_SECONDS,
) -> None:
    """Loop: take next pending run, set env, run engine, update status."""
    if not db_enabled():
        logger.error("DATABASE_URL is not set; worker cannot run.")
        sys.exit(1)

    logger.info(
        "Worker started (max_per_claimant=%s, max_per_tenant=%s, poll_interval=%s)",
        max_per_claimant,
        max_per_tenant,
        poll_interval,
    )

    while True:
        try:
            job = get_next_pending_run(
                max_per_claimant=max_per_claimant,
                max_per_tenant=max_per_tenant,
            )
            if job is None:
                import time
                time.sleep(poll_interval)
                continue

            run_id, tenant_id, claimant_id = job
            now = datetime.now(timezone.utc)
            from autoapply.db.repo import claim_automation_run
            if not claim_automation_run(run_id, started_at=now):
                continue  # Another worker claimed it

            os.environ["AUTOAPPLYER_TENANT_ID"] = tenant_id
            os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id

            try:
                exit_code = run_engine(headless=True, dry_run=False)
                status = "completed" if exit_code == 0 else "failed"
            except Exception as e:
                logger.exception("Run %s failed: %s", run_id, e)
                status = "failed"
            finally:
                set_automation_run_status(
                    run_id,
                    status,
                    finished_at=datetime.now(timezone.utc),
                )
        except KeyboardInterrupt:
            logger.info("Worker stopped by user.")
            break
        except Exception as e:
            logger.exception("Worker loop error: %s", e)
            import time
            time.sleep(poll_interval)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    run_worker_loop()


if __name__ == "__main__":
    main()
