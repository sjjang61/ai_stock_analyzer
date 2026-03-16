import { useState } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import {
  usePortfolio,
  usePortfolioPrices,
  useAddPortfolio,
  useUpdatePortfolio,
  useRemovePortfolio,
  useAnalyzePortfolio,
} from "@/hooks/usePortfolio";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import { PortfolioAnalysisBox } from "@/components/portfolio/PortfolioAnalysisBox";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { PortfolioItem, PortfolioAnalysisResult } from "@/types/portfolio";

export const PortfolioPage = () => {
  const { data: items = [], isLoading } = usePortfolio();
  const { data: prices = {}, isFetching: pricesFetching, refetch: refetchPrices } =
    usePortfolioPrices(items.length > 0);
  const { mutate: addItem,    isPending: adding    } = useAddPortfolio();
  const { mutate: updateItem, isPending: updating  } = useUpdatePortfolio();
  const { mutate: removeItem } = useRemovePortfolio();
  const { mutate: analyze,    isPending: analyzing, variables: analyzingId } = useAnalyzePortfolio();

  const [showAddModal,      setShowAddModal]      = useState(false);
  const [editTarget,        setEditTarget]        = useState<PortfolioItem | null>(null);
  const [analysisResult,    setAnalysisResult]    = useState<PortfolioAnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  /* 포트폴리오 요약 계산 */
  const summary = items.reduce(
    (acc, item) => {
      const cp = prices[item.ticker] ?? null;
      acc.totalCost += item.total_cost;
      if (cp != null) {
        acc.totalValue += cp * item.quantity;
      }
      return acc;
    },
    { totalCost: 0, totalValue: 0 }
  );

  const hasPrices      = Object.keys(prices).length > 0;
  const totalPnlAmount = summary.totalValue - summary.totalCost;
  const totalPnlPct    = summary.totalCost > 0 ? (totalPnlAmount / summary.totalCost) * 100 : 0;
  const isProfit       = totalPnlPct >= 0;

  const fmtKRW = (v: number) =>
    v >= 100_000_000
      ? `${(v / 100_000_000).toFixed(1)}억`
      : `${(v / 10_000).toFixed(0)}만`;

  const handleAdd = (data: Parameters<typeof addItem>[0]) => {
    addItem(data, { onSuccess: () => setShowAddModal(false) });
  };

  const handleUpdate = (data: { avg_price?: number; quantity?: number; memo?: string }) => {
    if (!editTarget) return;
    updateItem(
      { id: editTarget.id, payload: data },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const handleAnalyze = (id: number) => {
    analyze(id, {
      onSuccess: (result) => {
        setAnalysisResult(result);
        setShowAnalysisModal(true);
      },
      onError: (err: any) => {
        alert(err?.message ?? "분석 중 오류가 발생했습니다.");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 종목 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">보유 종목 수익률 추적 및 AI 매도·추가매수 의견</p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              onClick={() => refetchPrices()}
              disabled={pricesFetching}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={pricesFetching ? "animate-spin" : ""} />
              현재가 갱신
            </button>
          )}
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus size={16} />
            종목 추가
          </Button>
        </div>
      </div>

      {/* 포트폴리오 요약 */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 보유 종목 수 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">보유 종목</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {items.length}
              <span className="text-sm font-normal text-gray-400 ml-1">종목</span>
            </p>
          </div>

          {/* 총 매입금액 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">총 매입금액</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {fmtKRW(summary.totalCost)}
              <span className="text-sm font-normal text-gray-400 ml-1">원</span>
            </p>
          </div>

          {/* 평가금액 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">평가금액</p>
            </div>
            {hasPrices ? (
              <p className="text-xl font-bold text-gray-900">
                {fmtKRW(summary.totalValue)}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            ) : (
              <p className="text-sm text-gray-300 mt-2">
                {pricesFetching ? "조회 중..." : "—"}
              </p>
            )}
          </div>

          {/* 총 평가손익 */}
          <div className={`rounded-2xl border p-4 ${
            hasPrices
              ? isProfit ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
              : "bg-white border-gray-100"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {isProfit
                ? <TrendingUp size={16} className="text-red-400" />
                : <TrendingDown size={16} className="text-blue-400" />}
              <p className="text-xs text-gray-400">총 평가손익</p>
            </div>
            {hasPrices ? (
              <>
                <p className={`text-xl font-bold ${isProfit ? "text-red-600" : "text-blue-600"}`}>
                  {isProfit ? "+" : ""}{fmtKRW(totalPnlAmount)}
                  <span className="text-sm font-normal ml-1">원</span>
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${isProfit ? "text-red-500" : "text-blue-500"}`}>
                  {isProfit ? "+" : ""}{totalPnlPct.toFixed(2)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-300 mt-2">
                {pricesFetching ? "조회 중..." : "—"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 종목 목록 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Wallet size={48} className="text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">보유 종목이 없습니다</h3>
          <p className="text-sm text-gray-300 mb-6">
            종목을 추가하고 AI 분석으로 매도 / 추가매수 의견을 받아보세요.
          </p>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus size={16} />
            첫 종목 추가하기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              currentPrice={prices[item.ticker] ?? undefined}
              priceLoading={pricesFetching && !(item.ticker in prices)}
              onEdit={() => setEditTarget(item)}
              onDelete={() => {
                if (window.confirm(`${item.name} 종목을 삭제하시겠습니까?`)) {
                  removeItem(item.id);
                }
              }}
              onAnalyze={() => handleAnalyze(item.id)}
              analyzing={analyzing && analyzingId === item.id}
            />
          ))}
        </div>
      )}

      {/* 종목 추가 모달 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="종목 추가"
        size="md"
      >
        <PortfolioForm
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
          loading={adding}
        />
      </Modal>

      {/* 종목 수정 모달 */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="종목 수정"
        size="md"
      >
        {editTarget && (
          <PortfolioForm
            initial={editTarget}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
            loading={updating}
          />
        )}
      </Modal>

      {/* AI 분석 결과 모달 */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        title={analysisResult ? `${analysisResult.name} — AI 포트폴리오 분석` : "AI 분석"}
        size="xl"
      >
        {analysisResult && <PortfolioAnalysisBox result={analysisResult} />}
      </Modal>
    </div>
  );
};
