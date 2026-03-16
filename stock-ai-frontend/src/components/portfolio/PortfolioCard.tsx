import { Brain, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import type { PortfolioItem } from "@/types/portfolio";

interface Props {
  item: PortfolioItem;
  currentPrice?: number;
  priceLoading?: boolean;
  onEdit:     () => void;
  onDelete:   () => void;
  onAnalyze:  () => void;
  analyzing?: boolean;
}

export const PortfolioCard = ({
  item, currentPrice, priceLoading, onEdit, onDelete, onAnalyze, analyzing,
}: Props) => {
  const isDomestic = item.is_domestic;
  const fmt = (v: number) =>
    isDomestic
      ? `₩${v.toLocaleString("ko-KR")}`
      : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const pnlAmount = currentPrice != null
    ? (currentPrice - item.avg_price) * item.quantity
    : null;
  const pnlPct = currentPrice != null
    ? ((currentPrice - item.avg_price) / item.avg_price) * 100
    : null;
  const isPnlPositive = (pnlPct ?? 0) >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 font-mono px-2 py-0.5 rounded">
              {item.market}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mt-1">{item.name}</h3>
          <p className="text-sm text-gray-400 font-mono">{item.ticker}</p>
        </div>

        {/* 수익률 뱃지 */}
        {pnlPct != null ? (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${
            isPnlPositive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}>
            {isPnlPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPnlPositive ? "+" : ""}{pnlPct.toFixed(2)}%
          </div>
        ) : priceLoading ? (
          <div className="px-2.5 py-1 rounded-full bg-gray-50 text-xs text-gray-400 animate-pulse">
            조회 중
          </div>
        ) : null}
      </div>

      {/* 보유 정보 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">평단가</p>
          <p className="font-semibold text-gray-900 text-sm">{fmt(item.avg_price)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">보유 수량</p>
          <p className="font-semibold text-gray-900 text-sm">{item.quantity.toLocaleString()}주</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">총 매입금액</p>
          <p className="font-semibold text-gray-900 text-sm">{fmt(item.total_cost)}</p>
        </div>

        {/* 현재가 / 평가손익 */}
        {currentPrice != null ? (
          <div className={`rounded-xl p-3 ${isPnlPositive ? "bg-red-50" : "bg-blue-50"}`}>
            <p className="text-xs text-gray-400 mb-1">현재가 / 평가손익</p>
            <p className="font-semibold text-gray-900 text-sm">{fmt(currentPrice)}</p>
            <p className={`text-xs font-medium mt-0.5 ${isPnlPositive ? "text-red-500" : "text-blue-500"}`}>
              {isPnlPositive ? "+" : ""}{fmt(pnlAmount!)}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">현재가</p>
            <p className={`text-xs ${priceLoading ? "text-gray-400 animate-pulse" : "text-gray-300"}`}>
              {priceLoading ? "조회 중..." : "—"}
            </p>
          </div>
        )}
      </div>

      {/* 메모 */}
      {item.memo && (
        <p className="text-xs text-gray-400 mb-3 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
          {item.memo}
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {analyzing ? (
            <span className="animate-pulse">분석 중...</span>
          ) : (
            <>
              <Brain size={14} />
              AI 분석
            </>
          )}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1 text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors text-sm"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1 text-red-400 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors text-sm"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
