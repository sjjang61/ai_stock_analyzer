import { useNavigate } from "react-router-dom";
import clsx from "clsx";

interface StockRow {
  id: string;
  name: string;
  market: string;
  is_domestic?: boolean;
  price?: number;
  changePct?: number;
  volume?: number;
}

interface Props {
  stocks: StockRow[];
  isLoading?: boolean;
}

export const StockTable = ({ stocks, isLoading }: Props) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-2 pr-4 font-medium">종목</th>
            <th className="pb-2 pr-4 font-medium">시장</th>
            <th className="pb-2 pr-4 font-medium text-right">현재가</th>
            <th className="pb-2 font-medium text-right">등락률</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stocks.map((stock) => (
            <tr
              key={stock.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/stocks/${stock.id}?domestic=${stock.is_domestic ?? true}`)}
            >
              <td className="py-3 pr-4">
                <p className="text-sm font-semibold text-gray-900">{stock.name}</p>
                <p className="text-xs text-gray-400 font-mono">{stock.id}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {stock.market}
                </span>
              </td>
              <td className="py-3 pr-4 text-right text-sm font-medium">
                {stock.price?.toLocaleString() ?? "—"}
              </td>
              <td className="py-3 text-right">
                {stock.changePct != null ? (
                  <span className={clsx(
                    "text-sm font-medium",
                    stock.changePct >= 0 ? "text-red-500" : "text-blue-500"
                  )}>
                    {stock.changePct >= 0 ? "▲" : "▼"} {Math.abs(stock.changePct).toFixed(2)}%
                  </span>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
