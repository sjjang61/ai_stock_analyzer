from datetime import datetime, timedelta


def get_date_range(period: str) -> tuple[str, str]:
    """period 문자열을 (start, end) 날짜 문자열로 변환"""
    end = datetime.now()
    period_map = {
        "1mo":  30,
        "3mo":  90,
        "6mo":  180,
        "1y":   365,
        "3y":   1095,
        "5y":   1825,
    }
    days = period_map.get(period, 90)
    start = end - timedelta(days=days)
    return start.strftime("%Y%m%d"), end.strftime("%Y%m%d")


def safe_float(value) -> float | None:
    """None-safe float 변환"""
    try:
        if value is None:
            return None
        f = float(value)
        return None if f != f else f   # NaN check
    except (TypeError, ValueError):
        return None
