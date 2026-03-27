import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star, Trash2, Plus, ChevronDown, ChevronRight,
  Pencil, Check, X, FolderPlus, MoveRight,
} from "lucide-react";
import {
  useWatchlistStore,
  DEFAULT_GROUP,
  type WatchlistItem,
  type WatchlistGroup,
} from "@/store/useWatchlistStore";
import { Button } from "@/components/ui/Button";
import { stocksApi } from "@/api/stocks";

/* ───────────────────────────────────────────────
   그룹 이동 드롭다운
─────────────────────────────────────────────── */
function MoveGroupDropdown({
  ticker,
  currentGroup,
  groups,
  onMove,
}: {
  ticker: string;
  currentGroup: string;
  groups: WatchlistGroup[];
  onMove: (ticker: string, group: string) => void;
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

  const others = groups.filter((g) => g.name !== currentGroup);
  if (others.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="그룹 이동"
      >
        <MoveRight size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[130px] py-1">
          {others.map((g) => (
            <button
              key={g.name}
              onClick={(e) => {
                e.stopPropagation();
                onMove(ticker, g.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: g.color }}
              />
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   그룹 섹션
─────────────────────────────────────────────── */
function GroupSection({
  group,
  items,
  allGroups,
  onRemoveItem,
  onMoveItem,
  onRenameGroup,
  onDeleteGroup,
}: {
  group: WatchlistGroup;
  items: WatchlistItem[];
  allGroups: WatchlistGroup[];
  onRemoveItem: (ticker: string) => void;
  onMoveItem: (ticker: string, group: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDefault = group.name === DEFAULT_GROUP;

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== group.name) onRenameGroup(group.name, trimmed);
    setEditing(false);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 그룹 헤더 */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditName(group.name); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-semibold text-gray-800 border-b border-brand-400 outline-none bg-transparent"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-gray-800">
            {group.name}
          </span>
        )}

        <span className="text-xs text-gray-400 mr-1">{items.length}개</span>

        {/* 편집 버튼 (기본 그룹 제외) */}
        {!isDefault && !editing && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(group.name); }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="이름 변경"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (items.length > 0) {
                  if (!confirm(`"${group.name}" 그룹을 삭제하면 종목이 기본 그룹으로 이동됩니다. 계속하시겠습니까?`)) return;
                }
                onDeleteGroup(group.name);
              }}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              title="그룹 삭제"
            >
              <X size={12} />
            </button>
          </>
        )}
        {editing && (
          <>
            <button onClick={(e) => { e.stopPropagation(); commitRename(); }} className="p-1 rounded hover:bg-green-50 text-green-600">
              <Check size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setEditName(group.name); setEditing(false); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <X size={12} />
            </button>
          </>
        )}

        {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>

      {/* 종목 목록 */}
      {!collapsed && (
        <div className="border-t border-gray-50">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              이 그룹에 종목이 없습니다
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() => navigate(`/stocks/${item.ticker}?domestic=${item.isDomestic}`)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${group.color}18` }}>
                    <Star size={15} style={{ color: group.color, fill: group.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.ticker} · {item.market}</p>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <MoveGroupDropdown
                    ticker={item.ticker}
                    currentGroup={item.group}
                    groups={allGroups}
                    onMove={onMoveItem}
                  />
                  <button
                    onClick={() => onRemoveItem(item.ticker)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   새 그룹 추가 인라인 폼
─────────────────────────────────────────────── */
function AddGroupForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) { onAdd(trimmed); }
    setName("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm w-full"
      >
        <FolderPlus size={15} />
        새 그룹 추가
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-400 bg-white">
      <FolderPlus size={15} className="text-brand-500 flex-shrink-0" />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setName(""); setOpen(false); }
        }}
        placeholder="예: 스윙종목, 단기투자..."
        className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
      />
      <button onClick={commit} className="p-1 rounded text-green-600 hover:bg-green-50"><Check size={14} /></button>
      <button onClick={() => { setName(""); setOpen(false); }} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X size={14} /></button>
    </div>
  );
}

/* ───────────────────────────────────────────────
   메인 페이지
─────────────────────────────────────────────── */
export const WatchlistPage = () => {
  const { items, groups, remove, updateName, moveToGroup, addGroup, removeGroup, renameGroup } =
    useWatchlistStore();

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
        // 무시
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 그룹별로 분류 (groups 순서 유지, 항목 있는 그룹 + 없는 그룹 모두 표시)
  const itemsByGroup = groups.reduce<Record<string, WatchlistItem[]>>((acc, g) => {
    acc[g.name] = items.filter((i) => i.group === g.name);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관심 종목</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {groups.length}개 그룹 · {items.length}개 종목
          </p>
        </div>
      </div>

      {/* 그룹 섹션들 */}
      {groups.length > 0 || items.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupSection
              key={group.name}
              group={group}
              items={itemsByGroup[group.name] ?? []}
              allGroups={groups}
              onRemoveItem={remove}
              onMoveItem={moveToGroup}
              onRenameGroup={renameGroup}
              onDeleteGroup={removeGroup}
            />
          ))}

          {/* 새 그룹 추가 */}
          <AddGroupForm onAdd={(name) => addGroup(name)} />
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
