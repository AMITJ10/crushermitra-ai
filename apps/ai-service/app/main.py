from fastapi import FastAPI

from app.routers import health, tools

app = FastAPI(
    title="CrusherMitra AI Service",
    version="0.1.0",
    description="AI, retrieval, anomaly and industrial data-processing service.",
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(tools.router, prefix="/api/v1/tools", tags=["ai-tools"])

