from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # DB
    DB_HOST: str = "db"
    DB_PORT: int = 3306
    DB_USER: str = "stock_user"
    DB_PASSWORD: str = "stock_pass"
    DB_NAME: str = "stock_db"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/1"

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

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7일

    # Kakao OAuth
    KAKAO_CLIENT_ID: str = ""
    KAKAO_CLIENT_SECRET: str = ""
    KAKAO_REDIRECT_URI: str = "http://localhost:8000/api/auth/kakao/callback"

    # Naver OAuth
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""
    NAVER_REDIRECT_URI: str = "http://localhost:8000/api/auth/naver/callback"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        # 로컬 실행 시 루트 .env → 서브폴더 .env 순으로 탐색
        # Docker에서는 env_file 지시자로 환경변수가 주입되므로 파일 불필요
        env_file = ("../.env", ".env")
        extra = "ignore"  # VITE_* 등 프론트엔드 전용 변수 무시


settings = Settings()
