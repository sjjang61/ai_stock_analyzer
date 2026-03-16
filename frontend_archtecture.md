# 📊 Stock AI Analyzer — Frontend 설계 문서

> **Stack**: React 18 + TypeScript + Vite + TailwindCSS  
> **차트**: Recharts / TradingView Lightweight Charts  
> **상태관리**: Zustand + TanStack Query  
> **라우팅**: React Router v6

---

## 1. 프로젝트 구조

```
stock-ai-frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── pages/                     # 페이지 컴포넌트
│   │   ├── DashboardPage.tsx       # 메인 대시보드
│   │   ├── StockDetailPage.tsx     # 종목 상세
│   │   ├── RecommendationPage.tsx  # AI 추천 목록
│   │   ├── StrategyPage.tsx        # 전략 관리
│   │   ├── MarketPage.tsx          # 시장 개요
│   │   └── WatchlistPage.tsx       # 관심 종목
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── stock/
│   │   │   ├── StockCard.tsx          # 종목 카드
│   │   │   ├── StockSearchBar.tsx     # 검색바
│   │   │   ├── StockTable.tsx         # 종목 테이블
│   │   │   └── StockPriceChart.tsx    # 주가 차트
│   │   │
│   │   ├── indicators/
│   │   │   ├── IndicatorPanel.tsx     # 지표 패널
│   │   │   ├── RSIChart.tsx           # RSI 차트
│   │   │   ├── MACDChart.tsx          # MACD 차트
│   │   │   └── BollingerChart.tsx     # 볼린저 밴드
│   │   │
│   │   ├── recommendation/
│   │   │   ├── RecommendCard.tsx      # 추천 카드
│   │   │   ├── SignalBadge.tsx        # BUY/SELL/HOLD 뱃지
│   │   │   ├── AIAnalysisBox.tsx      # AI 분석 결과 박스
│   │   │   └── StrategyFilter.tsx     # 전략 필터
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Tabs.tsx
│   │       └── Modal.tsx
│   │
│   ├── hooks/
│   │   ├── useStocks.ts              # 종목 데이터 훅
│   │   ├── useIndicators.ts          # 지표 데이터 훅
│   │   ├── useRecommendations.ts     # 추천 데이터 훅
│   │   └── useAnalyze.ts             # AI 분석 트리거 훅
│   │
│   ├── store/
│   │   ├── useAppStore.ts            # 전역 앱 상태
│   │   └── useWatchlistStore.ts      # 관심 종목 상태
│   │
│   ├── api/
│   │   ├── client.ts                 # axios 인스턴스
│   │   ├── stocks.ts                 # 주식 API
│   │   ├── indicators.ts             # 지표 API
│   │   └── recommendations.ts        # 추천 API
│   │
│   ├── types/
│   │   ├── stock.ts
│   │   ├── indicator.ts
│   │   └── recommendation.ts
│   │
│   └── utils/
│       ├── format.ts                 # 숫자/날짜 포맷
│       └── color.ts                  # 등락 색상 유틸
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. 패키지 설치

```bash
# 프로젝트 생성
npm create vite@latest stock-ai-frontend -- --template react-ts
cd stock-ai-frontend

# 핵심 패키지
npm install \
  react-router-dom \
  @tanstack/react-query \
  zustand \
  axios

# UI / 스타일
npm install -D tailwindcss postcss autoprefixer
npm install \
  lucide-react \
  clsx \
  tailwind-merge

# 차트
npm install \
  recharts \
  lightweight-charts

# 유틸
npm install dayjs numeral

# 개발
npm install -D @types/numeral
```

### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c4a6e",
        },
        up:   "#ef4444",   // 상승 (빨간색 — 국내 기준)
        down: "#3b82f6",   // 하락 (파란색 — 국내 기준)
        buy:  "#16a34a",
        sell: "#dc2626",
        hold: "#d97706",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
```

---

## 3. 타입 정의

