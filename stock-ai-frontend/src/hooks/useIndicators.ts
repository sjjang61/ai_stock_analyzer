import { useQuery } from "@tanstack/react-query";
import { indicatorsApi } from "@/api/indicators";

export const useIndicators = (ticker: string, limit = 60) =>
  useQuery({
    queryKey: ["indicators", ticker, limit],
    queryFn: () => indicatorsApi.getList(ticker, limit),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 5,
  });

export const useLatestIndicator = (ticker: string) =>
  useQuery({
    queryKey: ["indicators", "latest", ticker],
    queryFn: () => indicatorsApi.getLatest(ticker),
    enabled: !!ticker,
    staleTime: 1000 * 60,
  });
