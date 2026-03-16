import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { stocksApi } from "@/api/stocks";
import { Tabs } from "@/components/ui/Tabs";

const MARKET_TABS = [
  { key: "KOSPI",  label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
];

function formatPrice(val: number | null) {
  if (val == null) return "—";
  return val.toLocaleString("ko-KR");
}

function formatMarketCap(val: number | null) {
  if (val == null) return "—";
  // 억원 단위 → 조/억 표시
  if (val >= 10000) {
    return `${(val / 10000).toFixed(2)}조`;
  }
  return `${val.toLocaleString("ko-KR")}억`;
}

function formatVolume(val: number | null) {
  if (val == null) return "—";
  if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
  if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
  return val.toLocaleString("ko-KR");
}

function formatDecimal(val: number | null, digits = 2) {
  if (val == null) return "—";
  return val.toFixed(digits);
}

export const MarcapPage = () => {
  const navigate = useNavigate();
  const [market, setMarket] = useState("KOSPI");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["marcap", market, refreshKey],
    queryFn: () => stocksApi.getMarcap(market, refreshKey > 0),
    staleTime: 1000 * 60 * 60, // 1시간
    retry: 1,
  });

  const stocks = data?.data ?? [];
  const updatedAt = data?.updated_at
    ? new Date(data.updated_at * 1000).toLocaleString("ko-KR")
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">시총 상위 종목</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            네이버 금융 기준 시가총액 상위 100개 종목
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      <Tabs tabs={MARKET_TABS} active={market} onChange={setMarket} />

      {/* 업데이트 시각 */}
      {updatedAt && (
        <p className="text-xs text-gray-400">
          마지막 업데이트: {updatedAt}
          {data?.cached && " (캐시)"}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="p-16 text-center">
            <TrendingUp size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">네이버 금융 크롤링에 실패했습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-10">순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">종목명</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">현재가</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">전일비</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">등락률</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">시가총액</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">거래량</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">PER</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">ROE(%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stocks.map((stock) => {
                  const isUp = (stock.change_pct ?? 0) > 0;
                  const isFlat = stock.change_pct === 0 || stock.change_pct == null;
                  const colorClass = isFlat
                    ? "text-gray-500"
                    : isUp
                    ? "text-red-500"
                    : "text-blue-500";

                  return (
                    <tr
                      key={stock.ticker || stock.rank}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(`/stocks/${stock.ticker}?domestic=true`)
                      }
                    >
                      {/* 순위 */}
                      <td className="px-4 py-3 text-gray-400 text-center text-xs font-mono">
                        {stock.rank}
                      </td>

                      {/* 종목명 + 티커 */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{stock.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{stock.ticker}</p>
                      </td>

                      {/* 현재가 */}
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatPrice(stock.current_price)}
                      </td>

                      {/* 전일비 */}
                      <td className={clsx("px-4 py-3 text-right font-medium", colorClass)}>
                        {stock.change == null
                          ? "—"
                          : `${isUp ? "▲" : isFlat ? "" : "▼"} ${formatPrice(Math.abs(stock.change))}`}
                      </td>

                      {/* 등락률 */}
                      <td className={clsx("px-4 py-3 text-right font-medium", colorClass)}>
                        {stock.change_pct == null
                          ? "—"
                          : `${isUp ? "+" : ""}${formatDecimal(stock.change_pct)}%`}
                      </td>

                      {/* 시가총액 */}
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatMarketCap(stock.market_cap)}
                      </td>

                      {/* 거래량 */}
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatVolume(stock.volume)}
                      </td>

                      {/* PER */}
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatDecimal(stock.per)}
                      </td>

                      {/* ROE */}
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatDecimal(stock.roe)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
