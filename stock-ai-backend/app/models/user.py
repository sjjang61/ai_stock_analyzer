from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    email         = Column(String(255), unique=True, nullable=True, index=True)
    username      = Column(String(100), unique=True, nullable=False)
    hashed_pw     = Column(String(255), nullable=True)   # 소셜 로그인은 비밀번호 없음
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())

    # 소셜 로그인 필드
    provider      = Column(String(20), nullable=True)    # "kakao" | "naver"
    provider_id   = Column(String(100), nullable=True, index=True)
    nickname      = Column(String(100), nullable=True)
    profile_image = Column(String(500), nullable=True)
