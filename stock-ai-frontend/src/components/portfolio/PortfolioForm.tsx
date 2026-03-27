import { useState, useRef, useEffect } from "react";
import { Search, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStockSearch } from "@/hooks/useStocks";
import type { PortfolioItem } from "@/types/portfolio";
import type { StockSearchResult } from "@/types/stock";

interface Props {
  initial?: PortfolioItem;
  onSubmit: (data: {
    ticker: string;
    name: string;
    market: string;
    is_domestic: boolean;
    avg_price: number;
    quantity: number;
    memo?: string;
    group_name?: string;
  }) => void;
  onClose: () => void;
  loading?: boolean;
  existingGroups?: string[];
}

const MARKETS = [
  { value: "KOSPI",  label: "KOSPI  (국내)",    domestic: true  },
  { value: "KOSDAQ", label: "KOSDAQ (국내)",    domestic: true  },
  { value: "NASDAQ", label: "NASDAQ (해외)",    domestic: false },
  { value: "NYSE",   label: "NYSE   (해외)",    domestic: false },
  { value: "AMEX",   label: "AMEX   (해외)",    domestic: false },
  { value: "CRYPTO", label: "CRYPTO (가상화폐)", domestic: false },
];

/** yfinance exchange 코드 → 표준 시장명 변환 */
function normalizeMarket(market: string): string {
  const map: Record<string, string> = {
    NMS: "NASDAQ", NGM: "NASDAQ", NCM: "NASDAQ",
    NYQ: "NYSE",   ASE: "AMEX",
    CCC: "CRYPTO", CCY: "CRYPTO",   // yfinance 가상화폐 거래소 코드
    KOSPI: "KOSPI", KOSDAQ: "KOSDAQ",
    NASDAQ: "NASDAQ", NYSE: "NYSE", AMEX: "AMEX", CRYPTO: "CRYPTO",
  };
  return map[market.toUpperCase()] ?? market.toUpperCase();
}

