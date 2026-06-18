from fastapi import APIRouter

router = APIRouter()


@router.get("")
def health() -> dict[str, str]:
    return {"service": "crushermitra-ai-service", "status": "ok", "version": "0.1.0"}


@router.get("/ready")
def readiness() -> dict[str, str]:
    return {"service": "crushermitra-ai-service", "status": "ready"}

