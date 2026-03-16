import { Target, ShieldAlert } from "lucide-react";
import { SignalBadge } from "./SignalBadge";
import type { Recommendation } from "@/types/recommendation";

interface Props {
  rec: Recommendation;
  onClick?: () => void;
}

export const RecommendCard = ({ rec, onClick }: Props) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md
               transition-all cursor-pointer hover:-translate-y-0.5"
  >
    {/* 헤더 */}
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{rec.market}</p>
        <h3 className="font-bold text-gray-900 text-lg">{rec.stockName}</h3>
        <p className="text-sm text-gray-400 font-mono">{rec.stockId}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <SignalBadge signal={rec.signal} />
        <span className="text-xs text-gray-400">{rec.strategyName}</span>
      </div>
    </div>

    {/* AI 요약 */}
    <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">
      {rec.aiSummary}
    </p>

    {/* 가격 정보 */}
    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">현재가</p>
        <p className="font-semibold text-gray-900 text-sm">
          {rec.priceAt?.toLocaleString() ?? "—"}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
          <Target size={10} /> 목표가
        </p>
        <p className="font-semibold text-green-600 text-sm">
          {rec.targetPrice?.toLocaleString() ?? "—"}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
          <ShieldAlert size={10} /> 손절가
        </p>
        <p className="font-semibold text-red-500 text-sm">
          {rec.stopLoss?.toLocaleString() ?? "—"}
        </p>
      </div>
    </div>

    {/* 신뢰도 바 */}
    {rec.confidence != null && (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>AI 신뢰도</span>
          <span>{(rec.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
            style={{ width: `${rec.confidence * 100}%` }}
          />
        </div>
      </div>
    )}
  </div>
);
