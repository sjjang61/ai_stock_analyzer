from sqlalchemy import Column, String, Date, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class StockIndicator(Base):
    __tablename__ = "stock_indicators"
    __table_args__ = (UniqueConstraint("stock_id", "date"),)

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id   = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    date       = Column(Date, nullable=False, index=True)

    # 모멘텀 지표
    rsi_14     = Column(Float)    # RSI (14일)
    rsi_9      = Column(Float)    # RSI (9일)

    # 추세 지표
    macd       = Column(Float)    # MACD Line
    macd_signal= Column(Float)    # Signal Line
    macd_hist  = Column(Float)    # Histogram

    # 이동평균
    sma_5      = Column(Float)
    sma_20     = Column(Float)
    sma_60     = Column(Float)
    sma_120    = Column(Float)
    ema_12     = Column(Float)
    ema_26     = Column(Float)

    # 볼린저 밴드
    bb_upper   = Column(Float)
    bb_middle  = Column(Float)
    bb_lower   = Column(Float)
    bb_width   = Column(Float)
    bb_pct     = Column(Float)    # %B

    # 기타
    stoch_k    = Column(Float)    # Stochastic %K
    stoch_d    = Column(Float)    # Stochastic %D
    atr_14     = Column(Float)    # Average True Range
    obv        = Column(Float)    # On-Balance Volume
    volume_sma = Column(Float)    # 거래량 이동평균

    stock = relationship("Stock", back_populates="indicators")
