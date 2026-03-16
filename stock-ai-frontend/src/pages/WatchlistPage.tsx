import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trash2 } from "lucide-react";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { Button } from "@/components/ui/Button";
import { stocksApi } from "@/api/stocks";

export const WatchlistPage = () => {
  const navigate = useNavigate();
  const { items, remove, updateName } = useWatchlistStore();

  // name이 ticker와 같은 항목은 API에서 실제 종목명을 가져와 보정
  useEffect(() => {
    const stale = items.filter((i) => i.name === i.ticker);
    stale.forEach(async (item) => {
      try {
        const detail = await stocksApi.getDetail(item.ticker, item.isDomestic);
        if (detail?.name && detail.name !== item.ticker) {
          updateName(item.ticker, detail.name);
        }
      } catch {
        // 무시 — API 실패 시 기존 값 유지
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관심 종목</h1>
        <p className="text-gray-500 text-sm mt-0.5">{items.length}개 종목 등록됨</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.ticker}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
            >
              <button
                className="flex items-center gap-3 flex-1 text-left"
                onClick={() => navigate(`/stocks/${item.ticker}?domestic=${item.isDomestic}`)}
              >
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Star size={18} className="fill-yellow-400 text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.ticker} • {item.market}</p>
                </div>
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(item.ticker)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Star size={56} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-1">관심 종목이 없습니다</p>
          <p className="text-gray-400 text-sm">종목 상세 페이지에서 별표를 눌러 추가하세요.</p>
        </div>
      )}
    </div>
  );
};
