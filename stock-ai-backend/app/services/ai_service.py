import json
import re
from app.llm.factory import get_llm_provider
from app.config import settings

SYSTEM_PROMPT = """당신은 10년 경력의 전문 주식 애널리스트입니다.
일봉, 주봉, 월봉 차트 데이터와 이동평균선을 종합하여 단기/중기/장기 관점에서
균형 잡힌 투자 의견을 제시합니다.
반드시 요청된 JSON 형식으로만 응답하세요."""


class AIService:
    def __init__(self):
        self.llm = get_llm_provider()

    async def analyze_stock(
        self,
        stock_name: str,
        ticker: str,
        market: str,
        candlestick_payload: dict,
        indicators: dict,
        strategy_signals: list[dict],
        fundamental: dict = None,
    ) -> dict:
        """일봉 / 주봉 / 월봉 + 이동평균 데이터를 활용한 LLM 종합 분석"""
        daily   = candlestick_payload.get("daily",   [])
        weekly  = candlestick_payload.get("weekly",  [])
        monthly = candlestick_payload.get("monthly", [])

        latest_daily   = daily[-1]   if daily   else {}
        latest_weekly  = weekly[-1]  if weekly  else {}
        latest_monthly = monthly[-1] if monthly else {}

        current_price = latest_daily.get("close", 0) or 0

        prompt = f"""
# 종목 분석 요청: {stock_name} ({ticker}) — {market}

---

## 1. 현재가 및 주요 가격 정보
| 구분 | 값 |
|------|-----|
| 현재가 (일봉 종가) | {latest_daily.get('close')} |
| 금일 시가 | {latest_daily.get('open')} |
| 금일 고가 | {latest_daily.get('high')} |
| 금일 저가 | {latest_daily.get('low')} |
| 금일 거래량 | {latest_daily.get('volume')} |

---

## 2. 이동평균선 현황 (일봉 기준)
| MA | 값 | 현재가 대비 |
|----|-----|------------|
| 5일선  (단기) | {latest_daily.get('sma_5')}  | {'위' if latest_daily.get('close', 0) > (latest_daily.get('sma_5') or 0) else '아래'} |
| 20일선 (중단기) | {latest_daily.get('sma_20')} | {'위' if latest_daily.get('close', 0) > (latest_daily.get('sma_20') or 0) else '아래'} |
| 60일선 (중기) | {latest_daily.get('sma_60')} | {'위' if latest_daily.get('close', 0) > (latest_daily.get('sma_60') or 0) else '아래'} |
| 120일선 (장기) | {latest_daily.get('sma_120')} | {'위' if latest_daily.get('close', 0) > (latest_daily.get('sma_120') or 0) else '아래'} |

---

## 3. 주봉 데이터 (최근 26주)
> 주봉 이동평균: 5주={latest_weekly.get('sma_5w')} / 13주={latest_weekly.get('sma_13w')} / 26주={latest_weekly.get('sma_26w')} / 52주={latest_weekly.get('sma_52w')}

```json
{json.dumps(weekly[-8:], ensure_ascii=False, indent=2)}
```

---

## 4. 월봉 데이터 (최근 24개월)
> 월봉 이동평균: 3개월={latest_monthly.get('sma_3m')} / 6개월={latest_monthly.get('sma_6m')} / 12개월={latest_monthly.get('sma_12m')} / 24개월={latest_monthly.get('sma_24m')}

```json
{json.dumps(monthly[-6:], ensure_ascii=False, indent=2)}
```

---

## 5. 일봉 데이터 (최근 60거래일)
```json
{json.dumps(daily[-20:], ensure_ascii=False, indent=2)}
```

---

## 6. 기술적 지표 (최신)
| 지표 | 값 | 해석 |
|------|----|------|
| RSI(14) | {indicators.get('rsi_14', 'N/A')} | {'과매수(70↑)' if (indicators.get('rsi_14') or 0) > 70 else '과매도(30↓)' if (indicators.get('rsi_14') or 100) < 30 else '중립'} |
| RSI(9)  | {indicators.get('rsi_9', 'N/A')} | — |
| MACD    | {indicators.get('macd', 'N/A')} | — |
| MACD Signal | {indicators.get('macd_signal', 'N/A')} | {'골든크로스' if (indicators.get('macd') or 0) > (indicators.get('macd_signal') or 0) else '데드크로스'} |
| 볼린저밴드 %B | {indicators.get('bb_pct', 'N/A')} | {'상단 돌파' if (indicators.get('bb_pct') or 0) > 0.9 else '하단 접근' if (indicators.get('bb_pct') or 1) < 0.1 else '중립'} |
| Stochastic K/D | {indicators.get('stoch_k', 'N/A')} / {indicators.get('stoch_d', 'N/A')} | — |
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

## 응답 형식 주의사항
- 모든 숫자 필드(buy_price, sell_price, stop_loss, target_price, key_level, confidence 등)는 반드시 실제 숫자(정수 또는 소수)만 입력하세요.
- 현재가({current_price})를 기준으로 현실적인 가격을 계산하세요.
- "숫자", "N/A", "없음" 같은 텍스트를 숫자 필드에 쓰지 마세요. 불확실하면 0을 사용하세요.
- confidence는 0.0에서 1.0 사이의 소수(예: 0.75)를 입력하세요.
- JSON만 응답하고, 다른 설명은 쓰지 마세요.

다음 JSON 형식으로만 응답하세요:
{{
  "signal": "BUY",
  "confidence": 0.75,
  "short_term": {{
    "outlook": "상승",
    "buy_price": {int(current_price * 0.99) if current_price else 0},
    "sell_price": {int(current_price * 1.05) if current_price else 0},
    "stop_loss": {int(current_price * 0.95) if current_price else 0},
    "reason": "단기 근거를 2~3문장으로 설명"
  }},
  "mid_term": {{
    "outlook": "상승",
    "target_price": {int(current_price * 1.10) if current_price else 0},
    "key_level": {int(current_price * 0.92) if current_price else 0},
    "reason": "중기 근거를 2~3문장으로 설명"
  }},
  "long_term": {{
    "outlook": "상승",
    "target_price": {int(current_price * 1.20) if current_price else 0},
    "reason": "장기 근거를 2~3문장으로 설명"
  }},
  "ma_analysis": {{
    "arrangement": "정배열",
    "summary": "이동평균선 분석 요약"
  }},
  "summary": "종합 투자 의견을 3~5줄로 설명",
  "risk_level": "MEDIUM",
  "key_points": ["핵심포인트1", "핵심포인트2", "핵심포인트3"],
  "llm_provider": "{self.llm.provider_name}"
}}

위 예시의 숫자값들을 실제 분석 결과에 맞는 값으로 교체하여 응답하세요.
signal은 BUY/SELL/HOLD/WATCH 중 하나, risk_level은 LOW/MEDIUM/HIGH 중 하나를 선택하세요.
"""

        response = await self.llm.complete(
            prompt=prompt,
            system=SYSTEM_PROMPT,
            max_tokens=settings.LLM_MAX_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
        )

        return self._parse_json_response(response.text)

    def _parse_json_response(self, text: str) -> dict:
        """LLM 응답에서 JSON 추출 및 파싱 — 다양한 LLM 출력 형식 내성 처리"""
        # 마크다운 코드블록 제거
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)

        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match:
            return self._fallback_response(text)

        raw = json_match.group()

        # ── 공통 LLM 출력 오류 정제 ──────────────────────────────────────────
        cleaned = raw

        # 1. 한국어/텍스트 플레이스홀더를 null로 교체
        cleaned = re.sub(r':\s*"?숫자"?',         ': null', cleaned)
        cleaned = re.sub(r':\s*"?없음"?',          ': null', cleaned)
        cleaned = re.sub(r':\s*"?(N/A|n/a|NA)"?', ': null', cleaned)

        # 2. 범위 표기(0.0~1.0, 0~100)를 평균값으로 변환
        def _range_to_avg(m: re.Match) -> str:
            try:
                avg = (float(m.group(1)) + float(m.group(2))) / 2
                return f': {avg}'
            except ValueError:
                return m.group(0)
        cleaned = re.sub(r':\s*([\d.]+)~([\d.]+)', _range_to_avg, cleaned)

        # 3. 숫자 천 단위 구분자 제거 (예: 80,000 → 80000)
        #    JSON 배열/객체 구분자 쉼표와 구별: 숫자 뒤에 쉼표+3자리 숫자 패턴
        for _ in range(4):   # 1,234,567 처럼 쉼표 여러 개도 처리
            cleaned = re.sub(r'(?<=[0-9]),(?=[0-9]{3}(?:[^0-9]|$))', '', cleaned)

        # 4. 후행 쉼표 제거 (trailing comma before } or ])
        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)

        # 5. 줄바꿈 포함된 문자열 내 제어문자 정제
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', cleaned)

        # 정제된 버전 → 원본 순으로 시도
        for candidate in (cleaned, raw):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

        return self._fallback_response(text)

    def _fallback_response(self, text: str) -> dict:
        return {
            "signal": "HOLD",
            "confidence": 0.5,
            "summary": text.strip()[:300],
            "risk_level": "MEDIUM",
        }

    async def generate_market_insight(self, market: str, top_stocks: list) -> str:
        """시장 전반 AI 인사이트 — 실제 거래대금 상위 종목 데이터 기반"""
        if not top_stocks:
            stock_summary = "데이터 없음"
        else:
            lines = []
            for s in top_stocks[:10]:
                sign = "▲" if s.get("change_pct", 0) >= 0 else "▼"
                lines.append(
                    f"- {s['name']}({s['ticker']}): {s.get('close', 0):,} "
                    f"{sign}{abs(s.get('change_pct', 0)):.2f}%"
                )
            stock_summary = "\n".join(lines)

        prompt = f"""오늘 {market} 시장의 거래대금 상위 종목 현황입니다:

{stock_summary}

위 데이터를 바탕으로 {market} 시장의 오늘 주요 동향과 투자자가 주목해야 할 포인트를 200자 이내로 한국어로 작성하세요.
숫자나 종목명을 언급하여 구체적으로 작성하세요. JSON 형식이 아닌 일반 텍스트로 작성하세요."""

        response = await self.llm.complete(prompt=prompt, max_tokens=500, temperature=0.3)
        return response.text.strip()
