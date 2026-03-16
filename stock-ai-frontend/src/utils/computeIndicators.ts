interface PriceRow {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function computeRSI(closes: number[], period = 14): (number | undefined)[] {
  const result: (number | undefined)[] = new Array(period).fill(undefined);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d;
    else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;

  const toRSI = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  result.push(toRSI(avgGain, avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result.push(toRSI(avgGain, avgLoss));
  }
  return result;
}

function computeBollinger(closes: number[], period = 20, mult = 2) {
  const upper: (number | undefined)[] = [];
  const middle: (number | undefined)[] = [];
  const lower: (number | undefined)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(undefined);
      middle.push(undefined);
      lower.push(undefined);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - avg) ** 2, 0) / period);
    upper.push(avg + mult * std);
    middle.push(avg);
    lower.push(avg - mult * std);
  }
  return { upper, middle, lower };
}

function computeSMA(closes: number[], period: number): (number | undefined)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return undefined;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function computeIndicators(prices: PriceRow[]) {
  if (!prices || prices.length < 30) return prices;

  const closes = prices.map((p) => p.close);
  const rsi = computeRSI(closes, 14);

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - signalLine[i]);

  const bb = computeBollinger(closes, 20, 2);
  const sma5  = computeSMA(closes, 5);
  const sma20 = computeSMA(closes, 20);
  const sma60 = computeSMA(closes, 60);
  const sma120 = computeSMA(closes, 120);

  return prices.map((p, i) => ({
    ...p,
    sma_5:   sma5[i],
    sma_20:  sma20[i],
    sma_60:  sma60[i],
    sma_120: sma120[i],
    rsi_14: rsi[i],
    macd: macdLine[i],
    macd_signal: signalLine[i],
    macd_hist: hist[i],
    bb_upper: bb.upper[i],
    bb_middle: bb.middle[i],
    bb_lower: bb.lower[i],
  }));
}
