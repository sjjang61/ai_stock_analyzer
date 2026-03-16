from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.deps import get_db
from app.models.recommendation import Recommendation, SignalType
from app.models.strategy import Strategy
from app.models.stock import Stock, MarketType
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.services.candlestick_service import CandlestickService
from app.services.strategy_service import StrategyService
from app.services.ai_service import AIService
from app.utils.helpers import get_date_range
from app.utils.indicators import calculate_all_indicators
from datetime import datetime, date
from typing import Optional
import pandas as pd

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])
krx_svc = KRXService()
yf_svc  = YFinanceService()
cs_svc  = CandlestickService()
strat_svc = StrategyService()
ai_svc  = AIService()


@router.get("/")
async def get_recommendations(
    strategy: str = Query(None),
    signal: str = Query(None),
    market: str = Query("ALL"),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
):
    """AI 추천 종목 목록"""
    query = select(Recommendation, Stock, Strategy).join(
        Stock, Recommendation.stock_id == Stock.id
    ).join(
        Strategy, Recommendation.strategy_id == Strategy.id
    ).order_by(desc(Recommendation.created_at))

    if signal:
        query = query.where(Recommendation.signal == SignalType(signal))
    if strategy:
        query = query.where(Strategy.type == strategy)
    if market != "ALL":
        query = query.where(Stock.market == market)

    query = query.limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id":           rec.id,
            "stock_id":     rec.stock_id,
            "stock_name":   stock.name,
            "market":       stock.market.value,
            "strategy_name": strat.name,
            "signal":       rec.signal.value,
            "score":        rec.score,
            "confidence":   rec.confidence,
            "ai_summary":   rec.ai_summary,
            "price_at":     rec.price_at,
            "target_price": rec.target_price,
            "stop_loss":    rec.stop_loss,
            "created_at":   rec.created_at.isoformat() if rec.created_at else None,
        }
        for rec, stock, strat in rows
    ]


@router.get("/today")
async def get_today_recommendations(db: AsyncSession = Depends(get_db)):
    """오늘의 AI 추천 종목 (전략별 TOP 5)"""
    today = date.today()
    query = select(Recommendation, Stock, Strategy).join(
        Stock, Recommendation.stock_id == Stock.id
    ).join(
        Strategy, Recommendation.strategy_id == Strategy.id
    ).where(
        func.date(Recommendation.created_at) == today
    ).order_by(desc(Recommendation.score)).limit(30)

    result = await db.execute(query)
    rows = result.all()

    grouped: dict[str, list] = {}
    for rec, stock, strat in rows:
        key = strat.type.value
        if key not in grouped:
            grouped[key] = []
        if len(grouped[key]) < 5:
            grouped[key].append({
                "id":          rec.id,
                "stock_id":    rec.stock_id,
                "stock_name":  stock.name,
                "signal":      rec.signal.value,
                "score":       rec.score,
                "confidence":  rec.confidence,
                "ai_summary":  rec.ai_summary,
                "price_at":    rec.price_at,
                "target_price":rec.target_price,
            })
    return grouped


