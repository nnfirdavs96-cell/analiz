from celery import Celery

from app.config import settings

celery_app = Celery(
    "analiz",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "ping-every-hour": {
            "task": "app.tasks.heartbeat",
            "schedule": 3600.0,
        },
    },
)
