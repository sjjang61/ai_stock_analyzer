from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class StrategyResponse(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str] = None
    params: Optional[Any] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StrategyCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    params: Optional[Any] = None