export const PortfolioForm = ({ initial, onSubmit, onClose, loading, existingGroups = [] }: Props) => {
  const [ticker,    setTicker]    = useState(initial?.ticker     ?? "");
  const [name,      setName]      = useState(initial?.name       ?? "");
  const [market,    setMarket]    = useState(initial?.market     ?? "KOSPI");
  const [avgPrice,  setAvgPrice]  = useState(String(initial?.avg_price ?? ""));
  const [quantity,  setQuantity]  = useState(String(initial?.quantity  ?? ""));
  const [memo,      setMemo]      = useState(initial?.memo       ?? "");
  const [groupName, setGroupName] = useState(initial?.group_name ?? "기본");

  // 검색 관련 상태 (신규 추가 시에만 사용)
  const [query,        setQuery]        = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [stockSelected, setStockSelected] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isDomestic = MARKETS.find((m) => m.value === market)?.domestic ?? true;
  const isCrypto   = market === "CRYPTO";
  const isEdit = !!initial;

  // 종목 검색 (2글자 이상)
  const { data: searchResults, isFetching: searching } = useStockSearch(
    query.length >= 1 ? query : ""
  );

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** 검색 결과에서 종목 선택 */
  const handleSelectStock = (stock: StockSearchResult) => {
    const normalized = normalizeMarket(stock.market);
    setTicker(stock.id.toUpperCase());
    setName(stock.name);
    setMarket(MARKETS.find((m) => m.value === normalized)?.value ?? "NASDAQ");
    setQuery("");
    setShowDropdown(false);
    setStockSelected(true);
  };

  /** 선택 초기화 */
  const clearSelection = () => {
    setTicker("");
    setName("");
    setStockSelected(false);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !name || !avgPrice || !quantity) return;
    onSubmit({
      ticker:      ticker.trim().toUpperCase(),
      name:        name.trim(),
      market,
      is_domestic: isDomestic,
      avg_price:   parseFloat(avgPrice),
      quantity:    isCrypto ? parseFloat(quantity) : parseInt(quantity, 10),
      memo:        memo.trim() || undefined,
      group_name:  groupName.trim() || "기본",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── 신규 추가: 종목 검색 UI ──────────────────────────────── */}
      {!isEdit && (
        <>
          {stockSelected ? (
            /* 선택 완료 상태 */
            <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400 font-mono">{ticker} · {market}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={13} />
                변경
              </button>
            </div>
          ) : (
            /* 검색 입력 */
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종목 검색
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => query.length >= 1 && setShowDropdown(true)}
                  placeholder="종목명 또는 티커 입력 (예: 삼성, AAPL)"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                  autoComplete="off"
                />
                {searching && (
                  <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                )}
                {query && (
                  <button type="button" onClick={() => { setQuery(""); setShowDropdown(false); }}>
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* 검색 드롭다운 */}
              {showDropdown && query.length >= 1 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {searchResults && searchResults.length > 0 ? (
                    searchResults.slice(0, 12).map((stock) => (
                      <button
                        key={`${stock.id}-${stock.market}`}
                        type="button"
                        onClick={() => handleSelectStock(stock)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{stock.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{stock.id}</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">
                          {normalizeMarket(stock.market)}
                        </span>
                      </button>
                    ))
                  ) : !searching ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                      검색 결과가 없습니다
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* 직접 입력 안내 */}
          {!stockSelected && (
            <p className="text-xs text-gray-400 -mt-1">
              검색 결과가 없으면 아래에서 직접 입력하세요.
            </p>
          )}
        </>
      )}

      {/* ── 시장 선택 ────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">시장</label>
        <select
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          disabled={isEdit}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
        >
          {MARKETS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* ── 티커 ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          티커 <span className="text-gray-400 text-xs">({isDomestic ? "예: 005930" : "예: AAPL"})</span>
        </label>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          disabled={isEdit}
          placeholder={isDomestic ? "005930" : "AAPL"}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 font-mono"
          required
        />
      </div>

      {/* ── 종목명 ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">종목명</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isEdit}
          placeholder={isDomestic ? "삼성전자" : "Apple Inc."}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
          required
        />
      </div>

      {/* ── 평단가 · 수량 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            평단가 <span className="text-gray-400 text-xs">({isDomestic ? "원" : "$"})</span>
          </label>
          <input
            type="number"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            min="0"
            step="any"
            placeholder={isDomestic ? "75400" : isCrypto ? "65000.00" : "185.50"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isCrypto ? "수량 (개)" : "수량 (주)"}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0"
            step={isCrypto ? "any" : "1"}
            placeholder={isCrypto ? "0.01" : "10"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
      </div>

      {/* ── 그룹 ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">그룹</label>
        {existingGroups.length > 0 ? (
          <select
            value={groupName}
            onChange={(e) => {
              if (e.target.value === "__new__") return;
              setGroupName(e.target.value);
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Array.from(new Set(["기본", ...existingGroups])).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
            <option value="__new__" disabled>── 새 그룹 직접 입력 ──</option>
          </select>
        ) : null}
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="예: 스윙종목, 단기투자, 장기보유..."
          className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${existingGroups.length > 0 ? "mt-1.5" : ""}`}
        />
        {existingGroups.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">위에서 기존 그룹 선택 또는 아래에서 새 이름 직접 입력</p>
        )}
      </div>

      {/* ── 메모 ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="매수 이유, 목표가 등..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* ── 총 투자금액 미리보기 ──────────────────────────────────── */}
      {avgPrice && quantity && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600">
          총 투자금액:{" "}
          <span className="font-semibold text-gray-900">
            {isDomestic
              ? `₩${(parseFloat(avgPrice) * parseInt(quantity, 10)).toLocaleString("ko-KR")}`
              : `$${(parseFloat(avgPrice) * parseFloat(quantity)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {isEdit ? "수정 완료" : "종목 추가"}
        </Button>
      </div>
    </form>
  );
};
