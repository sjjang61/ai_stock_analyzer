from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_db
from app.models.strategy import Strategy, StrategyType
from app.schemas.strategy import StrategyCreate

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


@router.get("/")
async def get_strategies(db: AsyncSession = Depends(get_db)):
    """전략 목록"""
    result = await db.execute(select(Strategy).where(Strategy.is_active == True))
    strategies = result.scalars().all()
    return [
        {
            "id": s.id, "name": s.name, "type": s.type.value,
            "description": s.description, "params": s.params,
            "is_active": s.is_active,
        }
        for s in strategies
    ]


@router.post("/")
async def create_strategy(body: StrategyCreate, db: AsyncSession = Depends(get_db)):
    """전략 생성"""
    strategy = Strategy(
        name=body.name,
        type=StrategyType(body.type),
        description=body.description,
        params=body.params,
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return {"id": strategy.id, "name": strategy.name}


@router.get("/seed")
async def seed_strategies(db: AsyncSession = Depends(get_db)):
    """기본 전략 초기 데이터 삽입"""
    defaults = [
        {"name": "RSI 과매도 반등", "type": "RSI_OVERSOLD", "description": "RSI 30 이하 과매도 구간에서 반등 신호 포착", "params": {"rsi_threshold": 30}},
        {"name": "MACD 골든크로스", "type": "MACD_CROSSOVER", "description": "MACD 선이 시그널 선을 상향 돌파할 때 매수", "params": {}},
        {"name": "이동평균 골든크로스", "type": "GOLDEN_CROSS", "description": "5일선이 20일선을 상향 돌파", "params": {}},
        {"name": "볼린저 밴드 돌파", "type": "BB_BREAKOUT", "description": "볼린저 밴드 하단 접근 시 매수 신호", "params": {}},
        {"name": "이동평균 정배열", "type": "MOMENTUM", "description": "5>20>60>120 완전 정배열 확인", "params": {}},
        {"name": "거래량 급증", "type": "VOLUME_SURGE", "description": "평균 대비 2배 이상 거래량 + 상승 시 신호", "params": {"volume_ratio": 2.0}},
        {"name": "AI 종합 분석", "type": "AI_COMPOSITE", "description": "Claude AI 기반 다중 지표 종합 분석", "params": {}},
    ]

    for d in defaults:
        existing = await db.execute(select(Strategy).where(Strategy.name == d["name"]))
        if not existing.scalar_one_or_none():
            strategy = Strategy(**{**d, "type": StrategyType(d["type"])})
            db.add(strategy)

    await db.commit()
    return {"message": "기본 전략 초기화 완료"}
