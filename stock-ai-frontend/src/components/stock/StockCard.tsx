import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
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
  const { has, add, remove } = useWatchlistStore();
  const inWatchlist = has(id);

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
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inWatchlist) {
              remove(id);
            } else {
              add({ ticker: id, name, market, isDomestic });
            }
          }}
          className="p-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Star
            size={16}
            className={inWatchlist ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        </button>
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
