export interface Indicator {
  stockId: string;
  date: string;
  rsi14?: number;
  rsi9?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  sma5?: number;
  sma20?: number;
  sma60?: number;
  sma120?: number;
  ema12?: number;
  ema26?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbPct?: number;
  stochK?: number;
  stochD?: number;
  atr14?: number;
  obv?: number;
  volumeSma?: number;
}
