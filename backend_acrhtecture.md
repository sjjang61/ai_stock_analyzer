# 📈 Stock AI Analyzer — Backend 설계 문서

> **Stack**: FastAPI + SQLAlchemy + MySQL + Celery + Redis  
> **데이터 소스**: pykrx (국내주식), yfinance (해외주식)  
> **AI 분석**: 멀티 LLM 지원 — Anthropic Claude / OpenAI GPT / Google Gemini (env 설정으로 전환)

---

## 1. 프로젝트 구조

```
stock-ai-backend/
├── app/
│   ├── main.py                    # FastAPI 앱 엔트리포인트
│   ├── config.py                  # 환경변수 설정
│   ├── database.py                # DB 연결 설정
│   ├── deps.py                    # 의존성 주입
│   │
│   ├── models/                    # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   ├── stock.py               # 종목 기본 정보
│   │   ├── stock_price.py         # 주가 히스토리 (일봉)
│   │   ├── stock_price_weekly.py  # 주봉 데이터
│   │   ├── stock_price_monthly.py # 월봉 데이터
│   │   ├── stock_indicator.py     # 기술적 지표
│   │   ├── strategy.py            # 투자 전략
│   │   ├── recommendation.py      # AI 추천 결과
│   │   └── user.py                # 사용자 (위시리스트 등)
│   │
│   ├── schemas/                   # Pydantic 스키마
│   │   ├── stock.py
│   │   ├── indicator.py
│   │   ├── strategy.py
│   │   └── recommendation.py
│   │
│   ├── routers/                   # API 라우터
│   │   ├── stocks.py              # 종목 조회/검색
│   │   ├── indicators.py          # 기술적 지표 조회
│   │   ├── strategies.py          # 전략 관리
│   │   ├── recommendations.py     # AI 추천 결과
│   │   └── analysis.py            # 실시간 AI 분석
│   │
│   ├── services/                  # 비즈니스 로직
│   │   ├── krx_service.py         # pykrx 데이터 수집
│   │   ├── yfinance_service.py    # yfinance 데이터 수집
│   │   ├── candlestick_service.py # 일봉/주봉/월봉 집계
│   │   ├── indicator_service.py   # 기술적 지표 계산
│   │   ├── strategy_service.py    # 전략 실행 엔진
│   │   └── ai_service.py          # 멀티 LLM AI 분석 (통합 인터페이스)
│   │
│   ├── llm/                       # LLM Provider 어댑터
│   │   ├── __init__.py
│   │   ├── base.py                # BaseLLMProvider (추상 클래스)
│   │   ├── anthropic_provider.py  # Claude (claude-sonnet-4-*)
│   │   ├── openai_provider.py     # GPT-4o / GPT-4-turbo
│   │   ├── gemini_provider.py     # Gemini 1.5 Pro / Flash
│   │   └── factory.py             # LLM_TYPE env 기반 팩토리
│   │
│   ├── tasks/                     # Celery 비동기 작업
│   │   ├── celery_app.py
│   │   ├── data_collector.py      # 주가 데이터 수집 (스케줄)
│   │   └── analysis_runner.py     # 전략 분석 실행
│   │
│   └── utils/
│       ├── indicators.py          # 지표 계산 유틸 (RSI, MACD 등)
│       └── helpers.py
│
├── alembic/                       # DB 마이그레이션
├── tests/
├── .env
├── requirements.txt
└── docker-compose.yml
```

---

## 2. 환경 설정

### `.env`
```env
# Database
DATABASE_URL=mysql+aiomysql://user:password@localhost:3306/stock_db
DATABASE_URL_SYNC=mysql+pymysql://user:password@localhost:3306/stock_db

# Redis & Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# ─────────────────────────────────────────
# LLM 설정 — 사용할 LLM 타입을 지정
# 가능한 값: anthropic | openai | gemini
# ─────────────────────────────────────────
LLM_TYPE=anthropic

# Anthropic Claude (LLM_TYPE=anthropic 일 때 사용)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# OpenAI GPT (LLM_TYPE=openai 일 때 사용)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Google Gemini (LLM_TYPE=gemini 일 때 사용)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-pro

# LLM 공통 설정
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.2       # 주식 분석은 낮은 temperature 권장

# App
APP_ENV=development
SECRET_KEY=your-secret-key
```

### `app/config.py`
```python
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # DB
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # Redis
    REDIS_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # LLM
    LLM_TYPE: Literal["anthropic", "openai", "gemini"] = "anthropic"
    LLM_MAX_TOKENS: int = 2000
    LLM_TEMPERATURE: float = 0.2

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "secret"

    class Config:
        env_file = ".env"

settings = Settings()
```

### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.30
aiomysql==0.2.0
pymysql==1.1.0
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.2.1

# 주식 데이터
pykrx==1.0.47
yfinance==0.2.40
pandas==2.2.2
numpy==1.26.4
ta==0.11.0              # 기술적 지표 라이브러리

# AI — 멀티 LLM (필요한 것만 설치해도 무방)
anthropic==0.26.0       # LLM_TYPE=anthropic
openai==1.30.0          # LLM_TYPE=openai
google-generativeai==0.7.0  # LLM_TYPE=gemini

# 비동기 작업
celery==5.4.0
redis==5.0.4
celery[redis]

# 유틸
python-dotenv==1.0.1
httpx==0.27.0
python-jose==3.3.0
passlib==1.7.4
```

---

## 3. 데이터베이스 모델

### `models/stock.py`
```python
from sqlalchemy import Column, String, Enum, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class MarketType(str, enum.Enum):
    KOSPI = "KOSPI"
    KOSDAQ = "KOSDAQ"
    NYSE = "NYSE"
    NASDAQ = "NASDAQ"
    AMEX = "AMEX"

class Stock(Base):
    __tablename__ = "stocks"

    id          = Column(String(20), primary_key=True)   # 티커 (005930, AAPL)
    name        = Column(String(100), nullable=False)
    name_en     = Column(String(100))
    market      = Column(Enum(MarketType), nullable=False)
    sector      = Column(String(100))
    industry    = Column(String(100))
    is_domestic = Column(Boolean, default=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    prices       = relationship("StockPrice", back_populates="stock")
    indicators   = relationship("StockIndicator", back_populates="stock")
```

### `models/stock_price.py` — 일봉
```python
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
```

### `models/stock_price_weekly.py` — 주봉
```python
from sqlalchemy import Column, String, Date, Float, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class StockPriceWeekly(Base):
    """
    매주 월요일 기준으로 해당 주의 OHLCV 집계
    일봉 데이터를 resample('W-MON')으로 집계하여 저장
    """
    __tablename__ = "stock_prices_weekly"
    __table_args__ = (UniqueConstraint("stock_id", "week_start"),)

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    stock_id    = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    week_start  = Column(Date, nullable=False, index=True)   # 해당 주 월요일
    week_end    = Column(Date)                               # 해당 주 금요일
    open        = Column(Float)
    high        = Column(Float)
    low         = Column(Float)
    close       = Column(Float, nullable=False)
    volume      = Column(BigInteger)

    # 주봉 이동평균 (캔들 기준)
    sma_5w      = Column(Float)    # 5주 이동평균 (약 1개월)
    sma_13w     = Column(Float)    # 13주 이동평균 (약 3개월)
    sma_26w     = Column(Float)    # 26주 이동평균 (약 6개월)
    sma_52w     = Column(Float)    # 52주 이동평균 (약 1년)

    stock = relationship("Stock")
```

### `models/stock_price_monthly.py` — 월봉
```python
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
```

### `models/stock_indicator.py`
```python
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
```

### `models/strategy.py`
```python
from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, Enum, DateTime, func
from app.database import Base
import enum

class StrategyType(str, enum.Enum):
    RSI_OVERSOLD       = "RSI_OVERSOLD"       # RSI 과매도 반등
    RSI_DIVERGENCE     = "RSI_DIVERGENCE"     # RSI 다이버전스
    MACD_CROSSOVER     = "MACD_CROSSOVER"     # MACD 골든크로스
    BB_BREAKOUT        = "BB_BREAKOUT"        # 볼린저 밴드 돌파
    GOLDEN_CROSS       = "GOLDEN_CROSS"       # 이동평균 골든크로스
    MOMENTUM           = "MOMENTUM"           # 모멘텀 전략
    VOLUME_SURGE       = "VOLUME_SURGE"       # 거래량 급증
    AI_COMPOSITE       = "AI_COMPOSITE"       # AI 종합 분석

class Strategy(Base):
    __tablename__ = "strategies"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), nullable=False)
    type        = Column(Enum(StrategyType), nullable=False)
    description = Column(Text)
    params      = Column(JSON)        # 전략 파라미터 {"rsi_threshold": 30, ...}
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
```

### `models/recommendation.py`
```python
from sqlalchemy import Column, Integer, String, Text, Float, JSON, Enum, DateTime, ForeignKey, func
from app.database import Base
import enum

class SignalType(str, enum.Enum):
    BUY         = "BUY"
    SELL        = "SELL"
    HOLD        = "HOLD"
    WATCH       = "WATCH"

