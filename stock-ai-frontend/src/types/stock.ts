export type MarketType = "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX" | "CRYPTO";

export interface Stock {
  id: string;
  name: string;
  nameEn?: string;
  market: MarketType | string;
  sector?: string;
  industry?: string;
  isDomestic: boolean;
  isActive: boolean;
}

export interface StockPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface StockDetail extends Stock {
  currentPrice?: number;
  changeAmount?: number;
  changePct?: number;
  high52w?: number;
  low52w?: number;
  marketCap?: number;
  per?: number;
  pbr?: number;
  dividendYield?: number;
}

export interface StockSearchResult {
  id: string;
  name: string;
  market: string;
  is_domestic: boolean;
  is_crypto?: boolean;
}
