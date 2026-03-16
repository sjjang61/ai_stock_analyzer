import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useStockSearch } from "@/hooks/useStocks";
import { UserMenu } from "./UserMenu";
import clsx from "clsx";

export const Header = () => {
  const [query, setQuery] = useState("");
  const [isDomestic, setIsDomestic] = useState(true);
  const navigate = useNavigate();

  const { data: results } = useStockSearch(query);

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 fixed top-0 right-0 left-56 z-20">
      {/* 검색 */}
      <div className="flex-1 max-w-md relative">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
            placeholder="종목명 또는 티커 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* 검색 결과 드롭다운 */}
        {query.length > 0 && results && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {results.slice(0, 10).map((stock) => (
              <button
                key={stock.id}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left"
                onClick={() => {
                  navigate(`/stocks/${stock.id}?domestic=${stock.is_domestic}`);
                  setQuery("");
                }}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{stock.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{stock.id}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {stock.market}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 시장 필터 */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setIsDomestic(true)}
          className={clsx(
            "px-3 py-1 text-xs font-medium rounded transition-all",
            isDomestic ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          )}
        >
          국내
        </button>
        <button
          onClick={() => setIsDomestic(false)}
          className={clsx(
            "px-3 py-1 text-xs font-medium rounded transition-all",
            !isDomestic ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          )}
        >
          해외
        </button>
      </div>

      {/* 사용자 메뉴 — 오른쪽 끝 고정 */}
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
};
