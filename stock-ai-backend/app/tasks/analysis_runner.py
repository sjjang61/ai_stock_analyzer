import asyncio
import logging
from datetime import datetime

from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.stock import Stock
from app.models.strategy import Strategy
from app.models.recommendation import Recommendation, SignalType
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.services.candlestick_service import CandlestickService
from app.services.strategy_service import StrategyService
from app.services.ai_service import AIService
from app.utils.indicators import calculate_all_indicators
from sqlalchemy import select

logger = logging.getLogger(__name__)
krx_svc   = KRXService()
yf_svc    = YFinanceService()
cs_svc    = CandlestickService()
strat_svc = StrategyService()
ai_svc    = AIService()


@celery_app.task(name="app.tasks.analysis_runner.run_all_strategies")
def run_all_strategies():
    """전략 분석 실행 + AI 추천 저장"""
    try:
        asyncio.run(_run_strategies())
        return {"status": "success", "time": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"전략 실행 실패: {e}")
        return {"status": "error", "error": str(e)}


async def _run_strategies():
    """활성화된 종목에 대해 전략 분석 수행"""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Stock).where(Stock.is_active == True).limit(20))
        stocks = result.scalars().all()

        ai_strategy_result = await db.execute(
            select(Strategy).where(Strategy.type == "AI_COMPOSITE").limit(1)
        )
        ai_strategy = ai_strategy_result.scalar_one_or_none()
        if not ai_strategy:
            logger.warning("AI_COMPOSITE 전략 없음 — /api/strategies/seed 먼저 실행")
            return

        for stock in stocks:
            try:
                if stock.is_domestic:
                    df = await krx_svc.fetch_ohlcv(
                        stock.id,
                        (datetime.now().replace(year=datetime.now().year - 2)).strftime("%Y%m%d"),
                        datetime.now().strftime("%Y%m%d"),
                    )
                    fundamental = await krx_svc.get_fundamental(stock.id)
                    market = stock.market.value
                else:
                    df = yf_svc.fetch_ohlcv(stock.id, period="2y")
                    fundamental = None
                    market = stock.market.value

                if df is None or df.empty or len(df) < 30:
                    continue

                df = calculate_all_indicators(df)
                payload = cs_svc.build_analysis_payload(df)
                strategy_signals = strat_svc.run_all(df)

                latest = df.iloc[-1]
                indicators = {
                    "rsi_14":     _safe(latest.get("rsi_14")),
                    "macd":       _safe(latest.get("macd")),
                    "macd_signal":_safe(latest.get("macd_signal")),
                    "bb_pct":     _safe(latest.get("bb_pct")),
                    "atr_14":     _safe(latest.get("atr_14")),
                }

                analysis = await ai_svc.analyze_stock(
                    stock_name=stock.name,
                    ticker=stock.id,
                    market=market,
                    candlestick_payload=payload,
                    indicators=indicators,
                    strategy_signals=strategy_signals,
                    fundamental=fundamental,
                )

                short = analysis.get("short_term", {})
                rec = Recommendation(
                    stock_id=stock.id,
                    strategy_id=ai_strategy.id,
                    signal=SignalType(analysis.get("signal", "HOLD")),
                    score=float(analysis.get("confidence", 0.5)) * 100,
                    ai_summary=analysis.get("summary", "")[:500],
                    ai_detail=str(analysis)[:2000],
                    indicators=indicators,
                    price_at=_safe(latest.get("close")),
                    target_price=_safe(short.get("sell_price") or analysis.get("mid_term", {}).get("target_price")),
                    stop_loss=_safe(short.get("stop_loss")),
                    confidence=_safe(analysis.get("confidence")),
                )
                db.add(rec)
                logger.info(f"분석 완료: {stock.id} → {analysis.get('signal')}")

            except Exception as e:
                logger.error(f"{stock.id} 분석 실패: {e}")

        await db.commit()


def _safe(val) -> float | None:
    try:
        if val is None:
            return None
        f = float(val)
        return None if f != f else f
    except (TypeError, ValueError):
        return None
