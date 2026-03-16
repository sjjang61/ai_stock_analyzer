import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "@/api/recommendations";

export const useRecommendations = (params?: {
  strategy?: string;
  signal?: string;
  market?: string;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["recommendations", params],
    queryFn: () => recommendationsApi.getList(params),
    staleTime: 1000 * 60 * 5,
  });

export const useTodayRecommendations = () =>
  useQuery({
    queryKey: ["recommendations", "today"],
    queryFn: () => recommendationsApi.getToday(),
    staleTime: 1000 * 60 * 10,
  });

export const useMarketInsight = (market = "KOSPI") =>
  useQuery({
    queryKey: ["market-insight", market],
    queryFn: () => recommendationsApi.getMarketInsight(market),
    staleTime: 1000 * 60 * 30,
  });
