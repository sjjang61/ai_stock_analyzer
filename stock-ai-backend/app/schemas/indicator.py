from pydantic import BaseModel
from typing import Optional
from datetime import date


class IndicatorResponse(BaseModel):
    stock_id: str
    date: date
    rsi_14: Optional[float] = None
    rsi_9: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    sma_5: Optional[float] = None
    sma_20: Optional[float] = None
    sma_60: Optional[float] = None
    sma_120: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_width: Optional[float] = None
    bb_pct: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    atr_14: Optional[float] = None
    obv: Optional[float] = None
    volume_sma: Optional[float] = None

    model_config = {"from_attributes": True}
