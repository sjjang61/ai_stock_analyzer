import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Brain } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { RecommendCard } from "@/components/recommendation/RecommendCard";
import { StrategyFilter } from "@/components/recommendation/StrategyFilter";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export const RecommendationPage = () => {
  const navigate = useNavigate();
  const [signal, setSignal] = useState("");
  const [market, setMarket] = useState("ALL");

  const { data: recs, isLoading, refetch } = useRecommendations({
    signal: signal || undefined,
    market: market === "ALL" ? undefined : market,
    limit: 24,
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 추천 종목</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI 분석 기반 투자 추천 목록</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw size={14} />
          새로고침
        </Button>
      </div>

      {/* 필터 */}
      <StrategyFilter
        signal={signal}
        onSignalChange={setSignal}
        market={market}
        onMarketChange={setMarket}
      />

      {/* 결과 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : recs && recs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.map((rec: any) => (
            <RecommendCard
              key={rec.id}
              rec={{
                id: rec.id,
                stockId: rec.stock_id,
                stockName: rec.stock_name,
                market: rec.market,
                strategyName: rec.strategy_name,
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
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Brain size={56} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-1">추천 종목 없음</p>
          <p className="text-gray-400 text-sm">종목 상세 페이지에서 AI 분석을 실행해보세요.</p>
        </div>
      )}
    </div>
  );
};
