import { useState } from "react";
import { Search } from "lucide-react";
import { useStockSearch } from "@/hooks/useStocks";

interface Props {
  onSelect: (stock: { id: string; name: string; market: string; is_domestic: boolean }) => void;
  placeholder?: string;
}

export const StockSearchBar = ({ onSelect, placeholder = "종목 검색..." }: Props) => {
  const [query, setQuery] = useState("");
  const { data: results } = useStockSearch(query);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <Search size={18} className="text-gray-400" />
        <input
          className="flex-1 outline-none text-sm placeholder-gray-400"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.length > 0 && results && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.slice(0, 8).map((stock) => (
            <button
              key={stock.id}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
              onClick={() => {
                onSelect(stock);
                setQuery("");
              }}
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{stock.name}</p>
                <p className="text-xs text-gray-400 font-mono">{stock.id}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {stock.market}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
