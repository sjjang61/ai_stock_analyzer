from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime


class RecommendationResponse(BaseModel):
    id: int
    stock_id: str
    strategy_id: int
    signal: str
    score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_detail: Optional[str] = None
    indicators: Optional[Any] = None
    price_at: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    confidence: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AnalysisRequest(BaseModel):
    ticker: str
    is_domestic: bool = True
