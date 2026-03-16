import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistItem {
  ticker: string;
  name: string;
  market: string;
  isDomestic: boolean;
}

interface WatchlistState {
  items: WatchlistItem[];
  add: (item: WatchlistItem) => void;
  remove: (ticker: string) => void;
  has: (ticker: string) => boolean;
  updateName: (ticker: string, name: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: s.items.find((i) => i.ticker === item.ticker)
            ? s.items
            : [...s.items, item],
        })),
      remove: (ticker) =>
        set((s) => ({ items: s.items.filter((i) => i.ticker !== ticker) })),
      has: (ticker) => get().items.some((i) => i.ticker === ticker),
      updateName: (ticker, name) =>
        set((s) => ({
          items: s.items.map((i) => (i.ticker === ticker ? { ...i, name } : i)),
        })),
    }),
    { name: "watchlist" }
  )
);
