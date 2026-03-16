import { apiClient } from "./client";
import type { StockSearchResult, StockDetail } from "@/types/stock";

export const stocksApi = {
  search: (q: string, market = "ALL") =>
    apiClient.get<StockSearchResult[]>("/api/stocks/search", { params: { q, market } }) as Promise<StockSearchResult[]>,

  getDomestic: (market = "KOSPI", withPrice = true) =>
    apiClient.get<StockSearchResult[]>("/api/stocks/domestic", { params: { market, with_price: withPrice } }) as Promise<StockSearchResult[]>,

  getOverseasPopular: () =>
    apiClient.get<StockSearchResult[]>("/api/stocks/overseas/popular") as Promise<StockSearchResult[]>,

  getCrypto: () =>
    apiClient.get<StockSearchResult[]>("/api/stocks/crypto") as Promise<StockSearchResult[]>,

  getOverseas: (market = "ALL") =>
    apiClient.get<StockSearchResult[]>("/api/stocks/overseas", { params: { market } }) as Promise<StockSearchResult[]>,

  getDetail: (ticker: string, isDomestic = true) =>
    apiClient.get<StockDetail>(`/api/stocks/${ticker}`, {
      params: { is_domestic: isDomestic },
    }) as Promise<StockDetail>,

  getPrice: (ticker: string, period = "3mo", isDomestic = true) =>
    apiClient.get(`/api/stocks/${ticker}/price`, {
      params: { period, is_domestic: isDomestic },
    }) as Promise<any[]>,

  getPriceWeekly: (ticker: string, isDomestic = true) =>
    apiClient.get(`/api/stocks/${ticker}/price/weekly`, {
      params: { is_domestic: isDomestic },
    }) as Promise<any[]>,

  getPriceMonthly: (ticker: string, isDomestic = true) =>
    apiClient.get(`/api/stocks/${ticker}/price/monthly`, {
      params: { is_domestic: isDomestic },
    }) as Promise<any[]>,

  getMarcap: (market = "KOSPI", refresh = false) =>
    apiClient.get<{
      market: string;
      data: Array<{
        rank: number;
        ticker: string;
        name: string;
        current_price: number | null;
        change: number | null;
        change_pct: number | null;
        volume: number | null;
        market_cap: number | null;
        per: number | null;
        roe: number | null;
      }>;
      updated_at: number;
      cached: boolean;
    }>("/api/stocks/domestic/marcap", { params: { market, refresh } }) as Promise<{
      market: string;
      data: Array<{
        rank: number;
        ticker: string;
        name: string;
        current_price: number | null;
        change: number | null;
        change_pct: number | null;
        volume: number | null;
        market_cap: number | null;
        per: number | null;
        roe: number | null;
      }>;
      updated_at: number;
      cached: boolean;
    }>,

  seedStocks: (domestic = true, overseas = false, crypto = false) =>
    apiClient.post<{ message: string }>("/api/stocks/seed", null, {
      params: { domestic, overseas, crypto },
    }) as Promise<{ message: string }>,

  getSeedStatus: () =>
    apiClient.get<{
      running: boolean;
      domestic_done: number;
      overseas_done: number;
      crypto_done: number;
      error: string | null;
      last_run: string | null;
    }>("/api/stocks/seed/status") as Promise<{
      running: boolean;
      domestic_done: number;
      overseas_done: number;
      crypto_done: number;
      error: string | null;
      last_run: string | null;
    }>,
};
