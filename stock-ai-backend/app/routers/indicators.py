from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.deps import get_db
from app.models.stock_indicator import StockIndicator

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


@router.get("/{ticker}")
async def get_indicators(
    ticker: str,
    limit: int = Query(60),
    db: AsyncSession = Depends(get_db),
):
    """종목 기술적 지표 조회"""
    result = await db.execute(
        select(StockIndicator)
        .where(StockIndicator.stock_id == ticker)
        .order_by(desc(StockIndicator.date))
        .limit(limit)
    )
    rows = result.scalars().all()

    if not rows:
        raise HTTPException(status_code=404, detail=f"지표 데이터 없음: {ticker}")

    return [
        {
            "stock_id":    row.stock_id,
            "date":        str(row.date),
            "rsi_14":      row.rsi_14,
            "rsi_9":       row.rsi_9,
            "macd":        row.macd,
            "macd_signal": row.macd_signal,
            "macd_hist":   row.macd_hist,
            "sma_5":       row.sma_5,
            "sma_20":      row.sma_20,
            "sma_60":      row.sma_60,
            "sma_120":     row.sma_120,
            "bb_upper":    row.bb_upper,
            "bb_middle":   row.bb_middle,
            "bb_lower":    row.bb_lower,
            "bb_pct":      row.bb_pct,
            "stoch_k":     row.stoch_k,
            "stoch_d":     row.stoch_d,
            "atr_14":      row.atr_14,
            "obv":         row.obv,
        }
        for row in reversed(rows)
    ]


@router.get("/{ticker}/latest")
async def get_latest_indicator(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """최신 기술적 지표 1건"""
    result = await db.execute(
        select(StockIndicator)
        .where(StockIndicator.stock_id == ticker)
        .order_by(desc(StockIndicator.date))
        .limit(1)
    )
    row = result.scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail=f"지표 데이터 없음: {ticker}")

    return {
        "stock_id": row.stock_id,
        "date": str(row.date),
        "rsi_14": row.rsi_14, "rsi_9": row.rsi_9,
        "macd": row.macd, "macd_signal": row.macd_signal,
        "sma_5": row.sma_5, "sma_20": row.sma_20, "sma_60": row.sma_60, "sma_120": row.sma_120,
        "bb_upper": row.bb_upper, "bb_middle": row.bb_middle, "bb_lower": row.bb_lower,
        "bb_pct": row.bb_pct,
        "stoch_k": row.stoch_k, "stoch_d": row.stoch_d, "atr_14": row.atr_14,
    }