class Recommendation(Base):
    __tablename__ = "recommendations"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    stock_id     = Column(String(20), ForeignKey("stocks.id"), nullable=False, index=True)
    strategy_id  = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    signal       = Column(Enum(SignalType), nullable=False)
    score        = Column(Float)              # 신호 강도 (0~100)
    ai_summary   = Column(Text)              # Claude AI 요약
    ai_detail    = Column(Text)              # AI 상세 분석
    indicators   = Column(JSON)              # 당시 지표 스냅샷
    price_at     = Column(Float)             # 추천 시점 가격
    target_price = Column(Float)             # AI 목표가
    stop_loss    = Column(Float)             # 손절가
    confidence   = Column(Float)             # AI 신뢰도 (0~1)
    created_at   = Column(DateTime, server_default=func.now(), index=True)
```

---

## 4. 서비스 레이어

### `services/krx_service.py` — 국내 주식
```python
from pykrx import stock as krx
import pandas as pd
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal
from app import models

class KRXService:

    async def get_stock_list(self, market: str = "KOSPI") -> list[dict]:
        """KOSPI/KOSDAQ 전체 종목 리스트 반환"""
        tickers = krx.get_market_ticker_list(market=market)
        result = []
        for ticker in tickers:
            name = krx.get_market_ticker_name(ticker)
            result.append({"id": ticker, "name": name, "market": market})
        return result

    async def fetch_ohlcv(
        self,
        ticker: str,
        start: str,   # "20240101"
        end: str      # "20241231"
    ) -> pd.DataFrame:
        """일별 OHLCV 데이터 조회"""
        df = krx.get_market_ohlcv(start, end, ticker)
        df = df.rename(columns={
            "시가": "open", "고가": "high", "저가": "low",
            "종가": "close", "거래량": "volume"
        })
        df.index.name = "date"
        return df

    async def get_fundamental(self, ticker: str) -> dict:
        """PER, PBR, 배당수익률 등 펀더멘털 조회"""
        today = datetime.now().strftime("%Y%m%d")
        df = krx.get_market_fundamental(today, today, ticker)
        if df.empty:
            return {}
        row = df.iloc[0]
        return {
            "bps": row.get("BPS"), "per": row.get("PER"),
            "pbr": row.get("PBR"), "eps": row.get("EPS"),
            "div": row.get("DIV"), "dps": row.get("DPS"),
        }
```

### `services/yfinance_service.py` — 해외 주식
```python
import yfinance as yf
import pandas as pd