@router.post("/analyze/{ticker}")
async def analyze_stock_now(
    ticker: str,
    is_domestic: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """실시간 단일 종목 AI 분석"""
    try:
        # 1. 데이터 수집
        if is_domestic:
            start, end = get_date_range("2y")
            df = await krx_svc.fetch_ohlcv(ticker, start, end)
            fundamental = await krx_svc.get_fundamental(ticker)
            market = "KOSPI"
            stock_name = ticker
        else:
            df = yf_svc.fetch_ohlcv(ticker, period="2y")
            info = yf_svc.get_stock_info(ticker)
            fundamental = None
            market = "NASDAQ"
            stock_name = info.get("name", ticker)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="주가 데이터 없음")

        # 2. 지표 계산
        df = calculate_all_indicators(df.copy())

        # 3. 캔들스틱 페이로드 생성
        payload = cs_svc.build_analysis_payload(df)

        # 4. 전략 시그널
        strategy_signals = strat_svc.run_all(df)

        # 5. 최신 지표
        latest = df.iloc[-1]
        indicators = {
            "rsi_14":     _safe(latest.get("rsi_14")),
            "rsi_9":      _safe(latest.get("rsi_9")),
            "macd":       _safe(latest.get("macd")),
            "macd_signal":_safe(latest.get("macd_signal")),
            "bb_pct":     _safe(latest.get("bb_pct")),
            "stoch_k":    _safe(latest.get("stoch_k")),
            "stoch_d":    _safe(latest.get("stoch_d")),
            "atr_14":     _safe(latest.get("atr_14")),
        }

        # 6. AI 분석
        analysis = await ai_svc.analyze_stock(
            stock_name=stock_name,
            ticker=ticker,
            market=market,
            candlestick_payload=payload,
            indicators=indicators,
            strategy_signals=strategy_signals,
            fundamental=fundamental,
        )

        # 7. DB 저장
        result = await db.execute(select(Strategy).where(Strategy.type == "AI_COMPOSITE").limit(1))
        ai_strategy = result.scalar_one_or_none()

        if ai_strategy:
            await _ensure_stock(db, ticker, stock_name, market, is_domestic)
            short = analysis.get("short_term", {})
            rec = Recommendation(
                stock_id=ticker,
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
            await db.commit()

        return {
            "ticker":     ticker,
            "stock_name": stock_name,
            "market":     market,
            "analysis":   analysis,
            "strategy_signals": strategy_signals,
            "indicators": indicators,
            "current_price": _safe(latest.get("close")),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


DEFAULT_TICKERS = [
    ("AAPL",   False, "Apple Inc.",    "NASDAQ"),
    ("MSFT",   False, "Microsoft",     "NASDAQ"),
    ("NVDA",   False, "NVIDIA",        "NASDAQ"),
    ("005930", True,  "삼성전자",       "KOSPI"),
    ("000660", True,  "SK하이닉스",    "KOSPI"),
]


@router.post("/run")
async def run_recommendations(
    tickers: Optional[list[str]] = None,
    db: AsyncSession = Depends(get_db),
):
    """AI 추천 수동 실행 — tickers 미지정 시 인기 종목 기본 분석"""
    result = await db.execute(select(Strategy).where(Strategy.type == "AI_COMPOSITE").limit(1))
    ai_strategy = result.scalar_one_or_none()
    if not ai_strategy:
        raise HTTPException(
            status_code=400,
            detail="AI_COMPOSITE 전략 없음. GET /api/strategies/seed 를 먼저 실행하세요.",
        )

    # tickers 지정 없으면 기본 인기 종목 사용
    if not tickers:
        targets = DEFAULT_TICKERS
    else:
        # 지정된 ticker는 is_domestic=False(해외)로 처리 (필요 시 확장)
        targets = [(t, False, t, "NASDAQ") for t in tickers]

    succeeded, failed = [], []
    for ticker, is_domestic, stock_name, market in targets:
        try:
            if is_domestic:
                start, end = get_date_range("2y")
                df = await krx_svc.fetch_ohlcv(ticker, start, end)
                fundamental = await krx_svc.get_fundamental(ticker)
            else:
                df = yf_svc.fetch_ohlcv(ticker, period="2y")
                info = yf_svc.get_stock_info(ticker)
                fundamental = None
                stock_name = info.get("name", stock_name)

            if df is None or df.empty or len(df) < 30:
                failed.append({"ticker": ticker, "reason": "데이터 부족"})
                continue

            df = calculate_all_indicators(df.copy())
            payload = cs_svc.build_analysis_payload(df)
            strategy_signals = strat_svc.run_all(df)
            latest = df.iloc[-1]
            indicators = {
                "rsi_14":      _safe(latest.get("rsi_14")),
                "macd":        _safe(latest.get("macd")),
                "macd_signal": _safe(latest.get("macd_signal")),
                "bb_pct":      _safe(latest.get("bb_pct")),
                "atr_14":      _safe(latest.get("atr_14")),
            }

            analysis = await ai_svc.analyze_stock(
                stock_name=stock_name,
                ticker=ticker,
                market=market,
                candlestick_payload=payload,
                indicators=indicators,
                strategy_signals=strategy_signals,
                fundamental=fundamental,
            )

            await _ensure_stock(db, ticker, stock_name, market, is_domestic)
            short = analysis.get("short_term", {})
            rec = Recommendation(
                stock_id=ticker,
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
            succeeded.append({"ticker": ticker, "signal": analysis.get("signal")})

        except Exception as e:
            failed.append({"ticker": ticker, "reason": str(e)})

    await db.commit()
    return {"succeeded": succeeded, "failed": failed}


async def _ensure_stock(
    db: AsyncSession,
    ticker: str,
    name: str,
    market: str,
    is_domestic: bool,
) -> None:
    """stocks 테이블에 ticker 가 없으면 삽입 (있으면 건너뜀)"""
    result = await db.execute(select(Stock).where(Stock.id == ticker))
    if result.scalar_one_or_none() is None:
        try:
            market_enum = MarketType(market)
        except ValueError:
            market_enum = MarketType.NASDAQ
        db.add(Stock(
            id=ticker,
            name=name,
            market=market_enum,
            is_domestic=is_domestic,
            is_active=True,
        ))
        await db.flush()


def _safe(val) -> float | None:
    """None-safe float 변환 — 쉼표 포함 숫자 문자열·텍스트 플레이스홀더도 처리"""
    try:
        if val is None:
            return None
        if isinstance(val, str):
            stripped = val.replace(",", "").strip()
            if not stripped or stripped.lower() in ("n/a", "없음", "null", "숫자", "-"):
                return None
            val = stripped
        f = float(val)
        return None if f != f else f   # NaN 제외
    except (TypeError, ValueError):
        return None