### `types/stock.ts`
```typescript
export type MarketType = "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";

export interface Stock {
  id: string;                  // 티커 (005930, AAPL)
  name: string;
  nameEn?: string;
  market: MarketType;
  sector?: string;
  industry?: string;
  isDomestic: boolean;
  isActive: boolean;
}

export interface StockPrice {
  date: string;                // "2024-01-15"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface StockDetail extends Stock {
  currentPrice: number;
  changeAmount: number;
  changePct: number;
  high52w: number;
  low52w: number;
  marketCap?: number;
  per?: number;
  pbr?: number;
  dividendYield?: number;
}
```

### `types/indicator.ts`
```typescript
export interface Indicator {
  stockId: string;
  date: string;
  // RSI
  rsi14: number;
  rsi9: number;
  // MACD
  macd: number;
  macdSignal: number;
  macdHist: number;
  // 이동평균
  sma5: number;
  sma20: number;
  sma60: number;
  sma120: number;
  // 볼린저
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPct: number;
  // Stochastic
  stochK: number;
  stochD: number;
}
```

### `types/recommendation.ts`
```typescript
export type SignalType = "BUY" | "SELL" | "HOLD" | "WATCH";
export type RiskLevel  = "LOW" | "MEDIUM" | "HIGH";

export interface Recommendation {
  id: number;
  stockId: string;
  stockName: string;
  market: string;
  strategyName: string;
  signal: SignalType;
  score: number;           // 0~100
  confidence: number;      // 0~1
  aiSummary: string;
  aiDetail: string;
  targetPrice: number;
  stopLoss: number;
  priceAt: number;
  riskLevel: RiskLevel;
  keyPoints: string[];
  indicators: Partial<Indicator>;
  createdAt: string;
}
```

---

## 4. API 클라이언트

### `api/client.ts`
```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// 응답 인터셉터 — 에러 핸들링
apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.detail ?? "서버 오류가 발생했습니다.";
    return Promise.reject(new Error(message));
  }
);
```

### `api/stocks.ts`
```typescript
import { apiClient } from "./client";
import type { Stock, StockDetail, StockPrice } from "@/types/stock";

export const stocksApi = {
  search: (q: string, market = "ALL") =>
    apiClient.get<Stock[]>("/api/stocks/search", { params: { q, market } }),

  getDomestic: (market = "KOSPI") =>
    apiClient.get<Stock[]>("/api/stocks/domestic", { params: { market } }),

  getOverseasPopular: () =>
    apiClient.get<Stock[]>("/api/stocks/overseas/popular"),

  getDetail: (ticker: string, isDomestic = true) =>
    apiClient.get<StockDetail>(`/api/stocks/${ticker}`, {
      params: { is_domestic: isDomestic },
    }),

  getPrice: (ticker: string, period = "3mo", isDomestic = true) =>
    apiClient.get<StockPrice[]>(`/api/stocks/${ticker}/price`, {
      params: { period, is_domestic: isDomestic },
    }),
};
```

### `api/recommendations.ts`
```typescript
import { apiClient } from "./client";
import type { Recommendation } from "@/types/recommendation";

export const recommendationsApi = {
  getList: (params?: {
    strategy?: string;
    signal?: string;
    market?: string;
    limit?: number;
  }) => apiClient.get<Recommendation[]>("/api/recommendations", { params }),

  getToday: () =>
    apiClient.get<Record<string, Recommendation[]>>("/api/recommendations/today"),

  analyzeNow: (ticker: string, isDomestic = true) =>
    apiClient.post<Recommendation>(`/api/recommendations/analyze/${ticker}`, null, {
      params: { is_domestic: isDomestic },
    }),
};
```

---

## 5. 커스텀 훅

