from sqlalchemy import Column, Integer, String, Text, Float, JSON, Enum, DateTime, ForeignKey, func
from app.database import Base
import enum


class SignalType(str, enum.Enum):
    BUY   = "BUY"
    SELL  = "SELL"
    HOLD  = "HOLD"
    WATCH = "WATCH"


class Recommendation(Base):
    __tablename__ = "recommendations"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    stock_id     = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    strategy_id  = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    signal       = Column(Enum(SignalType), nullable=False)
    score        = Column(Float)              # 신호 강도 (0~100)
    ai_summary   = Column(Text)              # AI 요약
    ai_detail    = Column(Text)              # AI 상세 분석
    indicators   = Column(JSON)              # 당시 지표 스냅샷
    price_at     = Column(Float)             # 추천 시점 가격
    target_price = Column(Float)             # AI 목표가
    stop_loss    = Column(Float)             # 손절가
    confidence   = Column(Float)             # AI 신뢰도 (0~1)
    created_at   = Column(DateTime, server_default=func.now(), index=True)
