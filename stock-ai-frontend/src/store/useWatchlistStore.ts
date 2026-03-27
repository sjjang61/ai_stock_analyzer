import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_GROUP = "기본";

export interface WatchlistItem {
  ticker: string;
  name: string;
  market: string;
  isDomestic: boolean;
  group: string;
}

export interface WatchlistGroup {
  name: string;
  color: string;
}

const DEFAULT_GROUPS: WatchlistGroup[] = [
  { name: DEFAULT_GROUP, color: "#6366f1" },
];

interface WatchlistState {
  items: WatchlistItem[];
  groups: WatchlistGroup[];

  // Item actions
  add: (item: Omit<WatchlistItem, "group"> & { group?: string }) => void;
  remove: (ticker: string) => void;
  has: (ticker: string) => boolean;
  updateName: (ticker: string, name: string) => void;
  moveToGroup: (ticker: string, group: string) => void;

  // Group actions
  addGroup: (name: string, color?: string) => void;
  removeGroup: (name: string) => void;
  renameGroup: (oldName: string, newName: string) => void;
}

const GROUP_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      groups: DEFAULT_GROUPS,

      add: (item) =>
        set((s) => {
          if (s.items.find((i) => i.ticker === item.ticker)) return s;
          const group = item.group ?? DEFAULT_GROUP;
          // 그룹이 없으면 자동 생성
          const groupExists = s.groups.some((g) => g.name === group);
          const newGroups = groupExists
            ? s.groups
            : [
                ...s.groups,
                {
                  name: group,
                  color: GROUP_COLORS[s.groups.length % GROUP_COLORS.length],
                },
              ];
          return {
            items: [...s.items, { ...item, group }],
            groups: newGroups,
          };
        }),

      remove: (ticker) =>
        set((s) => ({ items: s.items.filter((i) => i.ticker !== ticker) })),

      has: (ticker) => get().items.some((i) => i.ticker === ticker),

      updateName: (ticker, name) =>
        set((s) => ({
          items: s.items.map((i) => (i.ticker === ticker ? { ...i, name } : i)),
        })),

      moveToGroup: (ticker, group) =>
        set((s) => {
          const groupExists = s.groups.some((g) => g.name === group);
          const newGroups = groupExists
            ? s.groups
            : [
                ...s.groups,
                {
                  name: group,
                  color: GROUP_COLORS[s.groups.length % GROUP_COLORS.length],
                },
              ];
          return {
            items: s.items.map((i) =>
              i.ticker === ticker ? { ...i, group } : i
            ),
            groups: newGroups,
          };
        }),

      addGroup: (name, color) =>
        set((s) => {
          if (s.groups.some((g) => g.name === name)) return s;
          return {
            groups: [
              ...s.groups,
              {
                name,
                color: color ?? GROUP_COLORS[s.groups.length % GROUP_COLORS.length],
              },
            ],
          };
        }),

      removeGroup: (name) =>
        set((s) => {
          if (name === DEFAULT_GROUP) return s;
          return {
            groups: s.groups.filter((g) => g.name !== name),
            // 해당 그룹 종목은 기본으로 이동
            items: s.items.map((i) =>
              i.group === name ? { ...i, group: DEFAULT_GROUP } : i
            ),
          };
        }),

      renameGroup: (oldName, newName) =>
        set((s) => {
          if (oldName === DEFAULT_GROUP) return s;
          if (s.groups.some((g) => g.name === newName)) return s;
          return {
            groups: s.groups.map((g) =>
              g.name === oldName ? { ...g, name: newName } : g
            ),
            items: s.items.map((i) =>
              i.group === oldName ? { ...i, group: newName } : i
            ),
          };
        }),
    }),
    { name: "watchlist" }
  )
);
