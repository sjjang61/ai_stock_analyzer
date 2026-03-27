import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Star, Brain, ChevronDown } from "lucide-react";
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
  const { has, add, remove, groups } = useWatchlistStore();
  const inWatchlist = has(ticker!);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node))
        setGroupMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
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
            <div className="relative" ref={groupMenuRef}>
              {inWatchlist ? (
                <button
                  onClick={() => remove(ticker!)}
                  className="p-1 rounded-lg hover:bg-yellow-50 transition-colors"
                  title="관심 종목 해제"
                >
                  <Star size={20} className="fill-yellow-400 text-yellow-400" />
                </button>
              ) : (
                <div className="flex items-center">
                  <button
                    disabled={!detail}
                    onClick={() => {
                      if (groups.length <= 1) {
                        add({ ticker: ticker!, name: detail!.name, market: detail!.market, isDomestic });
                      } else {
                        setGroupMenuOpen((v) => !v);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-0.5"
                    title="관심 종목 추가"
                  >
                    <Star size={20} className="text-gray-300" />
                    {groups.length > 1 && <ChevronDown size={12} className="text-gray-400" />}
                  </button>
                </div>
              )}

              {/* 그룹 선택 드롭다운 */}
              {groupMenuOpen && !inWatchlist && (
                <div className="absolute left-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[150px] py-1">
                  <p className="px-3 py-1.5 text-xs text-gray-400 font-medium">그룹 선택</p>
                  {groups.map((g) => (
                    <button
                      key={g.name}
                      onClick={() => {
                        add({ ticker: ticker!, name: detail!.name, market: detail!.market, isDomestic, group: g.name });
                        setGroupMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
