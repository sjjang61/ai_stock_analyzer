from sqlalchemy import Column, BigInteger, String, Float, Integer, Boolean, Enum, DateTime, func
from app.database import Base
from app.models.stock import MarketType


class Portfolio(Base):
    __tablename__ = "portfolios"

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker      = Column(String(20), nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    market      = Column(Enum(MarketType), nullable=False)
    is_domestic = Column(Boolean, default=True)
    avg_price   = Column(Float, nullable=False)   # 평단가
    quantity    = Column(Integer, nullable=False)  # 수량
    memo        = Column(String(500))              # 메모 (선택)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
