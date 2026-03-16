import pandas as pd
import numpy as np
import ta


class CandlestickService:
    """
    일봉 DataFrame을 받아 주봉 / 월봉으로 집계하고
    각 봉의 이동평균선을 계산하여 반환한다.
    """

    def resample_weekly(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """일봉 → 주봉 변환 (W-MON: 매주 월요일 시작 기준)"""
        df = daily_df.copy()
        df.index = pd.to_datetime(df.index)

        weekly = df.resample("W-MON", closed="left", label="left").agg(
            open=("open",   "first"),
            high=("high",   "max"),
            low=("low",    "min"),
            close=("close",  "last"),
            volume=("volume", "sum"),
        ).dropna(subset=["close"])

        weekly["sma_5w"]  = weekly["close"].rolling(5).mean()
        weekly["sma_13w"] = weekly["close"].rolling(13).mean()
        weekly["sma_26w"] = weekly["close"].rolling(26).mean()
        weekly["sma_52w"] = weekly["close"].rolling(52).mean()

        return weekly

    def resample_monthly(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """일봉 → 월봉 변환 (MS: 매월 1일 기준)"""
        df = daily_df.copy()
        df.index = pd.to_datetime(df.index)

        monthly = df.resample("MS").agg(
            open=("open",   "first"),
            high=("high",   "max"),
            low=("low",    "min"),
            close=("close",  "last"),
            volume=("volume", "sum"),
        ).dropna(subset=["close"])

        monthly["sma_3m"]  = monthly["close"].rolling(3).mean()
        monthly["sma_6m"]  = monthly["close"].rolling(6).mean()
        monthly["sma_12m"] = monthly["close"].rolling(12).mean()
        monthly["sma_24m"] = monthly["close"].rolling(24).mean()

        return monthly

    def add_daily_ma(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """일봉에 5 / 20 / 60 / 120일 이동평균선 추가"""
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
        """LLM 분석에 전달할 다중 시간프레임 데이터 패키지 생성"""
        daily   = self.add_daily_ma(daily_df)
        weekly  = self.resample_weekly(daily_df)
        monthly = self.resample_monthly(daily_df)

        def df_to_records(df: pd.DataFrame, n: int) -> list[dict]:
            tail = df.tail(n).copy()
            tail.index = tail.index.astype(str)
            return tail.round(2).replace({np.nan: None}).to_dict(orient="records")

        return {
            "daily":   df_to_records(daily,   recent_days),
            "weekly":  df_to_records(weekly,  recent_weeks),
            "monthly": df_to_records(monthly, recent_months),
        }
