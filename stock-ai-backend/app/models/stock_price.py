from sqlalchemy import Column, String, Date, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class StockPrice(Base):
    __tablename__ = "stock_prices"
    __table_args__ = (UniqueConstraint("stock_id", "date"),)

    id        = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id  = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    date      = Column(Date, nullable=False, index=True)
    open      = Column(Float)
    high      = Column(Float)
    low       = Column(Float)
    close     = Column(Float, nullable=False)
    volume    = Column(BigInteger)
    adj_close = Column(Float)

    stock = relationship("Stock", back_populates="prices")
