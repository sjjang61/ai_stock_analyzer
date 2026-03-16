from datetime import datetime, timedelta

from fastapi import APIRouter, Query
from pykrx import stock as krx
import yfinance as yf

from app.services.ai_service import AIService
from app.llm.factory import get_llm_provider
from app.config import settings

router = APIRouter(prefix="/api", tags=["analysis"])
ai_svc = AIService()

# 해외 주요 종목 이름 (fast_info에는 name 없음)
_NASDAQ_NAMES = {
    "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "NVIDIA",
    "GOOGL": "Alphabet", "AMZN": "Amazon", "META": "Meta",
    "TSLA": "Tesla", "AMD": "AMD", "AVGO": "Broadcom", "ORCL": "Oracle",
}


def _fetch_domestic_top(market: str) -> list[dict]:
    """KRX에서 거래대금 상위 10개 종목 + 등락률 실시간 조회"""
    today = datetime.now()
    for days_back in range(0, 6):
        try:
            date_str = (today - timedelta(days=days_back)).strftime("%Y%m%d")
            df = krx.get_market_ohlcv_by_ticker(date_str, market=market)
            if df is None or df.empty:
                continue

            sort_col = next((c for c in ["거래대금", "거래량"] if c in df.columns), None)
            top_df = df.nlargest(10, sort_col) if sort_col else df.head(10)

            result = []
            for ticker, row in top_df.iterrows():
                try:
                    name = krx.get_market_ticker_name(str(ticker))
                    change_pct = float(row.get("등락률", 0))
                    close = float(row.get("종가", 0))
                    result.append({
                        "ticker": str(ticker),
                        "name": name,
                        "close": close,
                        "change_pct": round(change_pct, 2),
                    })
                except Exception:
                    continue
            if result:
                return result
        except Exception:
            continue
    return []


def _fetch_overseas_top() -> list[dict]:
    """yfinance fast_info로 NASDAQ 주요 종목 현재가·등락률 조회"""
    tickers = list(_NASDAQ_NAMES.keys())
    result = []
    for ticker in tickers:
        try:
            fi = yf.Ticker(ticker).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            prev  = float(getattr(fi, "previous_close", 0) or 0)
            change_pct = ((price - prev) / prev * 100) if prev else 0.0
            result.append({
                "ticker": ticker,
                "name": _NASDAQ_NAMES[ticker],
                "close": round(price, 2),
                "change_pct": round(change_pct, 2),
            })
        except Exception:
            result.append({
                "ticker": ticker,
                "name": _NASDAQ_NAMES[ticker],
                "close": 0,
                "change_pct": 0.0,
            })
    return result


@router.get("/market/insight")
async def get_market_insight(
    market: str = Query("KOSPI"),
):
    """시장 전반 AI 인사이트 — 실제 시장 데이터 기반"""
    try:
        if market in ("KOSPI", "KOSDAQ"):
            top_stocks = _fetch_domestic_top(market)
        else:
            top_stocks = _fetch_overseas_top()
    except Exception:
        top_stocks = []

    try:
        insight = await ai_svc.generate_market_insight(market, top_stocks)
        return {"market": market, "insight": insight}
    except Exception as e:
        return {"market": market, "insight": f"시장 인사이트를 불러올 수 없습니다: {str(e)}"}


@router.get("/llm/current")
async def get_current_llm():
    """현재 사용 중인 LLM 정보 조회"""
    provider = get_llm_provider()
    return {
        "llm_type":    settings.LLM_TYPE,
        "model":       getattr(provider, "model", getattr(provider, "model_name", "unknown")),
        "provider":    provider.provider_name,
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens":  settings.LLM_MAX_TOKENS,
    }
