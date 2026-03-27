import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronDown } from "lucide-react";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import clsx from "clsx";

interface Props {
  id: string;
  name: string;
  market: string;
  isDomestic: boolean;
  currentPrice?: number;
  changePct?: number;
}

export const StockCard = ({ id, name, market, isDomestic, currentPrice, changePct }: Props) => {
  const navigate = useNavigate();
  const { has, add, remove, groups } = useWatchlistStore();
  const inWatchlist = has(id);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node))
        setGroupMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isUp = (changePct ?? 0) >= 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/stocks/${id}?domestic=${isDomestic}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{market}</p>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-xs font-mono text-gray-400">{id}</p>
        </div>
        <div className="relative" ref={groupMenuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (inWatchlist) {
                remove(id);
              } else if (groups.length <= 1) {
                add({ ticker: id, name, market, isDomestic });
              } else {
                setGroupMenuOpen((v) => !v);
              }
            }}
            className="p-1 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-0.5"
          >
            <Star
              size={16}
              className={inWatchlist ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
            />
            {!inWatchlist && groups.length > 1 && (
              <ChevronDown size={10} className="text-gray-400" />
            )}
          </button>

          {groupMenuOpen && !inWatchlist && (
            <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] py-1">
              <p className="px-3 py-1.5 text-xs text-gray-400 font-medium">그룹 선택</p>
              {groups.map((g) => (
                <button
                  key={g.name}
                  onClick={() => {
                    add({ ticker: id, name, market, isDomestic, group: g.name });
                    setGroupMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {currentPrice != null && (
        <div className="mt-2">
          <p className="text-lg font-bold text-gray-900">
            {isDomestic ? "₩" : "$"}{currentPrice.toLocaleString()}
          </p>
          {changePct != null && (
            <p className={clsx("text-sm font-medium", isUp ? "text-red-500" : "text-blue-500")}>
              {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
};
