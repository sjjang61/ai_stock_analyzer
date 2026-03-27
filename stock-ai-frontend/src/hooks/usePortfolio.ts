import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/api/portfolio";

const KEY        = ["portfolio"];
const PRICES_KEY = ["portfolio", "prices"];

export const usePortfolio = () =>
  useQuery({
    queryKey: KEY,
    queryFn: portfolioApi.getList,
    staleTime: 1000 * 60,
  });

export const usePortfolioPrices = (enabled: boolean) =>
  useQuery({
    queryKey: PRICES_KEY,
    queryFn: portfolioApi.getPrices,
    enabled,
    staleTime: 1000 * 60,          // 1분 캐시
    refetchInterval: 1000 * 60 * 3, // 3분마다 자동 갱신
  });

export const useAddPortfolio = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: portfolioApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUpdatePortfolio = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { avg_price?: number; quantity?: number; memo?: string; group_name?: string } }) =>
      portfolioApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useRemovePortfolio = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: portfolioApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useAnalyzePortfolio = () =>
  useMutation({
    mutationFn: portfolioApi.analyze,
  });
