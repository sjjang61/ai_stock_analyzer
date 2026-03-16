import type { Indicator } from "./indicator";

export type SignalType = "BUY" | "SELL" | "HOLD" | "WATCH";
export type RiskLevel  = "LOW" | "MEDIUM" | "HIGH";

export interface Recommendation {
  id: number;
  stockId: string;
  stockName: string;
  market: string;
  strategyName: string;
  signal: SignalType;
  score: number;
  confidence: number;
  aiSummary: string;
  aiDetail?: string;
  targetPrice?: number;
  stopLoss?: number;
  priceAt?: number;
  riskLevel?: RiskLevel;
  keyPoints?: string[];
  indicators?: Partial<Indicator>;
  createdAt: string;
}

export interface AnalysisResult {
  ticker: string;
  stockName: string;
  market: string;
  currentPrice?: number;
  analysis: {
    signal: SignalType;
    confidence: number;
    summary: string;
    riskLevel: RiskLevel;
    keyPoints?: string[];
    shortTerm?: {
      outlook: string;
      buyPrice?: number;
      sellPrice?: number;
      stopLoss?: number;
      reason?: string;
    };
    midTerm?: {
      outlook: string;
      targetPrice?: number;
      keyLevel?: number;
      reason?: string;
    };
    longTerm?: {
      outlook: string;
      targetPrice?: number;
      reason?: string;
    };
    maAnalysis?: {
      arrangement: string;
      summary: string;
    };
    llmProvider?: string;
  };
  strategySignals?: Array<{
    strategy: string;
    signal: string;
    score: number;
    reason: string;
  }>;
  indicators?: Record<string, number | null>;
}
