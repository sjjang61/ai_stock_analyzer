"""
카카오 / 네이버 소셜 로그인 라우터
흐름: 프론트 → GET /api/auth/{provider} → 302 OAuth 로그인 페이지
      OAuth 서버 → GET /api/auth/{provider}/callback?code=... → JWT 발급 → 프론트로 302
"""
from __future__ import annotations

import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── JWT 헬퍼 ────────────────────────────────────────────────────────────────

def _create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


async def get_current_user(
    token: str,
    db: AsyncSession,
) -> User:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ─── 공통: DB에서 소셜 유저 조회 또는 생성 ──────────────────────────────────

async def _get_or_create_user(
    db: AsyncSession,
    *,
    provider: str,
    provider_id: str,
    email: str | None,
    nickname: str,
    profile_image: str | None,
) -> User:
    result = await db.execute(
        select(User).where(
            User.provider == provider, User.provider_id == provider_id
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        # 기존 이메일 계정과 병합 (선택적)
        if email:
            result2 = await db.execute(select(User).where(User.email == email))
            user = result2.scalar_one_or_none()

        if user is None:
            # 신규 유저 생성
            safe_nick = nickname or f"{provider}_user_{secrets.token_hex(4)}"
            user = User(
                email=email,
                username=safe_nick,
                provider=provider,
                provider_id=provider_id,
                nickname=nickname,
                profile_image=profile_image,
            )
            db.add(user)
        else:
            # 기존 이메일 계정에 소셜 정보 연결
            user.provider = provider
            user.provider_id = provider_id

    # 프로필 최신화
    user.nickname = nickname
    user.profile_image = profile_image

    await db.commit()
    await db.refresh(user)
    return user


# ─── 카카오 ──────────────────────────────────────────────────────────────────

@router.get("/kakao")
async def kakao_login():
    """카카오 OAuth 로그인 페이지로 리다이렉트"""
    params = {
        "client_id": settings.KAKAO_CLIENT_ID,
        "redirect_uri": settings.KAKAO_REDIRECT_URI,
        "response_type": "code",
    }
    url = "https://kauth.kakao.com/oauth/authorize?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@router.get("/kakao/callback")
async def kakao_callback(code: str, db: AsyncSession = Depends(get_db)):
    """카카오 콜백: code → access_token → 사용자 정보 → JWT 발급"""
    # 1. access_token 교환
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.KAKAO_CLIENT_ID,
                "client_secret": settings.KAKAO_CLIENT_SECRET,
                "redirect_uri": settings.KAKAO_REDIRECT_URI,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="카카오 토큰 교환 실패")

    access_token = token_res.json().get("access_token")

    # 2. 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

    if user_res.status_code != 200:
        raise HTTPException(status_code=400, detail="카카오 사용자 정보 조회 실패")

    data = user_res.json()
    kakao_account = data.get("kakao_account", {})
    profile = kakao_account.get("profile", {})

    provider_id = str(data["id"])
    email = kakao_account.get("email")
    nickname = profile.get("nickname", f"카카오유저_{secrets.token_hex(3)}")
    profile_image = profile.get("profile_image_url")

    # 3. DB 유저 조회/생성
    user = await _get_or_create_user(
        db,
        provider="kakao",
        provider_id=provider_id,
        email=email,
        nickname=nickname,
        profile_image=profile_image,
    )

    # 4. JWT 발급 후 프론트엔드로 리다이렉트
    jwt_token = _create_token(user.id)
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}"
    return RedirectResponse(redirect_url)


# ─── 네이버 ──────────────────────────────────────────────────────────────────

@router.get("/naver")
async def naver_login():
    """네이버 OAuth 로그인 페이지로 리다이렉트"""
    state = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": settings.NAVER_CLIENT_ID,
        "redirect_uri": settings.NAVER_REDIRECT_URI,
        "state": state,
    }
    url = "https://nid.naver.com/oauth2.0/authorize?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@router.get("/naver/callback")
async def naver_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """네이버 콜백: code → access_token → 사용자 정보 → JWT 발급"""
    # 1. access_token 교환
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://nid.naver.com/oauth2.0/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.NAVER_CLIENT_ID,
                "client_secret": settings.NAVER_CLIENT_SECRET,
                "code": code,
                "state": state,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="네이버 토큰 교환 실패")

    access_token = token_res.json().get("access_token")

    # 2. 사용자 정보 조회
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

    if user_res.status_code != 200:
        raise HTTPException(status_code=400, detail="네이버 사용자 정보 조회 실패")

    info = user_res.json().get("response", {})
    provider_id = info.get("id", "")
    email = info.get("email")
    nickname = info.get("nickname") or info.get("name") or f"네이버유저_{secrets.token_hex(3)}"
    profile_image = info.get("profile_image")

    # 3. DB 유저 조회/생성
    user = await _get_or_create_user(
        db,
        provider="naver",
        provider_id=provider_id,
        email=email,
        nickname=nickname,
        profile_image=profile_image,
    )

    # 4. JWT 발급 후 프론트엔드로 리다이렉트
    jwt_token = _create_token(user.id)
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}"
    return RedirectResponse(redirect_url)


# ─── 내 정보 조회 ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(token: str, db: AsyncSession = Depends(get_db)):
    """JWT 토큰으로 현재 사용자 정보 반환"""
    user = await get_current_user(token, db)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "nickname": user.nickname,
        "profile_image": user.profile_image,
        "provider": user.provider,
    }
