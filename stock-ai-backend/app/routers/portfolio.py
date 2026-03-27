import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.deps import get_db
from app.models.portfolio import Portfolio
from app.models.stock import MarketType
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.services.candlestick_service import CandlestickService
from app.services.strategy_service import StrategyService
from app.llm.factory import get_llm_provider
from app.config import settings
from app.utils.indicators import calculate_all_indicators
from app.utils.helpers import get_date_range

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
krx_svc   = KRXService()
yf_svc    = YFinanceService()
cs_svc    = CandlestickService()
strat_svc = StrategyService()


# ── Pydantic 스키마 ─────────────────────────────────────────────────────────────

class PortfolioCreate(BaseModel):
    ticker:      str
    name:        str
    market:      str          # KOSPI | KOSDAQ | NYSE | NASDAQ | AMEX
    is_domestic: bool = True
    avg_price:   float
    quantity:    int
    memo:        Optional[str] = None
    group_name:  Optional[str] = "기본"


class PortfolioUpdate(BaseModel):
    avg_price:  Optional[float] = None
    quantity:   Optional[int]   = None
    memo:       Optional[str]   = None
    group_name: Optional[str]   = None


# ── 헬퍼 ────────────────────────────────────────────────────────────────────────

def _row_to_dict(p: Portfolio) -> dict:
    return {
        "id":          p.id,
        "ticker":      p.ticker,
        "name":        p.name,
        "market":      p.market.value,
        "is_domestic": p.is_domestic,
        "avg_price":   p.avg_price,
        "quantity":    p.quantity,
        "total_cost":  round(p.avg_price * p.quantity, 2),
        "group_name":  p.group_name or "기본",
        "memo":        p.memo,
        "created_at":  p.created_at.isoformat() if p.created_at else None,
        "updated_at":  p.updated_at.isoformat() if p.updated_at else None,
    }


def _safe(val) -> float | None:
    try:
        if val is None:
            return None
        f = float(val)
        return None if f != f else f
    except (TypeError, ValueError):
        return None


# ── 현재가 일괄 조회 ─────────────────────────────────────────────────────────────

@router.get("/prices")
async def get_portfolio_prices(db: AsyncSession = Depends(get_db)):
    """포트폴리오 전체 종목의 현재가 일괄 조회 → {ticker: price|null}"""
    result = await db.execute(select(Portfolio))
    items = result.scalars().all()
    if not items:
        return {}

    today    = datetime.now().strftime("%Y%m%d")
    week_ago = (datetime.now() - timedelta(days=14)).strftime("%Y%m%d")

    prices: dict[str, float | None] = {}

    for item in items:
        try:
            if item.is_domestic:
                df = await krx_svc.fetch_ohlcv(item.ticker, week_ago, today)
                if df is not None and not df.empty:
                    prices[item.ticker] = float(df.iloc[-1]["close"])
                else:
                    prices[item.ticker] = None
            else:
                info = yf_svc.get_stock_info(item.ticker)
                prices[item.ticker] = info.get("current_price")
        except Exception:
            prices[item.ticker] = None

    return prices


# ── CRUD ────────────────────────────────────────────────────────────────────────

@router.get("/")
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    """내 종목 목록"""
    result = await db.execute(select(Portfolio).order_by(Portfolio.created_at.desc()))
    items = result.scalars().all()
    return [_row_to_dict(p) for p in items]


