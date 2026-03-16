from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, Enum, DateTime, func
from app.database import Base
import enum


class StrategyType(str, enum.Enum):
    RSI_OVERSOLD       = "RSI_OVERSOLD"
    RSI_DIVERGENCE     = "RSI_DIVERGENCE"
    MACD_CROSSOVER     = "MACD_CROSSOVER"
    BB_BREAKOUT        = "BB_BREAKOUT"
    GOLDEN_CROSS       = "GOLDEN_CROSS"
    MOMENTUM           = "MOMENTUM"
    VOLUME_SURGE       = "VOLUME_SURGE"
    AI_COMPOSITE       = "AI_COMPOSITE"


class Strategy(Base):
    __tablename__ = "strategies"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), nullable=False)
    type        = Column(Enum(StrategyType), nullable=False)
    description = Column(Text)
    params      = Column(JSON)        # {"rsi_threshold": 30, ...}
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
