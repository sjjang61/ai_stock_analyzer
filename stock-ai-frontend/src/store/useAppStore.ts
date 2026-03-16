import { create } from "zustand";

interface AppState {
  marketFilter: "ALL" | "DOMESTIC" | "OVERSEAS";
  setMarketFilter: (filter: AppState["marketFilter"]) => void;
  selectedTicker: string | null;
  selectTicker: (ticker: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  marketFilter: "ALL",
  setMarketFilter: (filter) => set({ marketFilter: filter }),
  selectedTicker: null,
  selectTicker: (ticker) => set({ selectedTicker: ticker }),
}));
