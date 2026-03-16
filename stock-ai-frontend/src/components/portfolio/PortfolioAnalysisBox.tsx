import { TrendingUp, TrendingDown, Minus, ShieldAlert, Target, Clock, AlertTriangle } from "lucide-react";
import type { PortfolioAnalysisResult } from "@/types/portfolio";

interface Props {
  result: PortfolioAnalysisResult;
}

const ACTION_CONFIG = {
  SELL: { label: "매도 권고",  color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200",  icon: TrendingDown },
  ADD:  { label: "추가매수 권고", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: TrendingUp   },
  HOLD: { label: "보유 유지",  color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: Minus       },
};

const RISK_COLOR = {
  LOW:    "text-green-600 bg-green-50",
  MEDIUM: "text-yellow-600 bg-yellow-50",
  HIGH:   "text-red-600 bg-red-50",
};

export const PortfolioAnalysisBox = ({ result }: Props) => {
  const { analysis, pnl_pct, pnl_amount, current_price, avg_price, current_value, total_cost } = result;
  const cfg = ACTION_CONFIG[analysis.action] ?? ACTION_CONFIG.HOLD;
  const ActionIcon = cfg.icon;
  const isPnlPositive = pnl_pct >= 0;
  const isDomestic = result.market === "KOSPI" || result.market === "KOSDAQ";
  const currency = isDomestic ? "원" : "$";
  const fmt = (v: number) =>
    isDomestic
      ? `₩${v.toLocaleString("ko-KR")}`
      : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* 보유 현황 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">평단가</p>
          <p className="font-bold text-gray-900 text-sm">{fmt(avg_price)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">현재가</p>
          <p className="font-bold text-gray-900 text-sm">{fmt(current_price)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">평가금액</p>
          <p className="font-bold text-gray-900 text-sm">{fmt(current_value)}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${isPnlPositive ? "bg-red-50" : "bg-blue-50"}`}>
          <p className="text-xs text-gray-400 mb-1">평가손익</p>
          <p className={`font-bold text-sm ${isPnlPositive ? "text-red-600" : "text-blue-600"}`}>
            {isPnlPositive ? "+" : ""}{fmt(pnl_amount)}
          </p>
          <p className={`text-xs font-medium ${isPnlPositive ? "text-red-500" : "text-blue-500"}`}>
            ({isPnlPositive ? "+" : ""}{pnl_pct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* AI 행동 권고 */}
      <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
            <ActionIcon size={20} className={cfg.color} />
          </div>
          <div>
            <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-gray-500">AI 신뢰도 {(analysis.confidence * 100).toFixed(0)}%</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLOR[analysis.risk_level]}`}>
            위험도 {analysis.risk_level}
          </span>
        </div>

        {/* 신뢰도 바 */}
        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${analysis.action === "SELL" ? "bg-red-400" : analysis.action === "ADD" ? "bg-green-400" : "bg-yellow-400"}`}
            style={{ width: `${analysis.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* 종합 의견 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">종합 의견</h3>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
      </div>

      {/* 3가지 전략 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 매도 전략 */}
        {analysis.sell_strategy && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="text-red-500" />
              <h4 className="text-sm font-semibold text-red-700">매도 전략</h4>
            </div>
            <div className="space-y-2 text-xs">
              {analysis.sell_strategy.target_price && (
                <div className="flex items-center gap-1.5">
                  <Target size={12} className="text-red-400 shrink-0" />
                  <span className="text-gray-600">목표가:</span>
                  <span className="font-semibold text-gray-900">{fmt(analysis.sell_strategy.target_price)}</span>
                </div>
              )}
              {analysis.sell_strategy.stop_loss && (
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-red-400 shrink-0" />
                  <span className="text-gray-600">손절가:</span>
                  <span className="font-semibold text-gray-900">{fmt(analysis.sell_strategy.stop_loss)}</span>
                </div>
              )}
              {analysis.sell_strategy.timing && (
                <p className="text-gray-500 leading-relaxed pt-1 border-t border-red-100">
                  {analysis.sell_strategy.timing}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 추가매수 전략 */}
        {analysis.add_strategy && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-500" />
              <h4 className="text-sm font-semibold text-green-700">추가매수 전략</h4>
            </div>
            <div className="space-y-2 text-xs">
              {analysis.add_strategy.add_price && (
                <div className="flex items-center gap-1.5">
                  <Target size={12} className="text-green-400 shrink-0" />
                  <span className="text-gray-600">매수 희망가:</span>
                  <span className="font-semibold text-gray-900">{fmt(analysis.add_strategy.add_price)}</span>
                </div>
              )}
              {analysis.add_strategy.condition && (
                <p className="text-gray-500 leading-relaxed pt-1 border-t border-green-100">
                  {analysis.add_strategy.condition}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 보유 전략 */}
        {analysis.hold_strategy && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-yellow-600" />
              <h4 className="text-sm font-semibold text-yellow-700">보유 전략</h4>
            </div>
            <div className="space-y-2 text-xs">
              {analysis.hold_strategy.hold_period && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-yellow-500 shrink-0" />
                  <span className="text-gray-600">권장 기간:</span>
                  <span className="font-semibold text-gray-900">{analysis.hold_strategy.hold_period}</span>
                </div>
              )}
              {analysis.hold_strategy.reason && (
                <p className="text-gray-500 leading-relaxed pt-1 border-t border-yellow-100">
                  {analysis.hold_strategy.reason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 핵심 포인트 */}
      {analysis.key_points?.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">핵심 포인트</h3>
          <ul className="space-y-1.5">
            {analysis.key_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-brand-500 font-bold mt-0.5">·</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.llm_provider && (
        <p className="text-right text-xs text-gray-300">powered by {analysis.llm_provider}</p>
      )}
    </div>
  );
};
