from sqlalchemy import Column, String, Enum, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class MarketType(str, enum.Enum):
    KOSPI = "KOSPI"
    KOSDAQ = "KOSDAQ"
    NYSE = "NYSE"
    NASDAQ = "NASDAQ"
    AMEX = "AMEX"
    CRYPTO = "CRYPTO"

# DB에 이미 테이블이 존재하는 경우 아래 SQL을 수동 실행:
# ALTER TABLE stocks
#   MODIFY market ENUM('KOSPI','KOSDAQ','NYSE','NASDAQ','AMEX','CRYPTO') NOT NULL;


class Stock(Base):
    __tablename__ = "stocks"

    id          = Column(String(20), primary_key=True)   # 티커 (005930, AAPL)
    name        = Column(String(100), nullable=False)
    name_en     = Column(String(100))
    market      = Column(Enum(MarketType), nullable=False)
    sector      = Column(String(100))
    industry    = Column(String(100))
    is_domestic = Column(Boolean, default=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    prices      = relationship("StockPrice", back_populates="stock", lazy="select")
    indicators  = relationship("StockIndicator", back_populates="stock", lazy="select")