@router.post("/")
async def add_portfolio(body: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    """종목 추가 (평단가 + 수량)"""
    try:
        market_enum = MarketType(body.market)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 시장: {body.market}")

    item = Portfolio(
        ticker=body.ticker.upper(),
        name=body.name,
        market=market_enum,
        is_domestic=body.is_domestic,
        avg_price=body.avg_price,
        quantity=body.quantity,
        group_name=body.group_name or "기본",
        memo=body.memo,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _row_to_dict(item)


@router.put("/{item_id}")
async def update_portfolio(
    item_id: int,
    body: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
):
    """평단가 / 수량 / 메모 수정"""
    result = await db.execute(select(Portfolio).where(Portfolio.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")

    if body.avg_price is not None:
        item.avg_price = body.avg_price
    if body.quantity is not None:
        item.quantity = body.quantity
    if body.memo is not None:
        item.memo = body.memo
    if body.group_name is not None:
        item.group_name = body.group_name

    await db.commit()
    await db.refresh(item)
    return _row_to_dict(item)


@router.delete("/{item_id}")
async def delete_portfolio(item_id: int, db: AsyncSession = Depends(get_db)):
    """종목 삭제"""
    result = await db.execute(select(Portfolio).where(Portfolio.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")

    await db.delete(item)
    await db.commit()
    return {"ok": True}


# ── LLM 분석 ────────────────────────────────────────────────────────────────────

@router.post("/{item_id}/analyze")
async def analyze_portfolio_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """
    보유 종목에 대한 LLM 분석
    - 현재가 / 수익률 계산
    - 기술적 지표 + 전략 시그널
    - 매도 / 추가매수 / 보유 의견 제시
    """
    result = await db.execute(select(Portfolio).where(Portfolio.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")

    try:
        # 1. 가격 데이터 수집
        if item.is_domestic:
            start, end = get_date_range("2y")
            df = await krx_svc.fetch_ohlcv(item.ticker, start, end)
            fundamental = await krx_svc.get_fundamental(item.ticker)
        else:
            df = yf_svc.fetch_ohlcv(item.ticker, period="2y")
            fundamental = None

        if df is None or df.empty or len(df) < 30:
            raise HTTPException(status_code=404, detail="주가 데이터 부족")

        # 2. 지표 계산
        df = calculate_all_indicators(df.copy())
        payload = cs_svc.build_analysis_payload(df)
        strategy_signals = strat_svc.run_all(df)

        latest = df.iloc[-1]
        current_price = _safe(latest.get("close")) or 0

        indicators = {
            "rsi_14":      _safe(latest.get("rsi_14")),
            "macd":        _safe(latest.get("macd")),
            "macd_signal": _safe(latest.get("macd_signal")),
            "bb_pct":      _safe(latest.get("bb_pct")),
            "atr_14":      _safe(latest.get("atr_14")),
            "sma_5":       _safe(latest.get("sma_5")),
            "sma_20":      _safe(latest.get("sma_20")),
            "sma_60":      _safe(latest.get("sma_60")),
            "sma_120":     _safe(latest.get("sma_120")),
        }

        # 3. 보유 현황 계산
        avg_price   = item.avg_price
        quantity    = item.quantity
        total_cost  = avg_price * quantity
        current_val = current_price * quantity
        pnl_amount  = current_val - total_cost
        pnl_pct     = (pnl_amount / total_cost * 100) if total_cost else 0

        # 4. 포트폴리오 전용 LLM 분석
        analysis = await _analyze_with_llm(
            ticker=item.ticker,
            name=item.name,
            market=item.market.value,
            avg_price=avg_price,
            quantity=quantity,
            current_price=current_price,
            pnl_amount=pnl_amount,
            pnl_pct=pnl_pct,
            indicators=indicators,
            strategy_signals=strategy_signals,
            candlestick_payload=payload,
            fundamental=fundamental,
        )

        return {
            "ticker":        item.ticker,
            "name":          item.name,
            "market":        item.market.value,
            "avg_price":     avg_price,
            "quantity":      quantity,
            "total_cost":    round(total_cost, 2),
            "current_price": current_price,
            "current_value": round(current_val, 2),
            "pnl_amount":    round(pnl_amount, 2),
            "pnl_pct":       round(pnl_pct, 2),
            "indicators":    indicators,
            "analysis":      analysis,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _analyze_with_llm(
    ticker: str,
    name: str,
    market: str,
    avg_price: float,
    quantity: int,
    current_price: float,
    pnl_amount: float,
    pnl_pct: float,
    indicators: dict,
    strategy_signals: list,
    candlestick_payload: dict,
    fundamental: dict | None,
) -> dict:
    """포트폴리오 보유 종목 LLM 분석 — 매도/추가매수/보유 의견"""
    llm = get_llm_provider()

    daily   = candlestick_payload.get("daily", [])
    weekly  = candlestick_payload.get("weekly", [])
    monthly = candlestick_payload.get("monthly", [])
    latest_daily   = daily[-1]   if daily   else {}
    latest_weekly  = weekly[-1]  if weekly  else {}
    latest_monthly = monthly[-1] if monthly else {}

    pnl_sign   = "▲ +" if pnl_pct >= 0 else "▼ "
    is_profit  = pnl_pct >= 0
    currency   = "원" if market in ("KOSPI", "KOSDAQ") else "$"

    prompt = f"""
# 보유 종목 분석 요청: {name} ({ticker}) — {market}

---

## 1. 나의 보유 현황
| 항목 | 값 |
|------|-----|
| 평균 매입가 | {avg_price:,.0f}{currency} |
| 보유 수량 | {quantity:,}주 |
| 총 매입금액 | {avg_price * quantity:,.0f}{currency} |
| 현재가 | {current_price:,.0f}{currency} |
| 현재 평가금액 | {current_price * quantity:,.0f}{currency} |
| 평가 손익 | {pnl_sign}{abs(pnl_amount):,.0f}{currency} ({pnl_sign}{abs(pnl_pct):.2f}%) |
| 현재 상태 | {"수익" if is_profit else "손실"} 구간 |

---

## 2. 이동평균선 현황 (일봉)
| MA | 값 | 현재가 대비 |
|----|-----|------------|
| 5일선  | {indicators.get('sma_5')}  | {'위' if (current_price or 0) > (indicators.get('sma_5') or 0) else '아래'} |
| 20일선 | {indicators.get('sma_20')} | {'위' if (current_price or 0) > (indicators.get('sma_20') or 0) else '아래'} |
| 60일선 | {indicators.get('sma_60')} | {'위' if (current_price or 0) > (indicators.get('sma_60') or 0) else '아래'} |
| 120일선 | {indicators.get('sma_120')} | {'위' if (current_price or 0) > (indicators.get('sma_120') or 0) else '아래'} |
| 평단가  | {avg_price} | {'현재가 아래 (수익)' if current_price > avg_price else '현재가 위 (손실)'} |

---

## 3. 주봉 (최근 8주)
```json
{json.dumps(weekly[-8:], ensure_ascii=False, indent=2)}
```

---

## 4. 월봉 (최근 6개월)
```json
{json.dumps(monthly[-6:], ensure_ascii=False, indent=2)}
```

---

## 5. 일봉 (최근 20거래일)
```json
{json.dumps(daily[-20:], ensure_ascii=False, indent=2)}
```

---

## 6. 기술적 지표 (최신)
| 지표 | 값 | 해석 |
|------|----|------|
| RSI(14) | {indicators.get('rsi_14', 'N/A')} | {'과매수(70↑)' if (indicators.get('rsi_14') or 0) > 70 else '과매도(30↓)' if (indicators.get('rsi_14') or 100) < 30 else '중립'} |
| MACD    | {indicators.get('macd', 'N/A')} | {'골든크로스' if (indicators.get('macd') or 0) > (indicators.get('macd_signal') or 0) else '데드크로스'} |
| 볼린저밴드 %B | {indicators.get('bb_pct', 'N/A')} | {'상단 돌파' if (indicators.get('bb_pct') or 0) > 0.9 else '하단 접근' if (indicators.get('bb_pct') or 1) < 0.1 else '중립'} |
| ATR(14) | {indicators.get('atr_14', 'N/A')} | — |

---

## 7. 전략 시그널
```json
{json.dumps(strategy_signals, ensure_ascii=False, indent=2)}
```

{f'''---

## 8. 펀더멘털
- PER: {fundamental.get("per")} / PBR: {fundamental.get("pbr")}
- EPS: {fundamental.get("eps")} / 배당수익률: {fundamental.get("div")}%
''' if fundamental else ''}

---

## 분석 지침
당신은 이 종목을 보유하고 있는 투자자를 위해 아래 3가지 관점에서 의견을 제시해야 합니다:

1. **매도 시점**: 언제, 어떤 조건에서 매도하는 것이 좋을지 (목표가, 손절가, 기술적 이유)
2. **추가 매수**: 추가 매수가 유리한 시점과 조건 (물타기 vs 불타기, 지지선 기준)
3. **보유 전략**: 현재 그대로 보유하는 것이 맞는지, 보유 기간 추천

현재 {"수익" if is_profit else "손실"} 구간임을 감안하여 현실적이고 구체적인 의견을 제시하세요.

## 응답 형식 주의사항
- 숫자 필드(target_price, stop_loss, add_price 등)는 반드시 실제 숫자(정수 또는 소수)만 입력하세요.
- 현재가({current_price:,.0f}{currency})를 기준으로 현실적인 가격을 계산하세요.
- "숫자", "N/A", "없음" 등의 텍스트를 숫자 필드에 쓰지 마세요.
- confidence는 0.0~1.0 사이의 소수(예: 0.72)를 입력하세요.
- action은 SELL/ADD/HOLD 중 하나, risk_level은 LOW/MEDIUM/HIGH 중 하나를 선택하세요.
- JSON만 응답하고 다른 설명은 쓰지 마세요.

다음 JSON 형식으로만 응답하세요:
{{
  "action": "HOLD",
  "confidence": 0.72,
  "sell_strategy": {{
    "target_price": {int(current_price * 1.10)},
    "stop_loss": {int(current_price * 0.93)},
    "timing": "매도 시점 조건을 2~3문장으로 설명",
    "reason": "매도 근거를 설명"
  }},
  "add_strategy": {{
    "add_price": {int(current_price * 0.95)},
    "condition": "추가매수 조건을 2~3문장으로 설명",
    "reason": "추가매수 근거를 설명"
  }},
  "hold_strategy": {{
    "hold_period": "1~3개월",
    "reason": "보유 근거를 설명"
  }},
  "summary": "종합 의견을 3~5줄로 설명",
  "risk_level": "MEDIUM",
  "key_points": ["핵심포인트1", "핵심포인트2", "핵심포인트3"],
  "llm_provider": "{llm.provider_name}"
}}

위 예시의 숫자값들을 실제 분석 결과에 맞는 값으로 교체하여 응답하세요.
"""

    system = """당신은 10년 경력의 전문 주식 애널리스트입니다.
보유 종목의 평단가, 수익률, 기술적 지표를 종합하여
'언제 팔아야 하는지', '추가 매수가 좋은지', '계속 보유해야 하는지'에 대해
현실적이고 구체적인 투자 의견을 제시합니다.
반드시 요청된 JSON 형식으로만 응답하세요."""

    import re
    response = await llm.complete(
        prompt=prompt,
        system=system,
        max_tokens=settings.LLM_MAX_TOKENS,
        temperature=settings.LLM_TEMPERATURE,
    )

    # ── 강화된 JSON 파싱 (ai_service._parse_json_response 와 동일한 로직) ──
    text = response.text
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        raw = json_match.group()
        cleaned = raw
        cleaned = re.sub(r':\s*"?숫자"?',         ': null', cleaned)
        cleaned = re.sub(r':\s*"?없음"?',          ': null', cleaned)
        cleaned = re.sub(r':\s*"?(N/A|n/a|NA)"?', ': null', cleaned)
        def _range_avg(m):
            try:
                return f': {(float(m.group(1)) + float(m.group(2))) / 2}'
            except ValueError:
                return m.group(0)
        cleaned = re.sub(r':\s*([\d.]+)~([\d.]+)', _range_avg, cleaned)
        for _ in range(4):
            cleaned = re.sub(r'(?<=[0-9]),(?=[0-9]{3}(?:[^0-9]|$))', '', cleaned)
        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)

        for candidate in (cleaned, raw):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    return {
        "action": "HOLD",
        "confidence": 0.5,
        "summary": response.text.strip()[:300],
        "risk_level": "MEDIUM",
    }
