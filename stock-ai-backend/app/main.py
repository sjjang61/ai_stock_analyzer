from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import stocks, indicators, strategies, recommendations, analysis
from app.routers import portfolio, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Stock AI Analyzer API",
    description="주식 AI 분석 서비스 — FastAPI + 멀티 LLM",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(indicators.router)
app.include_router(strategies.router)
app.include_router(recommendations.router)
app.include_router(analysis.router)
app.include_router(portfolio.router)
app.include_router(auth.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "stock-ai-analyzer"}
