import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Star, Brain, RefreshCw } from "lucide-react";
import { useStockDetail, useStockPrice } from "@/hooks/useStocks";
import { useAnalyzeStock } from "@/hooks/useAnalyze";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { StockPriceChart } from "@/components/stock/StockPriceChart";
import { IndicatorPanel } from "@/components/indicators/IndicatorPanel";
import { AIAnalysisBox } from "@/components/recommendation/AIAnalysisBox";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { computeIndicators } from "@/utils/computeIndicators";
import type { AnalysisResult } from "@/types/recommendation";

const PERIODS = [
  { key: "1mo",  label: "1M" },
  { key: "3mo",  label: "3M" },
  { key: "6mo",  label: "6M" },
  { key: "1y",   label: "1Y" },
  { key: "3y",   label: "3Y" },
];

export const StockDetailPage = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [searchParams] = useSearchParams();
  const isDomestic = searchParams.get("domestic") !== "false";

  const [period, setPeriod] = useState("3mo");
  const [showMA, setShowMA] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: detail } = useStockDetail(ticker!, isDomestic);
  const { data: prices, isLoading: pricesLoading } = useStockPrice(ticker!, period, isDomestic);
  const { has, add, remove } = useWatchlistStore();
  const inWatchlist = has(ticker!);
  const { mutate: analyze, isPending: analyzing } = useAnalyzeStock();

  const currentPrice = prices?.[prices.length - 1]?.close;
  const pricesWithIndicators = useMemo(() => computeIndicators(prices ?? []), [prices]);

  const handleAnalyze = () => {
    analyze(
      { ticker: ticker!, isDomestic },
      {
        onSuccess: (data) => {
          setAnalysisResult(data);
          setShowModal(true);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{detail?.name ?? ticker}</h1>
            <button
              disabled={!detail}
              onClick={() => {
                if (inWatchlist) {
                  remove(ticker!);
                } else {
                  add({
                    ticker: ticker!,
                    name: detail!.name,
                    market: detail!.market,
                    isDomestic,
                  });
                }
              }}
            >
              <Star
                size={20}
                className={inWatchlist ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
              />
            </button>
          </div>
          <p className="text-gray-400 text-sm font-mono">{ticker} · {isDomestic ? "국내 주식" : "해외 주식"}</p>
          {currentPrice && (
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {isDomestic ? "₩" : "$"}{currentPrice.toLocaleString()}
            </p>
          )}
        </div>

        <Button
          onClick={handleAnalyze}
          loading={analyzing}
          className="gap-2"
        >
          <Brain size={16} />
          AI 분석하기
        </Button>
      </div>

      {/* 기간 탭 */}
      <div className="flex items-center gap-3">
        <Tabs
          tabs={PERIODS}
          active={period}
          onChange={setPeriod}
        />
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA}
            onChange={(e) => setShowMA(e.target.checked)}
            className="rounded"
          />
          이동평균선
        </label>
      </div>

      {/* 주가 차트 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {pricesLoading ? (
          <div className="h-96 bg-gray-100 animate-pulse rounded-xl" />
        ) : prices && prices.length > 0 ? (
          <StockPriceChart data={pricesWithIndicators} showMA={showMA} isDomestic={isDomestic} />
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-400">
            주가 데이터가 없습니다
          </div>
        )}
      </div>

      {/* 기술적 지표 */}
      {prices && prices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">기술적 지표</h2>
          <IndicatorPanel data={pricesWithIndicators} />
        </div>
      )}

      {/* AI 분석 결과 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="AI 분석 결과"
        size="xl"
      >
        {analysisResult && <AIAnalysisBox result={analysisResult} />}
      </Modal>
    </div>
  );
};
