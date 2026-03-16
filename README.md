# AI Stock Analyzer

AI 기반 주식 분석 플랫폼. 국내(KRX/KOSPI/KOSDAQ) 및 해외 주식 데이터를 실시간으로 수집하고,
Anthropic Claude / OpenAI GPT / Google Gemini 를 활용한 AI 분석 결과를 제공합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11, FastAPI 0.111, SQLAlchemy 2.0 (async), Alembic |
| Database | MySQL 8.0, Redis 7 |
| Task Queue | Celery 5.4 (worker + beat) |
| LLM | Anthropic Claude / OpenAI GPT / Google Gemini (환경변수로 전환) |
| 데이터 | pykrx (국내), yfinance (해외), ta (기술적 지표) |
| Frontend | React 18, TypeScript, Vite 5, TailwindCSS, Recharts |
| 인프라 | Docker Compose |

---

## 프로젝트 구조

```
ai_stock_analyzer/
├── docker-compose.yml          # 전체 환경 오케스트레이션
├── .env.example                # 환경변수 템플릿
├── .env                        # 실제 환경변수 (git-ignored)
├── stock-ai-backend/           # FastAPI 백엔드
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI 앱 진입점, 라우터 등록
│       ├── config.py           # Pydantic Settings (.env 파싱)
│       ├── database.py         # AsyncSession 설정
│       ├── routers/            # API 엔드포인트
│       ├── services/           # 비즈니스 로직 (KRX, yfinance, AI 분석)
│       ├── models/             # SQLAlchemy ORM 모델
│       ├── llm/                # 멀티 LLM 프로바이더 (Factory 패턴)
│       └── tasks/              # Celery 비동기 작업
└── stock-ai-frontend/          # React 프론트엔드
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx             # 루트 컴포넌트 & 라우팅
        ├── pages/              # Dashboard, StockDetail, Recommendation, Strategy, Market, Watchlist
        ├── components/         # 재사용 UI 컴포넌트
        ├── api/client.ts       # Axios 인스턴스
        ├── hooks/              # 커스텀 React 훅
        └── store/              # Zustand 상태 관리
```

---

## 환경 설정

루트 디렉토리의 `.env.example`을 복사하여 `.env`를 생성합니다.

```bash
cp .env.example .env
```

`.env` 파일을 열어 필수 값을 설정합니다.

```dotenv
# ─── Database ───────────────────────────────────────────────
DB_HOST=db
DB_PORT=3306
DB_USER=stock_user
DB_PASSWORD=stock_pass
DB_NAME=stock_db

# ─── Redis & Celery ─────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379

# ─── LLM 선택 (anthropic | openai | gemini) ─────────────────
LLM_TYPE=anthropic

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# OpenAI GPT (LLM_TYPE=openai 시 사용)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Google Gemini (LLM_TYPE=gemini 시 사용)
GEMINI_API_KEY=AIza-your-key-here
GEMINI_MODEL=gemini-1.5-pro

# ─── LLM 공통 ────────────────────────────────────────────────
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.2

# ─── App ─────────────────────────────────────────────────────
APP_ENV=development
SECRET_KEY=your-secret-key-change-in-production
VITE_API_URL=http://localhost:8000
```

> **참고:** `.env` 파일 하나로 백엔드와 프론트엔드가 모두 환경변수를 읽습니다.
> - Backend (`config.py`): `("../.env", ".env")` 순서로 로드
> - Frontend (`vite.config.ts`): `envDir`을 루트(`../`)로 설정

---

## 실행 방법

### Docker Compose (권장)

```bash
# 전체 서비스 빌드 & 실행
docker-compose up -d --build

# 실행 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f api
docker-compose logs -f frontend
```

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |
| API 문서 (ReDoc) | http://localhost:8000/redoc |

#### 첫 실행 시 초기 데이터 설정

```bash
# 기본 투자 전략 데이터 초기화
curl http://localhost:8000/api/strategies/seed
```

#### 종목 데이터 시딩 (stocks 테이블)

국내(KOSPI/KOSDAQ) 및 해외(NASDAQ/NYSE/AMEX) 전체 종목을 DB에 저장합니다.

```bash
# 국내 + 해외 전체 시딩 (기본값, 약 9,500개)
uv run python stock-ai-backend/scripts/seed_stocks.py

# 국내 종목만 (KOSPI ~950개 + KOSDAQ ~1,770개)
uv run python stock-ai-backend/scripts/seed_stocks.py --domestic

# 해외 종목만 (NASDAQ ~3,840개 + NYSE ~2,730개 + AMEX ~300개)
uv run python stock-ai-backend/scripts/seed_stocks.py --overseas
```

> **참고:** 데이터 소스로 `FinanceDataReader`(네이버 금융 기반)를 사용하므로 KRX 데이터포털 접근 없이도 동작합니다.
> 이미 존재하는 종목은 이름만 갱신(UPSERT)되며 중복 저장되지 않습니다.

---

### 로컬 개발 (Docker 없이)

#### Backend

```bash
# uv 설치 (미설치 시)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 가상환경 생성 및 의존성 설치 (루트에서 실행)
uv sync

# 서버 실행 (루트에서 실행)
uv run uvicorn app.main:app --app-dir stock-ai-backend --reload --port 8000
```

#### Frontend

```bash
cd stock-ai-frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

> **Node 버전:** v20 LTS 이상 권장

---

## 주요 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 헬스체크 |
| GET | `/api/stocks/search?q={keyword}` | 종목 검색 |
| GET | `/api/stocks/overseas/popular` | 해외 인기 종목 목록 |
| POST | `/api/recommendations/analyze/{ticker}` | 실시간 AI 분석 |
| GET | `/api/strategies/` | 투자 전략 목록 |
| GET | `/api/strategies/seed` | 기본 전략 초기화 |
| GET | `/api/indicators/{ticker}` | 기술적 지표 조회 |
| GET | `/api/llm/current` | 현재 LLM 프로바이더 정보 |

전체 API 목록은 http://localhost:8000/docs 에서 확인할 수 있습니다.

---

## Docker 서비스 구성

```
docker-compose.yml
├── db        — MySQL 8.0  (port 3306)
├── redis     — Redis 7    (port 6379)
├── api       — FastAPI    (port 8000)  ← db, redis 의존
├── worker    — Celery Worker           ← db, redis 의존
├── beat      — Celery Beat (스케줄러)  ← redis 의존
└── frontend  — Vite Dev   (port 5173) ← api 의존
```

---

## LLM 전환

`LLM_TYPE` 환경변수 하나로 LLM 프로바이더를 전환할 수 있습니다.

```dotenv
LLM_TYPE=anthropic   # Claude (기본)
LLM_TYPE=openai      # GPT-4o
LLM_TYPE=gemini      # Gemini 1.5 Pro
```

변경 후 `docker-compose restart api worker` 로 재시작합니다.

---

## 데이터베이스 마이그레이션

```bash
# 컨테이너 내부에서 실행
docker-compose exec api alembic revision --autogenerate -m "description"
docker-compose exec api alembic upgrade head

# 로컬에서 실행
cd stock-ai-backend
alembic upgrade head
```

---

## 유용한 명령어

```bash
# 특정 서비스만 재시작
docker-compose restart api

# 모든 컨테이너 중지 & 볼륨 삭제 (DB 초기화 포함)
docker-compose down -v

# 컨테이너 내부 접속
docker-compose exec api bash
docker-compose exec db mysql -u stock_user -pstock_pass stock_db

# Celery 작업 상태 확인
docker-compose exec worker celery -A app.tasks.celery_app inspect active
```
