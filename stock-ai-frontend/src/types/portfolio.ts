export type ActionType = "SELL" | "ADD" | "HOLD";
export type RiskLevel  = "LOW" | "MEDIUM" | "HIGH";

export interface PortfolioItem {
  id:          number;
  ticker:      string;
  name:        string;
  market:      string;
  is_domestic: boolean;
  avg_price:   number;
  quantity:    number;
  total_cost:  number;
  group_name:  string;
  memo?:       string;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioSellStrategy {
  target_price: number;
  stop_loss:    number;
  timing:       string;
  reason:       string;
}

export interface PortfolioAddStrategy {
  add_price:  number;
  condition:  string;
  reason:     string;
}

export interface PortfolioHoldStrategy {
  hold_period: string;
  reason:      string;
}

export interface PortfolioAnalysis {
  action:        ActionType;
  confidence:    number;
  sell_strategy: PortfolioSellStrategy;
  add_strategy:  PortfolioAddStrategy;
  hold_strategy: PortfolioHoldStrategy;
  summary:       string;
  risk_level:    RiskLevel;
  key_points:    string[];
  llm_provider?: string;
}

export interface PortfolioAnalysisResult {
  ticker:        string;
  name:          string;
  market:        string;
  avg_price:     number;
  quantity:      number;
  total_cost:    number;
  current_price: number;
  current_value: number;
  pnl_amount:    number;
  pnl_pct:       number;
  indicators:    Record<string, number | null>;
  analysis:      PortfolioAnalysis;
}
