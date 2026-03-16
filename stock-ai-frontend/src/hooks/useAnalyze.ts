import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recommendationsApi } from "@/api/recommendations";

export const useAnalyzeStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticker,
      isDomestic,
    }: {
      ticker: string;
      isDomestic: boolean;
    }) => recommendationsApi.analyzeNow(ticker, isDomestic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
};