class YFinanceService:

    def get_stock_info(self, ticker: str) -> dict:
        """종목 기본 정보"""
        t = yf.Ticker(ticker)
        info = t.info
        return {
            "id": ticker,
            "name": info.get("longName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
        }

    def fetch_ohlcv(
        self,
        ticker: str,
        period: str = "2y",       # 충분한 이력 확보
        interval: str = "1d"
    ) -> pd.DataFrame:
        """OHLCV 데이터 조회"""
        t = yf.Ticker(ticker)
        df = t.history(period=period, interval=interval)
        df.columns = df.columns.str.lower()
        df.index.name = "date"
        df.index = df.index.tz_localize(None)
        return df[["open", "high", "low", "close", "volume"]]
```

### `services/candlestick_service.py` — 일봉/주봉/월봉 집계
```python
import pandas as pd
import numpy as np
import ta

class CandlestickService:
    """
    일봉 DataFrame을 받아 주봉 / 월봉으로 집계하고
    각 봉의 이동평균선을 계산하여 반환한다.
    """

    def resample_weekly(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """
        일봉 → 주봉 변환
        - W-MON: 매주 월요일 시작 기준으로 집계
        """
        df = daily_df.copy()
        df.index = pd.to_datetime(df.index)

        weekly = df.resample("W-MON", closed="left", label="left").agg(
            open=("open",   "first"),
            high=("high",   "max"),
            low=("low",    "min"),
            close=("close",  "last"),
            volume=("volume", "sum"),
        ).dropna(subset=["close"])

        # 주봉 이동평균선
        weekly["sma_5w"]  = weekly["close"].rolling(5).mean()
        weekly["sma_13w"] = weekly["close"].rolling(13).mean()
        weekly["sma_26w"] = weekly["close"].rolling(26).mean()
        weekly["sma_52w"] = weekly["close"].rolling(52).mean()

        return weekly

    def resample_monthly(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """
        일봉 → 월봉 변환
        - MS: 매월 1일 기준으로 집계
        """
        df = daily_df.copy()
        df.index = pd.to_datetime(df.index)

        monthly = df.resample("MS").agg(
            open=("open",   "first"),
            high=("high",   "max"),
            low=("low",    "min"),
            close=("close",  "last"),
            volume=("volume", "sum"),
        ).dropna(subset=["close"])

        # 월봉 이동평균선
        monthly["sma_3m"]  = monthly["close"].rolling(3).mean()
        monthly["sma_6m"]  = monthly["close"].rolling(6).mean()
        monthly["sma_12m"] = monthly["close"].rolling(12).mean()
        monthly["sma_24m"] = monthly["close"].rolling(24).mean()

        return monthly

    def add_daily_ma(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """
        일봉에 5 / 20 / 60 / 120일 이동평균선 추가
        """
        df = daily_df.copy()
        df["sma_5"]   = df["close"].rolling(5).mean()
        df["sma_20"]  = df["close"].rolling(20).mean()
        df["sma_60"]  = df["close"].rolling(60).mean()
        df["sma_120"] = df["close"].rolling(120).mean()
        return df

    def build_analysis_payload(
        self,
        daily_df: pd.DataFrame,
        recent_days: int = 60,
        recent_weeks: int = 26,
        recent_months: int = 24,
    ) -> dict:
        """
        LLM 분석에 전달할 다중 시간프레임 데이터 패키지 생성
        """
        daily   = self.add_daily_ma(daily_df)
        weekly  = self.resample_weekly(daily_df)
        monthly = self.resample_monthly(daily_df)

        def df_to_records(df: pd.DataFrame, n: int) -> list[dict]:
            tail = df.tail(n).copy()
            tail.index = tail.index.astype(str)
            return tail.round(2).replace({np.nan: None}).to_dict(orient="records")

        return {
            "daily":   df_to_records(daily,   recent_days),    # 최근 60 거래일
            "weekly":  df_to_records(weekly,  recent_weeks),   # 최근 26주
            "monthly": df_to_records(monthly, recent_months),  # 최근 24개월
        }
```

### `utils/indicators.py` — 기술적 지표 계산
```python
import pandas as pd
import ta

def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    df: OHLCV DataFrame (date index, open/high/low/close/volume columns)
    return: 지표가 추가된 DataFrame
    """
    close = df["close"]
    high  = df["high"]
    low   = df["low"]
    vol   = df["volume"]

    # ── RSI ──────────────────────────────
    df["rsi_14"] = ta.momentum.RSIIndicator(close, window=14).rsi()
    df["rsi_9"]  = ta.momentum.RSIIndicator(close, window=9).rsi()

    # ── MACD ─────────────────────────────
    macd_obj = ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9)
    df["macd"]        = macd_obj.macd()
    df["macd_signal"] = macd_obj.macd_signal()
    df["macd_hist"]   = macd_obj.macd_diff()

    # ── 이동평균 ──────────────────────────
    for w in [5, 20, 60, 120]:
        df[f"sma_{w}"] = ta.trend.SMAIndicator(close, window=w).sma_indicator()
    df["ema_12"] = ta.trend.EMAIndicator(close, window=12).ema_indicator()
    df["ema_26"] = ta.trend.EMAIndicator(close, window=26).ema_indicator()

    # ── 볼린저 밴드 ───────────────────────
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    df["bb_upper"]  = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"]  = bb.bollinger_lband()
    df["bb_width"]  = bb.bollinger_wband()
    df["bb_pct"]    = bb.bollinger_pband()

    # ── Stochastic ────────────────────────
    stoch = ta.momentum.StochasticOscillator(high, low, close, window=14, smooth_window=3)
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()

    # ── 기타 ─────────────────────────────
    df["atr_14"]     = ta.volatility.AverageTrueRange(high, low, close, window=14).average_true_range()
    df["obv"]        = ta.volume.OnBalanceVolumeIndicator(close, vol).on_balance_volume()
    df["volume_sma"] = ta.trend.SMAIndicator(vol, window=20).sma_indicator()

    return df
```

---

## 5. LLM Provider 어댑터

### `llm/base.py` — 추상 기반 클래스
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class LLMResponse:
    text: str
    model: str
    input_tokens: int
    output_tokens: int

class BaseLLMProvider(ABC):
    """모든 LLM 어댑터가 구현해야 할 인터페이스"""

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> LLMResponse:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...
```

### `llm/anthropic_provider.py`
```python
import anthropic
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings

class AnthropicProvider(BaseLLMProvider):
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model  = settings.ANTHROPIC_MODEL

    @property
    def provider_name(self) -> str:
        return f"anthropic/{self.model}"

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 2000, temperature: float = 0.2) -> LLMResponse:
        msgs = [{"role": "user", "content": prompt}]
        kwargs = dict(model=self.model, max_tokens=max_tokens, messages=msgs)
        if system:
            kwargs["system"] = system

        res = self.client.messages.create(**kwargs)
        return LLMResponse(
            text=res.content[0].text,
            model=self.model,
            input_tokens=res.usage.input_tokens,
            output_tokens=res.usage.output_tokens,
        )
```

### `llm/openai_provider.py`
```python
from openai import AsyncOpenAI
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings

class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model  = settings.OPENAI_MODEL

    @property
    def provider_name(self) -> str:
        return f"openai/{self.model}"

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 2000, temperature: float = 0.2) -> LLMResponse:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        res = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return LLMResponse(
            text=res.choices[0].message.content,
            model=self.model,
            input_tokens=res.usage.prompt_tokens,
            output_tokens=res.usage.completion_tokens,
        )
```

### `llm/gemini_provider.py`
```python
import google.generativeai as genai
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings

class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL

    @property
    def provider_name(self) -> str:
        return f"gemini/{self.model_name}"

    async def complete(self, prompt: str, system: str = "", max_tokens: int = 2000, temperature: float = 0.2) -> LLMResponse:
        gen_config = genai.GenerationConfig(max_output_tokens=max_tokens, temperature=temperature)
        model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=gen_config,
            system_instruction=system if system else None,
        )
        response = model.generate_content(prompt)
        text     = response.text

        # 토큰 카운트 (Gemini는 estimate 사용)
        input_tokens  = model.count_tokens(prompt).total_tokens
        output_tokens = model.count_tokens(text).total_tokens

        return LLMResponse(text=text, model=self.model_name, input_tokens=input_tokens, output_tokens=output_tokens)
```

### `llm/factory.py` — 팩토리 (env 기반 LLM 자동 선택)
```python
from functools import lru_cache
from app.config import settings
from app.llm.base import BaseLLMProvider

@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    LLM_TYPE 환경변수에 따라 적절한 LLM 어댑터를 반환한다.

    .env:
        LLM_TYPE=anthropic   → AnthropicProvider (Claude)
        LLM_TYPE=openai      → OpenAIProvider    (GPT-4o)
        LLM_TYPE=gemini      → GeminiProvider    (Gemini 1.5 Pro)
    """
    llm_type = settings.LLM_TYPE.lower()

    if llm_type == "anthropic":
        from app.llm.anthropic_provider import AnthropicProvider
        return AnthropicProvider()

    elif llm_type == "openai":
        from app.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()

    elif llm_type == "gemini":
        from app.llm.gemini_provider import GeminiProvider
        return GeminiProvider()

    else:
        raise ValueError(
            f"지원하지 않는 LLM_TYPE: '{llm_type}'. "
            "사용 가능한 값: anthropic | openai | gemini"
        )
```

---

## 6. AI 분석 서비스

### `services/ai_service.py` — 멀티 봉차트 + 이동평균 기반 LLM 분석
```python
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
        candlestick_payload: dict,   # CandlestickService.build_analysis_payload() 반환값
        indicators: dict,            # 최신 기술적 지표
        strategy_signals: list[dict],
        fundamental: dict = None,
    ) -> dict:
        """
        일봉 / 주봉 / 월봉 + 5/20/60일 이동평균 데이터를 모두 활용한 LLM 종합 분석
        """
        daily   = candlestick_payload.get("daily",   [])
        weekly  = candlestick_payload.get("weekly",  [])
        monthly = candlestick_payload.get("monthly", [])

        # 최신 봉 데이터만 추출 (요약 제공)
        latest_daily   = daily[-1]   if daily   else {}
        latest_weekly  = weekly[-1]  if weekly  else {}
        latest_monthly = monthly[-1] if monthly else {}

        prompt = f"""
# 종목 분석 요청: {stock_name} ({ticker}) — {market}

---

## 1. 현재가 및 주요 가격 정보
| 구분 | 값 |
|------|----|
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
*(최근 8주 표시)*

---

## 4. 월봉 데이터 (최근 24개월)
> 월봉 이동평균: 3개월={latest_monthly.get('sma_3m')} / 6개월={latest_monthly.get('sma_6m')} / 12개월={latest_monthly.get('sma_12m')} / 24개월={latest_monthly.get('sma_24m')}

```json
{json.dumps(monthly[-6:], ensure_ascii=False, indent=2)}
```
*(최근 6개월 표시)*

---

## 5. 일봉 데이터 (최근 60거래일)
```json
{json.dumps(daily[-20:], ensure_ascii=False, indent=2)}
```
*(최근 20거래일 표시)*

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

## 분석 지침
1. **단기 관점 (일봉)**: 5일선, 20일선 위치, RSI, MACD, 볼린저밴드를 기반으로 단기 매매 포인트 분석
2. **중기 관점 (주봉)**: 60일선, 주봉 이동평균선, 추세의 방향성 분석
3. **장기 관점 (월봉)**: 120일선, 월봉 이동평균선, 장기 추세 및 주요 지지/저항 분석
4. **이동평균선 배열**: 정배열(5>20>60>120) 또는 역배열 여부와 의미 해석
5. **매수/매도가 추천**: 기술적 지지/저항선, ATR을 활용한 현실적인 가격대 제시

다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{{
  "signal": "BUY|SELL|HOLD|WATCH",
  "confidence": 0.0~1.0,
  "short_term": {{
    "outlook": "상승|하락|횡보",
    "buy_price": 숫자,
    "sell_price": 숫자,
    "stop_loss": 숫자,
    "reason": "단기 근거 (2~3문장)"
  }},
  "mid_term": {{
    "outlook": "상승|하락|횡보",
    "target_price": 숫자,
    "key_level": 숫자,
    "reason": "중기 근거 (2~3문장)"
  }},
  "long_term": {{
    "outlook": "상승|하락|횡보",
    "target_price": 숫자,
    "reason": "장기 근거 (2~3문장)"
  }},
  "ma_analysis": {{
    "arrangement": "정배열|역배열|혼재",
    "summary": "이동평균선 분석 요약"
  }},
  "summary": "종합 투자 의견 (3~5줄)",
  "risk_level": "LOW|MEDIUM|HIGH",
  "key_points": ["핵심포인트1", "핵심포인트2", "핵심포인트3"],
  "llm_provider": "{self.llm.provider_name}"
}}
"""

        response = await self.llm.complete(
            prompt=prompt,
            system=SYSTEM_PROMPT,
            max_tokens=settings.LLM_MAX_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
        )

        return self._parse_json_response(response.text)

    def _parse_json_response(self, text: str) -> dict:
        """LLM 응답에서 JSON 추출 및 파싱"""
        # 마크다운 코드블록 제거
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)

        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        return {
            "signal": "HOLD",
            "confidence": 0.5,
            "summary": text[:300],
            "risk_level": "MEDIUM",
        }

    async def generate_market_insight(self, market: str, top_stocks: list) -> str:
        """시장 전반 AI 인사이트"""
        prompt = f"""
{market} 시장의 오늘 주요 동향을 분석해주세요.
상위 종목 데이터: {json.dumps(top_stocks[:10], ensure_ascii=False)}

200자 이내로 핵심 인사이트를 한국어로 작성하세요.
"""
        response = await self.llm.complete(prompt=prompt, max_tokens=500, temperature=0.3)
        return response.text
```

---

## 7. 전략 실행 엔진

### `services/strategy_service.py`
```python
import pandas as pd
from dataclasses import dataclass

@dataclass
class StrategySignal:
    signal: str      # BUY / SELL / HOLD
    score: float     # 0~100
    reason: str
    indicators: dict

class StrategyService:

    def run_rsi_oversold(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """RSI 과매도 반등 전략"""
        threshold = params.get("rsi_threshold", 30)
        latest, prev = df.iloc[-1], df.iloc[-2]
        rsi_now, rsi_prev = latest["rsi_14"], prev["rsi_14"]

        if rsi_prev < threshold and rsi_now > rsi_prev:
            return StrategySignal("BUY", min(100, (threshold - rsi_prev) * 3), f"RSI {rsi_now:.1f} — 과매도 반등", {"rsi": rsi_now})
        elif rsi_now > 70:
            return StrategySignal("SELL", 70.0, f"RSI {rsi_now:.1f} — 과매수", {"rsi": rsi_now})
        return StrategySignal("HOLD", 50.0, f"RSI {rsi_now:.1f} — 중립", {"rsi": rsi_now})

    def run_macd_crossover(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """MACD 골든크로스 / 데드크로스"""
        latest, prev = df.iloc[-1], df.iloc[-2]
        golden = prev["macd"] < prev["macd_signal"] and latest["macd"] > latest["macd_signal"]
        dead   = prev["macd"] > prev["macd_signal"] and latest["macd"] < latest["macd_signal"]

        if golden: return StrategySignal("BUY",  80.0, "MACD 골든크로스", {"macd": latest["macd"]})
        if dead:   return StrategySignal("SELL", 75.0, "MACD 데드크로스", {"macd": latest["macd"]})
        return StrategySignal("HOLD", 50.0, "MACD 크로스 없음", {})

    def run_golden_cross(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """5/20일선 골든크로스"""
        latest, prev = df.iloc[-1], df.iloc[-2]
        if prev["sma_5"] < prev["sma_20"] and latest["sma_5"] > latest["sma_20"]:
            return StrategySignal("BUY",  78.0, "5일선 20일선 골든크로스", {"sma5": latest["sma_5"]})
        if prev["sma_5"] > prev["sma_20"] and latest["sma_5"] < latest["sma_20"]:
            return StrategySignal("SELL", 72.0, "5일선 20일선 데드크로스", {"sma5": latest["sma_5"]})
        return StrategySignal("HOLD", 50.0, "크로스 없음", {})

    def run_ma_arrangement(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """이동평균선 정배열/역배열 전략 (5>20>60>120)"""
        latest = df.iloc[-1]
        sma5, sma20, sma60, sma120 = (
            latest.get("sma_5"), latest.get("sma_20"),
            latest.get("sma_60"), latest.get("sma_120")
        )
        if None in [sma5, sma20, sma60, sma120]:
            return StrategySignal("HOLD", 50.0, "이동평균 데이터 부족", {})

        if sma5 > sma20 > sma60 > sma120:
            return StrategySignal("BUY",  85.0, "완전 정배열 — 강력 상승 추세", {"arrangement": "정배열"})
        if sma5 < sma20 < sma60 < sma120:
            return StrategySignal("SELL", 82.0, "완전 역배열 — 강력 하락 추세", {"arrangement": "역배열"})
        return StrategySignal("HOLD", 55.0, "이동평균 혼재", {"arrangement": "혼재"})

    def run_bb_breakout(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """볼린저 밴드 돌파"""
        pct = df.iloc[-1]["bb_pct"]
        if pct < 0.05:  return StrategySignal("BUY",  85.0, f"볼린저 하단 (BB%: {pct:.2f})", {"bb_pct": pct})
        if pct > 0.95:  return StrategySignal("SELL", 80.0, f"볼린저 상단 (BB%: {pct:.2f})", {"bb_pct": pct})
        return StrategySignal("HOLD", 50.0, f"볼린저 중립 (BB%: {pct:.2f})", {"bb_pct": pct})

    def run_volume_surge(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """거래량 급증"""
        latest    = df.iloc[-1]
        vol_ratio = params.get("volume_ratio", 2.0)
        ratio     = latest["volume"] / (latest["volume_sma"] or 1)
        if ratio > vol_ratio and latest["close"] > latest["sma_5"]:
            return StrategySignal("BUY", min(100, ratio * 20), f"거래량 급증 ({ratio:.1f}배)", {"vol_ratio": ratio})
        return StrategySignal("HOLD", 50.0, "거래량 정상", {})
```

---

## 8. API 라우터

### `routers/stocks.py`
```python
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_db
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.schemas.stock import StockSearchResponse, StockDetailResponse

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.get("/search")
async def search_stocks(
    q: str = Query(..., min_length=1),
    market: str = Query("ALL"),   # KOSPI | KOSDAQ | US | ALL
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """종목 검색"""
    ...

@router.get("/domestic")
async def get_domestic_stocks(
    market: str = Query("KOSPI"),
    db: AsyncSession = Depends(get_db)
):
    """국내 종목 전체 리스트"""
    ...

@router.get("/overseas/popular")
async def get_popular_overseas():
    """해외 인기 종목 (S&P500, FAANG 등)"""
    popular = [
        {"ticker": "AAPL", "name": "Apple Inc."},
        {"ticker": "MSFT", "name": "Microsoft"},
        {"ticker": "NVDA", "name": "NVIDIA"},
        {"ticker": "TSLA", "name": "Tesla"},
        {"ticker": "GOOGL", "name": "Alphabet"},
        {"ticker": "AMZN", "name": "Amazon"},
        {"ticker": "META", "name": "Meta Platforms"},
    ]
    return popular

@router.get("/{ticker}")
async def get_stock_detail(
    ticker: str,
    is_domestic: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """종목 상세 정보 + 현재 지표"""
    ...

@router.get("/{ticker}/price")
async def get_stock_price(
    ticker: str,
    period: str = Query("3mo"),    # 1mo, 3mo, 6mo, 1y, 3y
    is_domestic: bool = Query(True),
):
    """주가 히스토리 (차트 데이터)"""
    ...
```

### `routers/recommendations.py`
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_db

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/")
async def get_recommendations(
    strategy: str = Query(None),       # 전략 필터
    signal: str = Query(None),         # BUY | SELL | HOLD
    market: str = Query("ALL"),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db)
):
    """AI 추천 종목 목록"""
    ...

@router.get("/today")
async def get_today_recommendations(db: AsyncSession = Depends(get_db)):
    """오늘의 AI 추천 종목 (전략별 TOP 5)"""
    ...

@router.post("/analyze/{ticker}")
async def analyze_stock_now(
    ticker: str,
    is_domestic: bool = Query(True),
):
    """실시간 단일 종목 AI 분석 트리거"""
    ...
```

---

## 9. Celery 스케줄 작업

### `tasks/data_collector.py`
```python
from celery import shared_task
from celery.schedules import crontab

# celery_app.conf.beat_schedule 에 등록
CELERY_BEAT_SCHEDULE = {
    # 장 마감 후 국내 데이터 수집 (평일 16:30)
    "collect-domestic-daily": {
        "task": "tasks.data_collector.collect_domestic_prices",
        "schedule": crontab(hour=16, minute=30, day_of_week="1-5"),
    },
    # 미국 장 마감 후 해외 데이터 수집 (평일 07:00 KST)
    "collect-overseas-daily": {
        "task": "tasks.data_collector.collect_overseas_prices",
        "schedule": crontab(hour=7, minute=0, day_of_week="2-6"),
    },
    # 지표 재계산 (매일 08:00)
    "recalculate-indicators": {
        "task": "tasks.data_collector.recalculate_indicators",
        "schedule": crontab(hour=8, minute=0, day_of_week="1-5"),
    },
    # 전략 실행 및 AI 추천 (매일 08:30)
    "run-strategies": {
        "task": "tasks.analysis_runner.run_all_strategies",
        "schedule": crontab(hour=8, minute=30, day_of_week="1-5"),
    },
}

@shared_task
def collect_domestic_prices():
    """pykrx로 전체 국내 종목 주가 수집"""
    ...

@shared_task
def collect_overseas_prices():
    """yfinance로 해외 종목 주가 수집"""
    ...

@shared_task
def recalculate_indicators():
    """ta 라이브러리로 모든 종목 지표 재계산"""
    ...
```

---

## 10. API 엔드포인트 전체 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/stocks/search?q=삼성` | 종목 검색 |
| GET | `/api/stocks/domestic?market=KOSPI` | 국내 종목 목록 |
| GET | `/api/stocks/overseas/popular` | 해외 인기 종목 |
| GET | `/api/stocks/{ticker}` | 종목 상세 정보 |
| GET | `/api/stocks/{ticker}/price?period=3mo` | 일봉 차트 데이터 |
| GET | `/api/stocks/{ticker}/price/weekly` | 주봉 차트 데이터 |
| GET | `/api/stocks/{ticker}/price/monthly` | 월봉 차트 데이터 |
| GET | `/api/indicators/{ticker}` | 종목 기술적 지표 |
| GET | `/api/strategies` | 전략 목록 |
| GET | `/api/recommendations` | AI 추천 목록 |
| GET | `/api/recommendations/today` | 오늘의 추천 종목 |
| POST | `/api/recommendations/analyze/{ticker}` | 실시간 AI 분석 (일봉+주봉+월봉) |
| GET | `/api/market/insight` | 시장 AI 인사이트 |
| GET | `/api/llm/current` | 현재 사용 중인 LLM 정보 조회 |
| GET | `/health` | 헬스 체크 |

### `GET /api/llm/current` 응답 예시
```json
{
  "llm_type": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "provider": "anthropic/claude-sonnet-4-20250514",
  "temperature": 0.2,
  "max_tokens": 2000
}
```

---

## 11. 데이터베이스 마이그레이션 (Alembic)

```bash
# 초기화
alembic init alembic

# 마이그레이션 생성
alembic revision --autogenerate -m "init_stock_tables"

# 마이그레이션 적용
alembic upgrade head
```

---

## 12. 실행 방법

```bash
# 개발 서버
uvicorn app.main:app --reload --port 8000

# Celery Worker
celery -A app.tasks.celery_app worker --loglevel=info

# Celery Beat (스케줄러)
celery -A app.tasks.celery_app beat --loglevel=info

# Docker Compose
docker-compose up -d
```

### LLM 전환 방법 (재시작 불필요 — .env 수정 후 재시작)
```bash
# Claude로 전환
LLM_TYPE=anthropic
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# GPT-4o로 전환
LLM_TYPE=openai
OPENAI_MODEL=gpt-4o

# Gemini로 전환
LLM_TYPE=gemini
GEMINI_MODEL=gemini-1.5-pro
```

### `docker-compose.yml`
```yaml
version: "3.9"
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]

  worker:
    build: .
    command: celery -A app.tasks.celery_app worker -l info
    env_file: .env
    depends_on: [db, redis]

  beat:
    build: .
    command: celery -A app.tasks.celery_app beat -l info
    env_file: .env

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: stock_db
    ports: ["3306:3306"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```