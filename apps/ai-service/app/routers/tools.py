from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class SafeTool(BaseModel):
    name: str
    mode: str = Field(pattern="^(read_only|draft_action)$")
    description: str
    requires_human_approval: bool


SAFE_TOOLS = [
    SafeTool(
        name="inventory_summary",
        mode="read_only",
        description="Summarise organisation-scoped inventory and stock alerts.",
        requires_human_approval=False,
    ),
    SafeTool(
        name="draft_customer_order",
        mode="draft_action",
        description="Create a draft customer order for salesperson approval.",
        requires_human_approval=True,
    ),
    SafeTool(
        name="weighment_anomaly_review",
        mode="read_only",
        description="Explain weighment anomaly flags without blocking operations.",
        requires_human_approval=False,
    ),
]


@router.get("/safe-registry", response_model=list[SafeTool])
def safe_tool_registry() -> list[SafeTool]:
    return SAFE_TOOLS

