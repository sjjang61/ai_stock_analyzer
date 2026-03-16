import pandas as pd
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.stock_indicator import StockIndicator
from app.utils.indicators import calculate_all_indicators


class IndicatorService:

    async def calculate_and_save(
        self,
        db: AsyncSession,
        stock_id: str,
        df: pd.DataFrame,
    ) -> None:
        """지표 계산 후 DB 저장 (upsert)"""
        df = calculate_all_indicators(df.copy())

        for idx, row in df.iterrows():
            row_date = idx.date() if hasattr(idx, "date") else idx

            existing = await db.execute(
                select(StockIndicator).where(
                    StockIndicator.stock_id == stock_id,
                    StockIndicator.date == row_date,
                )
            )
            indicator = existing.scalar_one_or_none()

            values = {
                "rsi_14":     self._safe(row.get("rsi_14")),
                "rsi_9":      self._safe(row.get("rsi_9")),
                "macd":       self._safe(row.get("macd")),
                "macd_signal":self._safe(row.get("macd_signal")),
                "macd_hist":  self._safe(row.get("macd_hist")),
                "sma_5":      self._safe(row.get("sma_5")),
                "sma_20":     self._safe(row.get("sma_20")),
                "sma_60":     self._safe(row.get("sma_60")),
                "sma_120":    self._safe(row.get("sma_120")),
                "ema_12":     self._safe(row.get("ema_12")),
                "ema_26":     self._safe(row.get("ema_26")),
                "bb_upper":   self._safe(row.get("bb_upper")),
                "bb_middle":  self._safe(row.get("bb_middle")),
                "bb_lower":   self._safe(row.get("bb_lower")),
                "bb_width":   self._safe(row.get("bb_width")),
                "bb_pct":     self._safe(row.get("bb_pct")),
                "stoch_k":    self._safe(row.get("stoch_k")),
                "stoch_d":    self._safe(row.get("stoch_d")),
                "atr_14":     self._safe(row.get("atr_14")),
                "obv":        self._safe(row.get("obv")),
                "volume_sma": self._safe(row.get("volume_sma")),
            }

            if indicator:
                for k, v in values.items():
                    setattr(indicator, k, v)
            else:
                indicator = StockIndicator(stock_id=stock_id, date=row_date, **values)
                db.add(indicator)

        await db.commit()

    async def get_latest(self, db: AsyncSession, stock_id: str) -> dict:
        """최신 지표 조회"""
        result = await db.execute(
            select(StockIndicator)
            .where(StockIndicator.stock_id == stock_id)
            .order_by(desc(StockIndicator.date))
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if not row:
            return {}
        return {
            "rsi_14": row.rsi_14, "rsi_9": row.rsi_9,
            "macd": row.macd, "macd_signal": row.macd_signal, "macd_hist": row.macd_hist,
            "sma_5": row.sma_5, "sma_20": row.sma_20, "sma_60": row.sma_60, "sma_120": row.sma_120,
            "bb_upper": row.bb_upper, "bb_middle": row.bb_middle, "bb_lower": row.bb_lower,
            "bb_pct": row.bb_pct,
            "stoch_k": row.stoch_k, "stoch_d": row.stoch_d,
            "atr_14": row.atr_14, "obv": row.obv,
        }

    def _safe(self, val) -> float | None:
        """NaN-safe float 변환"""
        try:
            if val is None:
                return None
            f = float(val)
            return None if f != f else f
        except (TypeError, ValueError):
            return None