### `hooks/useStocks.ts`
```typescript
import { useQuery } from "@tanstack/react-query";
import { stocksApi } from "@/api/stocks";

export const useStockSearch = (q: string, market = "ALL") =>
  useQuery({
    queryKey: ["stocks", "search", q, market],
    queryFn: () => stocksApi.search(q, market),
    enabled: q.length > 0,
    staleTime: 1000 * 60 * 5,   // 5분 캐시
  });

export const useStockDetail = (ticker: string, isDomestic = true) =>
  useQuery({
    queryKey: ["stocks", "detail", ticker, isDomestic],
    queryFn: () => stocksApi.getDetail(ticker, isDomestic),
    staleTime: 1000 * 60,         // 1분 캐시
  });

export const useStockPrice = (
  ticker: string,
  period = "3mo",
  isDomestic = true
) =>
  useQuery({
    queryKey: ["stocks", "price", ticker, period, isDomestic],
    queryFn: () => stocksApi.getPrice(ticker, period, isDomestic),
    staleTime: 1000 * 60 * 10,
  });
```

### `hooks/useAnalyze.ts`
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recommendationsApi } from "@/api/recommendations";

export const useAnalyzeStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticker,
      isDomestic,
    }: {
      ticker: string;
      isDomestic: boolean;
    }) => recommendationsApi.analyzeNow(ticker, isDomestic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
};
```

---

## 6. 주요 컴포넌트

### `components/recommendation/SignalBadge.tsx`
```tsx
import clsx from "clsx";
import type { SignalType } from "@/types/recommendation";

const SIGNAL_CONFIG: Record<SignalType, { label: string; className: string }> = {
  BUY:   { label: "매수",   className: "bg-green-100 text-green-700 border-green-200" },
  SELL:  { label: "매도",   className: "bg-red-100 text-red-700 border-red-200" },
  HOLD:  { label: "보유",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  WATCH: { label: "관망",   className: "bg-gray-100 text-gray-600 border-gray-200" },
};

interface Props {
  signal: SignalType;
  size?: "sm" | "md" | "lg";
}

export const SignalBadge = ({ signal, size = "md" }: Props) => {
  const { label, className } = SIGNAL_CONFIG[signal];
  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold border rounded-full",
        size === "sm"  && "px-2 py-0.5 text-xs",
        size === "md"  && "px-3 py-1 text-sm",
        size === "lg"  && "px-4 py-1.5 text-base",
        className
      )}
    >
      {label}
    </span>
  );
};
```

### `components/recommendation/RecommendCard.tsx`
```tsx
import { TrendingUp, TrendingDown, Target, ShieldAlert } from "lucide-react";
import { SignalBadge } from "./SignalBadge";
import type { Recommendation } from "@/types/recommendation";

interface Props {
  rec: Recommendation;
  onClick?: () => void;
}

