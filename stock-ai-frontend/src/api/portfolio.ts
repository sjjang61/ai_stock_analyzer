import { apiClient } from "./client";
import type { PortfolioItem, PortfolioAnalysisResult } from "@/types/portfolio";

interface CreatePayload {
  ticker:      string;
  name:        string;
  market:      string;
  is_domestic: boolean;
  avg_price:   number;
  quantity:    number;
  memo?:       string;
  group_name?: string;
}

interface UpdatePayload {
  avg_price?:  number;
  quantity?:   number;
  memo?:       string;
  group_name?: string;
}

export const portfolioApi = {
  getList: () =>
    apiClient.get("/api/portfolio") as Promise<PortfolioItem[]>,

  getPrices: () =>
    apiClient.get("/api/portfolio/prices") as Promise<Record<string, number | null>>,

  create: (payload: CreatePayload) =>
    apiClient.post("/api/portfolio", payload) as Promise<PortfolioItem>,

  update: (id: number, payload: UpdatePayload) =>
    apiClient.put(`/api/portfolio/${id}`, payload) as Promise<PortfolioItem>,

  remove: (id: number) =>
    apiClient.delete(`/api/portfolio/${id}`) as Promise<{ ok: boolean }>,

  analyze: (id: number) =>
    apiClient.post(`/api/portfolio/${id}/analyze`) as Promise<PortfolioAnalysisResult>,
};
