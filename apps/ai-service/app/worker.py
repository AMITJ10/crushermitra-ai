from celery import Celery

from app.config import settings

celery_app = Celery("crushermitra_ai", broker=settings.redis_url, backend=settings.redis_url)


@celery_app.task(name="ai.log_tool_call")
def log_tool_call(tool_name: str, organisation_id: str) -> dict[str, str]:
    return {"tool_name": tool_name, "organisation_id": organisation_id, "status": "queued"}

