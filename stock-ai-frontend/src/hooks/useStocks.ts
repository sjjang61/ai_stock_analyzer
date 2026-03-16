import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stocksApi } from "@/api/stocks";

export const useStockSearch = (q: string, market = "ALL") =>
  useQuery({
    queryKey: ["stocks", "search", q, market],
    queryFn: () => stocksApi.search(q, market),
    enabled: q.length > 0,
    staleTime: 1000 * 60 * 5,
  });

export const useStockDetail = (ticker: string, isDomestic = true) =>
  useQuery({
    queryKey: ["stocks", "detail", ticker, isDomestic],
    queryFn: () => stocksApi.getDetail(ticker, isDomestic),
    enabled: !!ticker,
    staleTime: 1000 * 60,
  });

export const useStockPrice = (
  ticker: string,
  period = "3mo",
  isDomestic = true
) =>
  useQuery({
    queryKey: ["stocks", "price", ticker, period, isDomestic],
    queryFn: () => stocksApi.getPrice(ticker, period, isDomestic),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 10,
  });

export const useStockPriceWeekly = (ticker: string, isDomestic = true) =>
  useQuery({
    queryKey: ["stocks", "price-weekly", ticker, isDomestic],
    queryFn: () => stocksApi.getPriceWeekly(ticker, isDomestic),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 30,
  });

export const useOverseasPopular = () =>
  useQuery({
    queryKey: ["stocks", "overseas-popular"],
    queryFn: () => stocksApi.getOverseasPopular(),
    staleTime: 1000 * 60 * 60,
  });

export const useCryptoList = () =>
  useQuery({
    queryKey: ["stocks", "crypto"],
    queryFn: () => stocksApi.getCrypto(),
    staleTime: 1000 * 60 * 60,
  });

export const useOverseasStocks = (market = "ALL") =>
  useQuery({
    queryKey: ["stocks", "overseas-all", market],
    queryFn: () => stocksApi.getOverseas(market),
    staleTime: 1000 * 60 * 30,
  });

export const useDomesticStocks = (market = "KOSPI") =>
  useQuery({
    queryKey: ["stocks", "domestic-all", market],
    queryFn: () => stocksApi.getDomestic(market, false),
    staleTime: 1000 * 60 * 30,
  });

export const useSeedStatus = () =>
  useQuery({
    queryKey: ["stocks", "seed-status"],
    queryFn: () => stocksApi.getSeedStatus(),
    refetchInterval: (query) =>
      query.state.data?.running ? 2000 : false,
    staleTime: 0,
  });

export const useSeedTrigger = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stocksApi.seedStocks(true, false, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocks", "seed-status"] });
    },
  });
};
