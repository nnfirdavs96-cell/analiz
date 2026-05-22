from datetime import datetime

from loguru import logger

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import SyncJob


@celery_app.task
def heartbeat() -> str:
    logger.info("celery heartbeat at {}", datetime.utcnow().isoformat())
    return "ok"


@celery_app.task
def run_sync_job(job_id: int) -> dict:
    db = SessionLocal()
    try:
        job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
        if not job:
            return {"status": "not_found", "job_id": job_id}
        # Placeholder for actual sync logic per source_type
        job.last_run_at = datetime.utcnow()
        job.last_status = "success"
        db.commit()
        return {"status": "ok", "job_id": job_id}
    except Exception as e:
        logger.exception("sync job failed")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
