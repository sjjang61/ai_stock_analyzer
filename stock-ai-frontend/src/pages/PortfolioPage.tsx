import { useRef, useState, useEffect } from "react";
import {
  Plus, Wallet, TrendingUp, TrendingDown, RefreshCw,
  ChevronDown, ChevronRight, Pencil, Check, X, MoveRight,
  LayoutList, LayoutGrid,
} from "lucide-react";
import clsx from "clsx";
import {
  usePortfolio,
  usePortfolioPrices,
  useAddPortfolio,
  useUpdatePortfolio,
  useRemovePortfolio,
  useAnalyzePortfolio,
} from "@/hooks/usePortfolio";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import { PortfolioAnalysisBox } from "@/components/portfolio/PortfolioAnalysisBox";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { PortfolioItem, PortfolioAnalysisResult } from "@/types/portfolio";

/* ───────────────────────────────────────────────
   그룹 이동 드롭다운
─────────────────────────────────────────────── */
function MoveGroupDropdown({
  itemId,
  currentGroup,
  allGroups,
  onMove,
}: {
  itemId: number;
  currentGroup: string;
  allGroups: string[];
  onMove: (id: number, group: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const others = allGroups.filter((g) => g !== currentGroup);
  if (others.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 px-2 py-1.5 rounded-lg transition-colors text-xs"
        title="그룹 이동"
      >
        <MoveRight size={12} />
        그룹 이동
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[130px] py-1">
          {others.map((g) => (
            <button
              key={g}
              onClick={(e) => { e.stopPropagation(); onMove(itemId, g); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   간편모드 행
─────────────────────────────────────────────── */
function SimplePortfolioRow({
  item,
  currentPrice,
  priceLoading,
}: {
  item: PortfolioItem;
  currentPrice?: number;
  priceLoading?: boolean;
}) {
  const isDomestic = item.is_domestic;
  const evalValue  = currentPrice != null ? currentPrice * item.quantity : null;
  const pnlAmount  = evalValue != null ? evalValue - item.total_cost : null;
  const pnlPct     = pnlAmount != null && item.total_cost > 0
    ? (pnlAmount / item.total_cost) * 100
    : null;
  const isUp = (pnlPct ?? 0) >= 0;

  const fmtPrice = (v: number) =>
    isDomestic
      ? `₩${v.toLocaleString("ko-KR")}`
      : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      {/* 종목명 */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
        <p className="text-xs text-gray-400 font-mono">{item.ticker} · {item.market}</p>
      </div>

      {/* 수익률 */}
      <div className="w-24 text-right">
        {pnlPct != null ? (
          <span className={clsx(
            "text-sm font-bold",
            isUp ? "text-red-500" : "text-blue-500"
          )}>
            {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
          </span>
        ) : (
          <span className={clsx("text-xs", priceLoading ? "text-gray-400 animate-pulse" : "text-gray-300")}>
            {priceLoading ? "조회중" : "—"}
          </span>
        )}
      </div>

      {/* 현재 평가금액 */}
      <div className="w-32 text-right">
        {evalValue != null ? (
          <p className="text-sm font-semibold text-gray-900">{fmtPrice(evalValue)}</p>
        ) : (
          <p className={clsx("text-xs", priceLoading ? "text-gray-400 animate-pulse" : "text-gray-300")}>
            {priceLoading ? "조회중" : "—"}
          </p>
        )}
        <p className="text-xs text-gray-400">평가금액</p>
      </div>

      {/* 예상 수익/손해 */}
      <div className="w-32 text-right">
        {pnlAmount != null ? (
          <>
            <p className={clsx("text-sm font-bold", isUp ? "text-red-500" : "text-blue-500")}>
              {isUp ? "+" : ""}{fmtPrice(pnlAmount)}
            </p>
            <p className="text-xs text-gray-400">{isUp ? "예상수익" : "예상손해"}</p>
          </>
        ) : (
          <p className={clsx("text-xs", priceLoading ? "text-gray-400 animate-pulse" : "text-gray-300")}>
            {priceLoading ? "조회중" : "—"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   그룹 섹션 헤더
─────────────────────────────────────────────── */
function GroupHeader({
  groupName,
  count,
  collapsed,
  onToggle,
  onRename,
  onDelete,
  isDefault,
  totalCost,
  totalValue,
  hasPrices,
}: {
  groupName: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  isDefault: boolean;
  totalCost: number;
  totalValue: number | null;
  hasPrices: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(groupName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== groupName) onRename(trimmed);
    setEditing(false);
  };

  const pnlAmount = totalValue != null ? totalValue - totalCost : null;
  const pnlPct    = pnlAmount != null && totalCost > 0 ? (pnlAmount / totalCost) * 100 : null;
  const isUp      = (pnlPct ?? 0) >= 0;

  const fmtKRW = (v: number) =>
    Math.abs(v) >= 100_000_000
      ? `${(v / 100_000_000).toFixed(1)}억`
      : `${(v / 10_000).toFixed(0)}만`;

  return (
    <div
      className="flex items-center gap-2 cursor-pointer select-none"
      onClick={() => !editing && onToggle()}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditName(groupName); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-base font-bold text-gray-900 border-b border-brand-400 outline-none bg-transparent w-48"
          />
        ) : (
          <h2 className="text-base font-bold text-gray-900">{groupName}</h2>
        )}
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{count}개</span>
      </div>

      {/* 그룹 합계 요약 */}
      {hasPrices && pnlPct != null && (
        <div className="hidden sm:flex items-center gap-4 mr-2" onClick={(e) => e.stopPropagation()}>
          {/* 수익률 */}
          <div className="text-right">
            <p className={clsx("text-sm font-bold", isUp ? "text-red-500" : "text-blue-500")}>
              {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400">수익률</p>
          </div>
          {/* 평가금액 */}
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">
              {fmtKRW(totalValue!)}원
            </p>
            <p className="text-xs text-gray-400">평가금액</p>
          </div>
          {/* 손익 */}
          <div className="text-right">
            <p className={clsx("text-sm font-bold", isUp ? "text-red-500" : "text-blue-500")}>
              {isUp ? "+" : ""}{fmtKRW(pnlAmount!)}원
            </p>
            <p className="text-xs text-gray-400">{isUp ? "예상수익" : "예상손해"}</p>
          </div>
        </div>
      )}

      {!isDefault && !editing && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(groupName); }}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            title="그룹 이름 변경"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (count > 0) {
                if (!confirm(`"${groupName}" 그룹을 삭제하면 ${count}개 종목이 "기본" 그룹으로 이동됩니다. 계속하시겠습니까?`)) return;
              }
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="그룹 삭제"
          >
            <X size={13} />
          </button>
        </>
      )}
      {editing && (
        <>
          <button onClick={(e) => { e.stopPropagation(); commit(); }} className="p-1 rounded hover:bg-green-50 text-green-600">
            <Check size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEditName(groupName); setEditing(false); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={13} />
          </button>
        </>
      )}

      {!editing && (
        collapsed
          ? <ChevronRight size={16} className="text-gray-400" />
          : <ChevronDown size={16} className="text-gray-400" />
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   메인 페이지
─────────────────────────────────────────────── */
export const PortfolioPage = () => {
  const { data: items = [], isLoading } = usePortfolio();
  const { data: prices = {}, isFetching: pricesFetching, refetch: refetchPrices } =
    usePortfolioPrices(items.length > 0);
  const { mutate: addItem,    isPending: adding    } = useAddPortfolio();
  const { mutate: updateItem, isPending: updating  } = useUpdatePortfolio();
  const { mutate: removeItem } = useRemovePortfolio();
  const { mutate: analyze,    isPending: analyzing, variables: analyzingId } = useAnalyzePortfolio();

  const [showAddModal,      setShowAddModal]      = useState(false);
  const [editTarget,        setEditTarget]        = useState<PortfolioItem | null>(null);
  const [analysisResult,    setAnalysisResult]    = useState<PortfolioAnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [collapsedGroups,   setCollapsedGroups]   = useState<Set<string>>(new Set());
  const [viewMode,          setViewMode]          = useState<"detail" | "simple">("detail");

  /* 그룹 목록 (items에서 파생) */
  const groups = Array.from(new Set(items.map((i) => i.group_name || "기본"))).sort((a, b) => {
    if (a === "기본") return -1;
    if (b === "기본") return 1;
    return a.localeCompare(b);
  });

  const existingGroups = groups;

  /* 포트폴리오 요약 계산 */
  const summary = items.reduce(
    (acc, item) => {
      const cp = prices[item.ticker] ?? null;
      acc.totalCost += item.total_cost;
      if (cp != null) acc.totalValue += cp * item.quantity;
      return acc;
    },
    { totalCost: 0, totalValue: 0 }
  );

  const hasPrices      = Object.keys(prices).length > 0;
  const totalPnlAmount = summary.totalValue - summary.totalCost;
  const totalPnlPct    = summary.totalCost > 0 ? (totalPnlAmount / summary.totalCost) * 100 : 0;
  const isProfit       = totalPnlPct >= 0;

  const fmtKRW = (v: number) =>
    v >= 100_000_000
      ? `${(v / 100_000_000).toFixed(1)}억`
      : `${(v / 10_000).toFixed(0)}만`;

  const handleAdd = (data: Parameters<typeof addItem>[0]) => {
    addItem(data, { onSuccess: () => setShowAddModal(false) });
  };

  const handleUpdate = (data: { avg_price?: number; quantity?: number; memo?: string; group_name?: string }) => {
    if (!editTarget) return;
    updateItem(
      { id: editTarget.id, payload: data },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const handleMoveGroup = (itemId: number, newGroup: string) => {
    updateItem({ id: itemId, payload: { group_name: newGroup } });
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    items
      .filter((i) => (i.group_name || "기본") === oldName)
      .forEach((i) => updateItem({ id: i.id, payload: { group_name: newName } }));
  };

  const handleDeleteGroup = (groupName: string) => {
    items
      .filter((i) => (i.group_name || "기본") === groupName)
      .forEach((i) => updateItem({ id: i.id, payload: { group_name: "기본" } }));
  };

  const handleAnalyze = (id: number) => {
    analyze(id, {
      onSuccess: (result) => {
        setAnalysisResult(result);
        setShowAnalysisModal(true);
      },
      onError: (err: any) => {
        alert(err?.message ?? "분석 중 오류가 발생했습니다.");
      },
    });
  };

  const toggleCollapse = (group: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 종목 관리</h1>
          <p className="text-gray-500 text-sm mt-0.5">보유 종목 수익률 추적 및 AI 매도·추가매수 의견</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          {items.length > 0 && (
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("simple")}
                title="간편모드"
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                  viewMode === "simple"
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <LayoutList size={15} />
                <span className="hidden sm:inline">간편</span>
              </button>
              <button
                onClick={() => setViewMode("detail")}
                title="상세모드"
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                  viewMode === "detail"
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">상세</span>
              </button>
            </div>
          )}

          {items.length > 0 && (
            <button
              onClick={() => refetchPrices()}
              disabled={pricesFetching}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={pricesFetching ? "animate-spin" : ""} />
              현재가 갱신
            </button>
          )}
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus size={16} />
            종목 추가
          </Button>
        </div>
      </div>

      {/* 포트폴리오 요약 */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">보유 종목</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {items.length}
              <span className="text-sm font-normal text-gray-400 ml-1">종목</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">총 매입금액</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {fmtKRW(summary.totalCost)}
              <span className="text-sm font-normal text-gray-400 ml-1">원</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-gray-400" />
              <p className="text-xs text-gray-400">평가금액</p>
            </div>
            {hasPrices ? (
              <p className="text-xl font-bold text-gray-900">
                {fmtKRW(summary.totalValue)}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            ) : (
              <p className="text-sm text-gray-300 mt-2">{pricesFetching ? "조회 중..." : "—"}</p>
            )}
          </div>

          <div className={`rounded-2xl border p-4 ${
            hasPrices
              ? isProfit ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
              : "bg-white border-gray-100"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {isProfit
                ? <TrendingUp size={16} className="text-red-400" />
                : <TrendingDown size={16} className="text-blue-400" />}
              <p className="text-xs text-gray-400">총 평가손익</p>
            </div>
            {hasPrices ? (
              <>
                <p className={`text-xl font-bold ${isProfit ? "text-red-600" : "text-blue-600"}`}>
                  {isProfit ? "+" : ""}{fmtKRW(totalPnlAmount)}
                  <span className="text-sm font-normal ml-1">원</span>
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${isProfit ? "text-red-500" : "text-blue-500"}`}>
                  {isProfit ? "+" : ""}{totalPnlPct.toFixed(2)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-300 mt-2">{pricesFetching ? "조회 중..." : "—"}</p>
            )}
          </div>
        </div>
      )}

      {/* 종목 목록 — 그룹별 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Wallet size={48} className="text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">보유 종목이 없습니다</h3>
          <p className="text-sm text-gray-300 mb-6">
            종목을 추가하고 AI 분석으로 매도 / 추가매수 의견을 받아보세요.
          </p>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus size={16} />
            첫 종목 추가하기
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const groupItems  = items.filter((i) => (i.group_name || "기본") === group);
            const isCollapsed = collapsedGroups.has(group);

            const groupTotalCost  = groupItems.reduce((s, i) => s + i.total_cost, 0);
            const groupPriceCount = groupItems.filter((i) => prices[i.ticker] != null).length;
            const groupTotalValue = groupPriceCount === groupItems.length && groupItems.length > 0
              ? groupItems.reduce((s, i) => s + (prices[i.ticker] ?? 0) * i.quantity, 0)
              : null;

            return (
              <div key={group}>
                <div className="mb-3 pb-2 border-b border-gray-100">
                  <GroupHeader
                    groupName={group}
                    count={groupItems.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleCollapse(group)}
                    onRename={(newName) => handleRenameGroup(group, newName)}
                    onDelete={() => handleDeleteGroup(group)}
                    isDefault={group === "기본"}
                    totalCost={groupTotalCost}
                    totalValue={groupTotalValue}
                    hasPrices={hasPrices}
                  />
                </div>

                {!isCollapsed && (
                  viewMode === "detail" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupItems.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2">
                          <PortfolioCard
                            item={item}
                            currentPrice={prices[item.ticker] ?? undefined}
                            priceLoading={pricesFetching && !(item.ticker in prices)}
                            onEdit={() => setEditTarget(item)}
                            onDelete={() => {
                              if (window.confirm(`${item.name} 종목을 삭제하시겠습니까?`)) {
                                removeItem(item.id);
                              }
                            }}
                            onAnalyze={() => handleAnalyze(item.id)}
                            analyzing={analyzing && analyzingId === item.id}
                          />
                          {groups.length > 1 && (
                            <div className="flex justify-end px-1">
                              <MoveGroupDropdown
                                itemId={item.id}
                                currentGroup={group}
                                allGroups={groups}
                                onMove={handleMoveGroup}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 간편모드 */
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {/* 테이블 헤더 */}
                      <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium">
                        <span className="flex-1">종목명</span>
                        <span className="w-24 text-right">수익률</span>
                        <span className="w-32 text-right">평가금액</span>
                        <span className="w-32 text-right">수익/손해</span>
                      </div>
                      {groupItems.map((item) => (
                        <SimplePortfolioRow
                          key={item.id}
                          item={item}
                          currentPrice={prices[item.ticker] ?? undefined}
                          priceLoading={pricesFetching && !(item.ticker in prices)}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 종목 추가 모달 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="종목 추가"
        size="md"
      >
        <PortfolioForm
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
          loading={adding}
          existingGroups={existingGroups}
        />
      </Modal>

      {/* 종목 수정 모달 */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="종목 수정"
        size="md"
      >
        {editTarget && (
          <PortfolioForm
            initial={editTarget}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
            loading={updating}
            existingGroups={existingGroups}
          />
        )}
      </Modal>

      {/* AI 분석 결과 모달 */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        title={analysisResult ? `${analysisResult.name} — AI 포트폴리오 분석` : "AI 분석"}
        size="xl"
      >
        {analysisResult && <PortfolioAnalysisBox result={analysisResult} />}
      </Modal>
    </div>
  );
};
