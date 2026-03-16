import { apiClient } from "./client";
import type { Recommendation, AnalysisResult } from "@/types/recommendation";

export const recommendationsApi = {
  getList: (params?: {
    strategy?: string;
    signal?: string;
    market?: string;
    limit?: number;
  }) => apiClient.get<Recommendation[]>("/api/recommendations", { params }) as Promise<Recommendation[]>,

  getToday: () =>
    apiClient.get<Record<string, Recommendation[]>>("/api/recommendations/today") as Promise<Record<string, Recommendation[]>>,

  analyzeNow: (ticker: string, isDomestic = true) =>
    apiClient.post<AnalysisResult>(`/api/recommendations/analyze/${ticker}`, null, {
      params: { is_domestic: isDomestic },
    }) as Promise<AnalysisResult>,

  getStrategies: () =>
    apiClient.get("/api/strategies") as Promise<any[]>,

  getMarketInsight: (market = "KOSPI") =>
    apiClient.get("/api/market/insight", { params: { market } }) as Promise<{ market: string; insight: string }>,
};
