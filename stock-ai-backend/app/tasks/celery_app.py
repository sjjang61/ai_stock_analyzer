from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "stock_ai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.data_collector",
        "app.tasks.analysis_runner",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

celery_app.conf.beat_schedule = {
    # 장 마감 후 국내 데이터 수집 (평일 16:30)
    "collect-domestic-daily": {
        "task": "app.tasks.data_collector.collect_domestic_prices",
        "schedule": crontab(hour=16, minute=30, day_of_week="1-5"),
    },
    # 미국 장 마감 후 해외 데이터 수집 (평일 07:00 KST)
    "collect-overseas-daily": {
        "task": "app.tasks.data_collector.collect_overseas_prices",
        "schedule": crontab(hour=7, minute=0, day_of_week="2-6"),
    },
    # 지표 재계산 (매일 08:00)
    "recalculate-indicators": {
        "task": "app.tasks.data_collector.recalculate_indicators",
        "schedule": crontab(hour=8, minute=0, day_of_week="1-5"),
    },
    # 전략 실행 및 AI 추천 (매일 08:30)
    "run-strategies": {
        "task": "app.tasks.analysis_runner.run_all_strategies",
        "schedule": crontab(hour=8, minute=30, day_of_week="1-5"),
    },
}
