import asyncio
import logging
from datetime import datetime, timedelta

from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.stock import Stock, MarketType
from app.models.stock_price import StockPrice
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.services.indicator_service import IndicatorService
from sqlalchemy import select

logger = logging.getLogger(__name__)
krx_svc = KRXService()
yf_svc  = YFinanceService()
ind_svc = IndicatorService()

# 관리할 해외 종목 티커 목록
OVERSEAS_TICKERS = [
    "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL",
    "AMZN", "META", "JPM", "V", "WMT",
]


@celery_app.task(name="app.tasks.data_collector.collect_domestic_prices", bind=True)
def collect_domestic_prices(self):
    """pykrx로 전체 국내 종목 주가 수집"""
    try:
        asyncio.run(_collect_domestic())
        return {"status": "success", "time": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"국내 데이터 수집 실패: {e}")
        self.retry(exc=e, countdown=300, max_retries=3)


@celery_app.task(name="app.tasks.data_collector.collect_overseas_prices", bind=True)
def collect_overseas_prices(self):
    """yfinance로 해외 종목 주가 수집"""
    try:
        asyncio.run(_collect_overseas())
        return {"status": "success", "time": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"해외 데이터 수집 실패: {e}")
        self.retry(exc=e, countdown=300, max_retries=3)


@celery_app.task(name="app.tasks.data_collector.recalculate_indicators")
def recalculate_indicators():
    """ta 라이브러리로 모든 종목 지표 재계산"""
    try:
        asyncio.run(_recalculate_all_indicators())
        return {"status": "success", "time": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"지표 재계산 실패: {e}")
        return {"status": "error", "error": str(e)}


async def _collect_domestic():
    """국내 KOSPI/KOSDAQ 주가 DB 저장"""
    async with AsyncSessionLocal() as db:
        today = datetime.now().strftime("%Y%m%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")

        for market in ["KOSPI", "KOSDAQ"]:
            try:
                stocks = await krx_svc.get_stock_list(market)
                for stock_data in stocks[:50]:  # 처음 50개만 (데모)
                    ticker = stock_data["id"]
                    try:
                        # 주가 수집
                        df = await krx_svc.fetch_ohlcv(ticker, yesterday, today)
                        if df.empty:
                            continue

                        for idx, row in df.iterrows():
                            price = StockPrice(
                                stock_id=ticker,
                                date=idx,
                                open=float(row["open"]) if row.get("open") else None,
                                high=float(row["high"]) if row.get("high") else None,
                                low=float(row["low"]) if row.get("low") else None,
                                close=float(row["close"]),
                                volume=int(row["volume"]) if row.get("volume") else None,
                            )
                            db.add(price)
                    except Exception:
                        continue

                await db.commit()
                logger.info(f"{market} 데이터 수집 완료")
            except Exception as e:
                logger.error(f"{market} 수집 실패: {e}")


async def _collect_overseas():
    """해외 종목 주가 DB 저장"""
    async with AsyncSessionLocal() as db:
        for ticker in OVERSEAS_TICKERS:
            try:
                df = yf_svc.fetch_ohlcv(ticker, period="5d")
                if df.empty:
                    continue

                for idx, row in df.iterrows():
                    price = StockPrice(
                        stock_id=ticker,
                        date=idx.date(),
                        open=float(row["open"]) if row.get("open") else None,
                        high=float(row["high"]) if row.get("high") else None,
                        low=float(row["low"]) if row.get("low") else None,
                        close=float(row["close"]),
                        volume=int(row["volume"]) if row.get("volume") else None,
                    )
                    db.add(price)

                await db.commit()
            except Exception as e:
                logger.error(f"{ticker} 해외 수집 실패: {e}")


async def _recalculate_all_indicators():
    """모든 종목의 지표 재계산"""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Stock).where(Stock.is_active == True).limit(100))
        stocks = result.scalars().all()

        for stock in stocks:
            try:
                if stock.is_domestic:
                    start = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
                    end = datetime.now().strftime("%Y%m%d")
                    df = await krx_svc.fetch_ohlcv(stock.id, start, end)
                else:
                    df = yf_svc.fetch_ohlcv(stock.id, period="1y")

                if df is not None and not df.empty:
                    await ind_svc.calculate_and_save(db, stock.id, df)
            except Exception as e:
                logger.error(f"{stock.id} 지표 재계산 실패: {e}")
