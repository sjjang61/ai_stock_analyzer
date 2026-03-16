from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class StockBase(BaseModel):
    id: str
    name: str
    name_en: Optional[str] = None
    market: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    is_domestic: bool = True
    is_active: bool = True


class StockResponse(StockBase):
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StockDetailResponse(StockBase):
    current_price: Optional[float] = None
    change_amount: Optional[float] = None
    change_pct: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    market_cap: Optional[float] = None
    per: Optional[float] = None
    pbr: Optional[float] = None
    dividend_yield: Optional[float] = None

    model_config = {"from_attributes": True}


class StockPriceResponse(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float
    volume: Optional[int] = None
    adj_close: Optional[float] = None

    model_config = {"from_attributes": True}


class StockSearchResponse(BaseModel):
    id: str
    name: str
    market: str
    is_domestic: bool = True
