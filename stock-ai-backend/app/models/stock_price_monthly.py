from sqlalchemy import Column, String, Integer, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class StockPriceMonthly(Base):
    """
    월별 OHLCV 집계
    일봉 데이터를 resample('MS')으로 집계하여 저장
    """
    __tablename__ = "stock_prices_monthly"
    __table_args__ = (UniqueConstraint("stock_id", "year", "month"),)

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id    = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    year        = Column(Integer, nullable=False)
    month       = Column(Integer, nullable=False)             # 1~12
    open        = Column(Float)
    high        = Column(Float)
    low         = Column(Float)
    close       = Column(Float, nullable=False)
    volume      = Column(BigInteger)

    # 월봉 이동평균 (캔들 기준)
    sma_3m      = Column(Float)    # 3개월
    sma_6m      = Column(Float)    # 6개월
    sma_12m     = Column(Float)    # 12개월 (1년)
    sma_24m     = Column(Float)    # 24개월 (2년)

    stock = relationship("Stock")
