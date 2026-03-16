from sqlalchemy import Column, String, Date, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class StockPriceWeekly(Base):
    """
    매주 월요일 기준으로 해당 주의 OHLCV 집계
    일봉 데이터를 resample('W-MON')으로 집계하여 저장
    """
    __tablename__ = "stock_prices_weekly"
    __table_args__ = (UniqueConstraint("stock_id", "week_start"),)

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id    = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    week_start  = Column(Date, nullable=False, index=True)   # 해당 주 월요일
    week_end    = Column(Date)                               # 해당 주 금요일
    open        = Column(Float)
    high        = Column(Float)
    low         = Column(Float)
    close       = Column(Float, nullable=False)
    volume      = Column(BigInteger)

    # 주봉 이동평균 (캔들 기준)
    sma_5w      = Column(Float)    # 5주 이동평균 (약 1개월)
    sma_13w     = Column(Float)    # 13주 이동평균 (약 3개월)
    sma_26w     = Column(Float)    # 26주 이동평균 (약 6개월)
    sma_52w     = Column(Float)    # 52주 이동평균 (약 1년)

    stock = relationship("Stock")
