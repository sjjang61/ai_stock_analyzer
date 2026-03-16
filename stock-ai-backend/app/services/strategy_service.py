import pandas as pd
from dataclasses import dataclass


@dataclass
class StrategySignal:
    signal: str      # BUY / SELL / HOLD
    score: float     # 0~100
    reason: str
    indicators: dict


class StrategyService:

    def run_rsi_oversold(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """RSI 과매도 반등 전략"""
        threshold = params.get("rsi_threshold", 30)
        latest, prev = df.iloc[-1], df.iloc[-2]
        rsi_now, rsi_prev = latest["rsi_14"], prev["rsi_14"]

        if rsi_prev < threshold and rsi_now > rsi_prev:
            return StrategySignal("BUY", min(100, (threshold - rsi_prev) * 3), f"RSI {rsi_now:.1f} — 과매도 반등", {"rsi": rsi_now})
        elif rsi_now > 70:
            return StrategySignal("SELL", 70.0, f"RSI {rsi_now:.1f} — 과매수", {"rsi": rsi_now})
        return StrategySignal("HOLD", 50.0, f"RSI {rsi_now:.1f} — 중립", {"rsi": rsi_now})

    def run_macd_crossover(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """MACD 골든크로스 / 데드크로스"""
        latest, prev = df.iloc[-1], df.iloc[-2]
        golden = prev["macd"] < prev["macd_signal"] and latest["macd"] > latest["macd_signal"]
        dead   = prev["macd"] > prev["macd_signal"] and latest["macd"] < latest["macd_signal"]

        if golden: return StrategySignal("BUY",  80.0, "MACD 골든크로스", {"macd": latest["macd"]})
        if dead:   return StrategySignal("SELL", 75.0, "MACD 데드크로스", {"macd": latest["macd"]})
        return StrategySignal("HOLD", 50.0, "MACD 크로스 없음", {})

    def run_golden_cross(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """5/20일선 골든크로스"""
        latest, prev = df.iloc[-1], df.iloc[-2]
        if prev["sma_5"] < prev["sma_20"] and latest["sma_5"] > latest["sma_20"]:
            return StrategySignal("BUY",  78.0, "5일선 20일선 골든크로스", {"sma5": latest["sma_5"]})
        if prev["sma_5"] > prev["sma_20"] and latest["sma_5"] < latest["sma_20"]:
            return StrategySignal("SELL", 72.0, "5일선 20일선 데드크로스", {"sma5": latest["sma_5"]})
        return StrategySignal("HOLD", 50.0, "크로스 없음", {})

    def run_ma_arrangement(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """이동평균선 정배열/역배열 전략 (5>20>60>120)"""
        latest = df.iloc[-1]
        sma5, sma20, sma60, sma120 = (
            latest.get("sma_5"), latest.get("sma_20"),
            latest.get("sma_60"), latest.get("sma_120")
        )
        if None in [sma5, sma20, sma60, sma120]:
            return StrategySignal("HOLD", 50.0, "이동평균 데이터 부족", {})

        if sma5 > sma20 > sma60 > sma120:
            return StrategySignal("BUY",  85.0, "완전 정배열 — 강력 상승 추세", {"arrangement": "정배열"})
        if sma5 < sma20 < sma60 < sma120:
            return StrategySignal("SELL", 82.0, "완전 역배열 — 강력 하락 추세", {"arrangement": "역배열"})
        return StrategySignal("HOLD", 55.0, "이동평균 혼재", {"arrangement": "혼재"})

    def run_bb_breakout(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """볼린저 밴드 돌파"""
        pct = df.iloc[-1]["bb_pct"]
        if pct < 0.05:  return StrategySignal("BUY",  85.0, f"볼린저 하단 (BB%: {pct:.2f})", {"bb_pct": pct})
        if pct > 0.95:  return StrategySignal("SELL", 80.0, f"볼린저 상단 (BB%: {pct:.2f})", {"bb_pct": pct})
        return StrategySignal("HOLD", 50.0, f"볼린저 중립 (BB%: {pct:.2f})", {"bb_pct": pct})

    def run_volume_surge(self, df: pd.DataFrame, params: dict) -> StrategySignal:
        """거래량 급증"""
        latest    = df.iloc[-1]
        vol_ratio = params.get("volume_ratio", 2.0)
        ratio     = latest["volume"] / (latest["volume_sma"] or 1)
        if ratio > vol_ratio and latest["close"] > latest["sma_5"]:
            return StrategySignal("BUY", min(100, ratio * 20), f"거래량 급증 ({ratio:.1f}배)", {"vol_ratio": ratio})
        return StrategySignal("HOLD", 50.0, "거래량 정상", {})

    def run_all(self, df: pd.DataFrame) -> list[dict]:
        """모든 전략 실행 후 결과 목록 반환"""
        results = []
        strategies = [
            ("RSI_OVERSOLD",   self.run_rsi_oversold,   {}),
            ("MACD_CROSSOVER", self.run_macd_crossover,  {}),
            ("GOLDEN_CROSS",   self.run_golden_cross,    {}),
            ("MA_ARRANGEMENT", self.run_ma_arrangement,  {}),
            ("BB_BREAKOUT",    self.run_bb_breakout,     {}),
            ("VOLUME_SURGE",   self.run_volume_surge,    {}),
        ]
        for name, fn, params in strategies:
            try:
                sig = fn(df, params)
                results.append({
                    "strategy": name,
                    "signal":   sig.signal,
                    "score":    sig.score,
                    "reason":   sig.reason,
                    "indicators": sig.indicators,
                })
            except Exception:
                pass
        return results
