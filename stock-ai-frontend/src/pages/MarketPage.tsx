import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { stocksApi } from "@/api/stocks";
import { StockTable } from "@/components/stock/StockTable";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { Tabs } from "@/components/ui/Tabs";

const MARKET_TABS = [
  { key: "KOSPI",  label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
  { key: "US",     label: "해외 인기" },
];

export const MarketPage = () => {
  const navigate = useNavigate();
  const [market, setMarket] = useState("KOSPI");

  const { data: stocks, isLoading } = useQuery({
    queryKey: ["market-stocks", market],
    queryFn: () =>
      market === "US"
        ? stocksApi.getOverseasPopular()
        : stocksApi.getDomestic(market),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시장 개요</h1>
        <p className="text-gray-500 text-sm mt-0.5">국내외 주요 종목 현황</p>
      </div>

      <StockSearchBar
        onSelect={(s) => navigate(`/stocks/${s.id}?domestic=${s.is_domestic}`)}
        placeholder="종목명 또는 티커로 검색..."
      />

      <Tabs tabs={MARKET_TABS} active={market} onChange={setMarket} />

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <StockTable
          stocks={(stocks ?? []).map((s: any) => ({
            id: s.id,
            name: s.name,
            market: s.market,
            is_domestic: s.is_domestic,
            price: s.price,
            changePct: s.change_pct,
          }))}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
