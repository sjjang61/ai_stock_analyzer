import pandas as pd
import ta


def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    df: OHLCV DataFrame (date index, open/high/low/close/volume columns)
    return: 지표가 추가된 DataFrame
    """
    close = df["close"]
    high  = df["high"]
    low   = df["low"]
    vol   = df["volume"]

    # ── RSI ──────────────────────────────
    df["rsi_14"] = ta.momentum.RSIIndicator(close, window=14).rsi()
    df["rsi_9"]  = ta.momentum.RSIIndicator(close, window=9).rsi()

    # ── MACD ─────────────────────────────
    macd_obj = ta.trend.MACD(close, window_slow=26, window_fast=12, window_sign=9)
    df["macd"]        = macd_obj.macd()
    df["macd_signal"] = macd_obj.macd_signal()
    df["macd_hist"]   = macd_obj.macd_diff()

    # ── 이동평균 ──────────────────────────
    for w in [5, 20, 60, 120]:
        df[f"sma_{w}"] = ta.trend.SMAIndicator(close, window=w).sma_indicator()
    df["ema_12"] = ta.trend.EMAIndicator(close, window=12).ema_indicator()
    df["ema_26"] = ta.trend.EMAIndicator(close, window=26).ema_indicator()

    # ── 볼린저 밴드 ───────────────────────
    bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
    df["bb_upper"]  = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"]  = bb.bollinger_lband()
    df["bb_width"]  = bb.bollinger_wband()
    df["bb_pct"]    = bb.bollinger_pband()

    # ── Stochastic ────────────────────────
    stoch = ta.momentum.StochasticOscillator(high, low, close, window=14, smooth_window=3)
    df["stoch_k"] = stoch.stoch()
    df["stoch_d"] = stoch.stoch_signal()

    # ── 기타 ─────────────────────────────
    df["atr_14"]     = ta.volatility.AverageTrueRange(high, low, close, window=14).average_true_range()
    df["obv"]        = ta.volume.OnBalanceVolumeIndicator(close, vol).on_balance_volume()
    df["volume_sma"] = ta.trend.SMAIndicator(vol, window=20).sma_indicator()

    return df
