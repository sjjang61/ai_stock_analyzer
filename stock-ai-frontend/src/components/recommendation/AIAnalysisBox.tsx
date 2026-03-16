import { TrendingUp, TrendingDown, Minus, Target, ShieldAlert, AlertTriangle } from "lucide-react";
import { SignalBadge } from "./SignalBadge";
import type { AnalysisResult } from "@/types/recommendation";
import clsx from "clsx";

interface Props {
  result: AnalysisResult;
}

const OutlookIcon = ({ outlook }: { outlook: string }) => {
  if (outlook === "상승") return <TrendingUp size={16} className="text-green-500" />;
  if (outlook === "하락") return <TrendingDown size={16} className="text-red-500" />;
  return <Minus size={16} className="text-gray-400" />;
};

const RiskBadge = ({ level }: { level?: string }) => (
  <span className={clsx(
    "text-xs font-medium px-2 py-0.5 rounded-full",
    level === "LOW"    && "bg-green-100 text-green-700",
    level === "MEDIUM" && "bg-yellow-100 text-yellow-700",
    level === "HIGH"   && "bg-red-100 text-red-700",
  )}>
    위험도 {level === "LOW" ? "낮음" : level === "MEDIUM" ? "중간" : "높음"}
  </span>
);

export const AIAnalysisBox = ({ result }: Props) => {
  const { analysis, currentPrice, stockName, ticker } = result;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-xl">{stockName}</h3>
          <p className="text-sm text-gray-400 font-mono">{ticker} • {result.market}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={analysis.riskLevel} />
          <SignalBadge signal={analysis.signal} size="lg" />
        </div>
      </div>

      {/* 현재가 */}
      {currentPrice && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">현재가</p>
          <p className="text-2xl font-bold text-gray-900">
            {currentPrice.toLocaleString()}
          </p>
        </div>
      )}

      {/* 신뢰도 */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-600">AI 신뢰도</span>
          <span className="font-semibold">{((analysis.confidence ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
            style={{ width: `${(analysis.confidence ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {/* 종합 의견 */}
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-900 mb-1">종합 투자 의견</p>
        <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{analysis.summary}</p>
      </div>

      {/* 단기/중기/장기 */}
      <div className="grid grid-cols-1 gap-3">
        {analysis.shortTerm && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <OutlookIcon outlook={analysis.shortTerm.outlook} />
              <p className="text-sm font-semibold text-gray-700">단기 전망 (일봉)</p>
              <span className="text-xs text-gray-400 ml-auto">{analysis.shortTerm.outlook}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
              {analysis.shortTerm.buyPrice && (
                <div>
                  <p className="text-gray-400">매수가</p>
                  <p className="font-semibold">{analysis.shortTerm.buyPrice.toLocaleString()}</p>
                </div>
              )}
              {analysis.shortTerm.sellPrice && (
                <div>
                  <p className="text-gray-400 flex items-center justify-center gap-1"><Target size={9} /> 목표</p>
                  <p className="font-semibold text-green-600">{analysis.shortTerm.sellPrice.toLocaleString()}</p>
                </div>
              )}
              {analysis.shortTerm.stopLoss && (
                <div>
                  <p className="text-gray-400 flex items-center justify-center gap-1"><ShieldAlert size={9} /> 손절</p>
                  <p className="font-semibold text-red-500">{analysis.shortTerm.stopLoss.toLocaleString()}</p>
                </div>
              )}
            </div>
            {analysis.shortTerm.reason && (
              <p className="text-xs text-gray-500 leading-relaxed">{analysis.shortTerm.reason}</p>
            )}
          </div>
        )}

        {analysis.midTerm && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <OutlookIcon outlook={analysis.midTerm.outlook} />
              <p className="text-sm font-semibold text-gray-700">중기 전망 (주봉)</p>
              <span className="text-xs text-gray-400 ml-auto">{analysis.midTerm.outlook}</span>
            </div>
            {analysis.midTerm.targetPrice && (
              <p className="text-xs text-green-600 font-medium mb-1">목표가: {analysis.midTerm.targetPrice.toLocaleString()}</p>
            )}
            {analysis.midTerm.reason && (
              <p className="text-xs text-gray-500 leading-relaxed">{analysis.midTerm.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* 이동평균선 분석 */}
      {analysis.maAnalysis && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            이동평균선: <span className="text-brand-600">{analysis.maAnalysis.arrangement}</span>
          </p>
          <p className="text-xs text-gray-500">{analysis.maAnalysis.summary}</p>
        </div>
      )}

      {/* 핵심 포인트 */}
      {analysis.keyPoints && analysis.keyPoints.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">핵심 포인트</p>
          <ul className="space-y-1.5">
            {analysis.keyPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-brand-500 mt-0.5">•</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LLM 제공자 */}
      {analysis.llmProvider && (
        <p className="text-xs text-gray-400 text-right">AI: {analysis.llmProvider}</p>
      )}
    </div>
  );
};
