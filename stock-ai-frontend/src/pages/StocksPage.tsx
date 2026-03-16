import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Download, CheckCircle } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import {
  useDomesticStocks,
  useOverseasStocks,
  useCryptoList,
  useStockSearch,
  useSeedStatus,
  useSeedTrigger,
} from "@/hooks/useStocks";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_TABS = [
  { key: "domestic", label: "국내주식" },
  { key: "overseas", label: "해외주식" },
  { key: "crypto",   label: "가상화폐" },
];

const DOMESTIC_TABS = [
  { key: "KOSPI",  label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
];

const OVERSEAS_TABS = [
  { key: "ALL",    label: "전체" },
  { key: "NASDAQ", label: "NASDAQ" },
  { key: "NYSE",   label: "NYSE" },
];

/** 탭 상태를 /search API의 market 파라미터로 변환 */
function toSearchMarket(category: string, domesticMarket: string): string {
  if (category === "domestic") return domesticMarket; // KOSPI | KOSDAQ
  if (category === "overseas") return "US";
  return "CRYPTO";
}

export const StocksPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("domestic");
  const [domesticMarket, setDomesticMarket] = useState("KOSPI");
  const [overseasMarket, setOverseasMarket] = useState("ALL");
  const [query, setQuery] = useState("");

  const { data: seedStatus } = useSeedStatus();
  const seedTrigger = useSeedTrigger();

  // 탭별 전체 목록 (검색어 없을 때 사용)
  const { data: domesticStocks = [], isLoading: dLoading } = useDomesticStocks(domesticMarket);
  const { data: overseasStocks = [], isLoading: oLoading } = useOverseasStocks(overseasMarket);
  const { data: cryptoStocks = [],  isLoading: cLoading } = useCryptoList();

  // 검색어 있을 때 서버 검색 (전체 DB + 실시간 폴백)
  const searchMarket = toSearchMarket(category, domesticMarket);
  const trimmed = query.trim();
  const { data: searchResults = [], isFetching: searchFetching } = useStockSearch(
    trimmed,
    searchMarket,
  );

  const currentStocks = useMemo(() => {
    if (trimmed) return searchResults as any[];
    return category === "domestic" ? domesticStocks :
           category === "overseas" ? overseasStocks :
           cryptoStocks;
  }, [trimmed, searchResults, category, domesticStocks, overseasStocks, cryptoStocks]);

  const isLoading =
    trimmed
      ? searchFetching
      : (category === "domestic" && dLoading) ||
        (category === "overseas" && oLoading) ||
        (category === "crypto" && cLoading);

  const handleSeed = async () => {
    await seedTrigger.mutateAsync();
    // Poll until done, then refresh domestic stocks
    const poll = setInterval(async () => {
      const status = await queryClient
        .fetchQuery({ queryKey: ["stocks", "seed-status"], queryFn: () => import("@/api/stocks").then(m => m.stocksApi.getSeedStatus()) });
      if (!status.running) {
        clearInterval(poll);
        queryClient.invalidateQueries({ queryKey: ["stocks", "domestic-all"] });
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">종목 조회</h1>
          <p className="text-gray-500 text-sm mt-0.5">국내주식 · 해외주식 · 가상화폐 전체 목록</p>
        </div>

        {/* 국내 종목 DB 동기화 버튼 */}
        {category === "domestic" && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              {seedStatus?.running ? (
                <span className="flex items-center gap-1.5 text-xs text-brand-600">
                  <Loader2 size={13} className="animate-spin" />
                  종목 수집 중... (완료 후 목록 자동 갱신)
                </span>
              ) : seedStatus?.domestic_done ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle size={14} />
                  국내 종목 {seedStatus.domestic_done.toLocaleString()}개 저장됨
                </span>
              ) : null}
              <button
                onClick={handleSeed}
                disabled={seedStatus?.running || seedTrigger.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={13} />
                전체 종목 DB 저장
              </button>
            </div>
            {seedStatus?.error && (
              <p className="text-xs text-red-500">오류: {seedStatus.error}</p>
            )}
          </div>
        )}
      </div>

      {/* 검색 */}
      <div className="relative">
        {isLoading && trimmed ? (
          <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />
        ) : (
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명 또는 티커 검색 (DB 전체 + 실시간 검색)..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* 카테고리 탭 (검색 중에도 전환 가능) */}
      <Tabs
        tabs={CATEGORY_TABS}
        active={category}
        onChange={(k) => { setCategory(k); setQuery(""); }}
      />

      {/* 서브 탭 */}
      {category === "domestic" && !trimmed && (
        <Tabs tabs={DOMESTIC_TABS} active={domesticMarket} onChange={setDomesticMarket} />
      )}
      {category === "overseas" && !trimmed && (
        <Tabs tabs={OVERSEAS_TABS} active={overseasMarket} onChange={setOverseasMarket} />
      )}

      {/* 종목 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading && !trimmed ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : currentStocks.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {trimmed
              ? isLoading
                ? "검색 중..."
                : `"${trimmed}"에 해당하는 종목이 없습니다`
              : "종목이 없습니다"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">종목명</th>
                  <th className="px-4 py-3 font-medium">티커</th>
                  <th className="px-4 py-3 font-medium">시장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentStocks.map((stock: any) => (
                  <tr
                    key={stock.id}
                    className="hover:bg-brand-50 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/stocks/${stock.id}?domestic=${stock.is_domestic}`)
                    }
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {stock.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {stock.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {stock.market}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-right">
              {trimmed
                ? `검색 결과 ${currentStocks.length}개`
                : `총 ${currentStocks.length.toLocaleString()}개 종목`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
