import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "@/api/recommendations";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Settings } from "lucide-react";

export const StrategyPage = () => {
  const { data: strategies, isLoading, refetch } = useQuery({
    queryKey: ["strategies"],
    queryFn: () => recommendationsApi.getStrategies(),
  });

  const seedStrategies = async () => {
    await apiClient.get("/api/strategies/seed");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전략 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">투자 전략 목록 및 설정</p>
        </div>
        <Button variant="secondary" size="sm" onClick={seedStrategies}>
          기본 전략 초기화
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : strategies && strategies.length > 0 ? (
        <div className="space-y-3">
          {strategies.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                      {s.type}
                    </span>
                    {s.is_active && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">활성</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{s.description}</p>
                  {s.params && Object.keys(s.params).length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {Object.entries(s.params).map(([k, v]) => (
                        <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Settings size={18} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-500 mb-3">전략이 없습니다</p>
          <Button onClick={seedStrategies}>기본 전략 초기화</Button>
        </div>
      )}
    </div>
  );
};
