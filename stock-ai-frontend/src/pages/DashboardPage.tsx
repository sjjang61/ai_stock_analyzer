import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, RefreshCw, TrendingUp } from "lucide-react";
import { useMarketInsight, useTodayRecommendations } from "@/hooks/useRecommendations";
import { useOverseasPopular } from "@/hooks/useStocks";
import { RecommendCard } from "@/components/recommendation/RecommendCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [market, setMarket] = useState<"KOSPI" | "NASDAQ">("KOSPI");

  const { data: insight, isLoading: insightLoading } = useMarketInsight(market);
  const { data: todayRecs, isLoading: recsLoading } = useTodayRecommendations();
  const { data: popular } = useOverseasPopular();

  const allRecs = todayRecs
    ? Object.values(todayRecs).flat().slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI 기반 주식 분석 플랫폼</p>
        </div>
        <div className="flex gap-2">
          {(["KOSPI", "NASDAQ"] as const).map((m) => (
            <Button
              key={m}
              variant={market === m ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMarket(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      {/* AI 시장 인사이트 */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={20} />
          <h2 className="font-semibold">AI 시장 인사이트 — {market}</h2>
        </div>
        {insightLoading ? (
          <div className="h-12 bg-white/20 animate-pulse rounded-lg" />
        ) : (
          <p className="text-sm leading-relaxed opacity-90">
            {insight?.insight ?? "시장 인사이트를 불러오는 중..."}
          </p>
        )}
      </div>

      {/* 오늘의 추천 종목 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">오늘의 AI 추천 종목</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/recommendations")}
          >
            전체 보기 →
          </Button>
        </div>

        {recsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : allRecs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allRecs.map((rec: any) => (
              <RecommendCard
                key={rec.id}
                rec={{
                  id: rec.id,
                  stockId: rec.stock_id,
                  stockName: rec.stock_name,
                  market: rec.market,
                  strategyName: rec.strategy_name ?? "AI 분석",
                  signal: rec.signal,
                  score: rec.score,
                  confidence: rec.confidence,
                  aiSummary: rec.ai_summary ?? "",
                  priceAt: rec.price_at,
                  targetPrice: rec.target_price,
                  stopLoss: rec.stop_loss,
                  createdAt: rec.created_at,
                }}
                onClick={() => navigate(`/stocks/${rec.stock_id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Brain size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">아직 오늘의 추천 종목이 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">AI 분석을 실행하거나 종목 페이지에서 분석을 시작하세요.</p>
          </div>
        )}
      </div>

      {/* 인기 해외 종목 */}
      {popular && popular.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">인기 해외 종목</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {popular.map((stock: any) => (
              <button
                key={stock.id}
                onClick={() => navigate(`/stocks/${stock.id}?domestic=false`)}
                className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-all text-left"
              >
                <p className="text-xs text-gray-400 mb-0.5">{stock.market}</p>
                <p className="font-semibold text-sm text-gray-900">{stock.name}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{stock.id}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