export const RecommendCard = ({ rec, onClick }: Props) => {
  const isUp = rec.signal === "BUY";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md
                 transition-all cursor-pointer hover:-translate-y-0.5"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{rec.market}</p>
          <h3 className="font-bold text-gray-900 text-lg">{rec.stockName}</h3>
          <p className="text-sm text-gray-400 font-mono">{rec.stockId}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SignalBadge signal={rec.signal} />
          <span className="text-xs text-gray-400">{rec.strategyName}</span>
        </div>
      </div>

      {/* AI 요약 */}
      <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">
        {rec.aiSummary}
      </p>

      {/* 가격 정보 */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">현재가</p>
          <p className="font-semibold text-gray-900 text-sm">
            {rec.priceAt.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
            <Target size={10} /> 목표가
          </p>
          <p className="font-semibold text-green-600 text-sm">
            {rec.targetPrice.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
            <ShieldAlert size={10} /> 손절가
          </p>
          <p className="font-semibold text-red-500 text-sm">
            {rec.stopLoss.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 신뢰도 바 */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>AI 신뢰도</span>
          <span>{(rec.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
            style={{ width: `${rec.confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

### `components/stock/StockPriceChart.tsx`
```tsx
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import type { StockPrice } from "@/types/stock";

interface Props {
  data: StockPrice[];
  showVolume?: boolean;
}

export const StockPriceChart = ({ data, showVolume = true }: Props) => {
  const firstClose = data[0]?.close ?? 0;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 0, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => v.slice(5)}   // MM-DD
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          tickFormatter={(v) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        {showVolume && (
          <YAxis
            yAxisId="volume"
            orientation="left"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
        )}
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "none",
            borderRadius: 8,
            color: "#f9fafb",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => {
            if (name === "close") return [value.toLocaleString() + "원", "종가"];
            if (name === "volume") return [value.toLocaleString(), "거래량"];
            return [value, name];
          }}
          labelFormatter={(label) => `📅 ${label}`}
        />

        {/* 거래량 바 */}
        {showVolume && (
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill="#e5e7eb"
            opacity={0.6}
            radius={[2, 2, 0, 0]}
          />
        )}

        {/* 종가 선 */}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#0ea5e9" }}
        />

        {/* 시작가 기준선 */}
        <ReferenceLine
          yAxisId="price"
          y={firstClose}
          stroke="#d1d5db"
          strokeDasharray="4 4"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
```

### `components/indicators/RSIChart.tsx`
```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface RSIData {
  date: string;
  rsi14: number;
  rsi9: number;
}

export const RSIChart = ({ data }: { data: RSIData[] }) => (
  <div>
    <h4 className="text-sm font-medium text-gray-500 mb-2">RSI</h4>
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 5, right: 30, bottom: 0, left: 10 }}>
        <defs>
          <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 10 }} width={25} />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}`, "RSI"]}
          contentStyle={{ fontSize: 11, borderRadius: 6, border: "none", background: "#1f2937", color: "#fff" }}
        />
        {/* 과매수/과매도 기준선 */}
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={30} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />
        <Area type="monotone" dataKey="rsi14" stroke="#8b5cf6" fill="url(#rsiGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
```

---

## 7. 페이지 구성

### 대시보드 (`DashboardPage.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  📊 오늘의 시장 현황                           [국내 | 해외] │
│  KOSPI +1.23%  KOSDAQ -0.45%  S&P500 +0.87%               │
├──────────────────┬──────────────────────────────────────────┤
│  AI 시장 인사이트 │  오늘의 추천 종목                         │
│  (Claude 요약)   │  ┌──────┬──────┬──────┬──────┐          │
│                  │  │ RSI  │ MACD │ BB   │ 종합 │          │
│                  │  └──────┴──────┴──────┴──────┘          │
├──────────────────┴──────────────────────────────────────────┤
│  전략별 TOP 추천                                             │
│  [매수 신호] [매도 신호] [관심 종목]                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │종목카드 │ │종목카드 │ │종목카드 │ │종목카드 │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 종목 상세 (`StockDetailPage.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  삼성전자 (005930) · KOSPI                                  │
│  ₩75,400  ▲ +1,200 (+1.62%)          [AI 분석하기] [★]    │
├────────────────────────────────────────────────────┬────────┤
│  주가 차트 [1M|3M|6M|1Y|3Y]                        │ 기본  │
│                                                    │ 정보  │
│  ~차트~                                            │       │
│                                                    │ PER   │
├────────────────────────────────────────────────────┤ PBR   │
│  기술적 지표                                        │ 시총  │
│  [RSI] [MACD] [볼린저밴드] [이동평균]              │ 배당  │
│  ~지표 차트~                                       ├────────┤
│                                                    │ AI    │
├────────────────────────────────────────────────────┤ 분석  │
│  AI 분석 결과                                       │ 결과  │
│  신호: [매수] 신뢰도: 82%                          │       │
│  목표가: ₩82,000 | 손절가: ₩72,000                │       │
│  "RSI 과매도 구간에서 반등 신호..."                │       │
└────────────────────────────────────────────────────┴────────┘
```

### AI 추천 (`RecommendationPage.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 AI 추천 종목                              [국내 | 해외] │
├─────────────────────────────────────────────────────────────┤
│  필터: [전체전략▾] [매수▾] [위험도▾] [시장▾]    [새로고침] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 삼성전자     │ │ NVIDIA       │ │ SK하이닉스   │        │
│  │ [매수]       │ │ [매수]       │ │ [관망]       │        │
│  │ RSI 과매도   │ │ MACD 크로스  │ │ 볼린저 중립  │        │
│  │ ─────────── │ │ ─────────── │ │ ─────────── │        │
│  │ 현재 75,400  │ │ $875        │ │ 현재 195,000 │        │
│  │ 목표 82,000  │ │ 목표 $950   │ │ 목표 210,000 │        │
│  │ 신뢰도 ████░ │ │ 신뢰도 ████  │ │ 신뢰도 ██░░░ │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 전역 상태 관리

### `store/useAppStore.ts`
```typescript
import { create } from "zustand";

interface AppState {
  marketFilter: "ALL" | "DOMESTIC" | "OVERSEAS";
  setMarketFilter: (filter: AppState["marketFilter"]) => void;
  selectedTicker: string | null;
  selectTicker: (ticker: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  marketFilter: "ALL",
  setMarketFilter: (filter) => set({ marketFilter: filter }),
  selectedTicker: null,
  selectTicker: (ticker) => set({ selectedTicker: ticker }),
}));
```

### `store/useWatchlistStore.ts`
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistState {
  items: string[];    // 티커 목록
  add: (ticker: string) => void;
  remove: (ticker: string) => void;
  has: (ticker: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add:    (ticker) => set((s) => ({ items: [...new Set([...s.items, ticker])] })),
      remove: (ticker) => set((s) => ({ items: s.items.filter((t) => t !== ticker) })),
      has:    (ticker) => get().items.includes(ticker),
    }),
    { name: "watchlist" }
  )
);
```

---

## 9. 유틸리티

### `utils/format.ts`
```typescript
export const formatPrice = (price: number, isDomestic = true): string => {
  if (isDomestic) return `₩${price.toLocaleString("ko-KR")}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
};

export const formatChangePct = (pct: number): string => {
  const sign = pct >= 0 ? "▲ +" : "▼ ";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
};

export const formatVolume = (vol: number): string => {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000)     return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
};

export const formatMarketCap = (cap: number): string => {
  if (cap >= 1_000_000_000_000) return `${(cap / 1_000_000_000_000).toFixed(1)}조`;
  if (cap >= 100_000_000)       return `${(cap / 100_000_000).toFixed(0)}억`;
  return cap.toLocaleString();
};
```

### `utils/color.ts`
```typescript
export const getPriceColor = (change: number, isDomestic = true) => {
  if (change === 0) return "text-gray-500";
  // 국내: 상승=빨강, 하락=파랑 / 해외: 상승=초록, 하락=빨강
  if (isDomestic) {
    return change > 0 ? "text-red-500" : "text-blue-500";
  }
  return change > 0 ? "text-green-500" : "text-red-500";
};

export const getRSIColor = (rsi: number): string => {
  if (rsi >= 70) return "text-red-500";
  if (rsi <= 30) return "text-blue-500";
  return "text-gray-600";
};
```

---

## 10. 환경 변수 & 실행

### `.env`
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Stock AI Analyzer
```

### 실행 방법
```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### TanStack Query 설정 (`main.tsx`)
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## 11. 라우팅 구성 (`App.tsx`)

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DashboardPage }      from "@/pages/DashboardPage";
import { StockDetailPage }    from "@/pages/StockDetailPage";
import { RecommendationPage } from "@/pages/RecommendationPage";
import { StrategyPage }       from "@/pages/StrategyPage";
import { MarketPage }         from "@/pages/MarketPage";
import { WatchlistPage }      from "@/pages/WatchlistPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                    element={<DashboardPage />} />
        <Route path="/market"              element={<MarketPage />} />
        <Route path="/stocks/:ticker"      element={<StockDetailPage />} />
        <Route path="/recommendations"     element={<RecommendationPage />} />
        <Route path="/strategies"          element={<StrategyPage />} />
        <Route path="/watchlist"           element={<WatchlistPage />} />
        <Route path="*"                    element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
```