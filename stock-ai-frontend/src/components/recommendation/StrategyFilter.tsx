import { Button } from "@/components/ui/Button";

interface Props {
  signal: string;
  onSignalChange: (signal: string) => void;
  market: string;
  onMarketChange: (market: string) => void;
}

const SIGNALS = [
  { key: "", label: "전체" },
  { key: "BUY",   label: "매수" },
  { key: "SELL",  label: "매도" },
  { key: "HOLD",  label: "보유" },
  { key: "WATCH", label: "관망" },
];

const MARKETS = [
  { key: "ALL",      label: "전체" },
  { key: "KOSPI",    label: "KOSPI" },
  { key: "KOSDAQ",   label: "KOSDAQ" },
  { key: "NASDAQ",   label: "NASDAQ" },
];

export const StrategyFilter = ({ signal, onSignalChange, market, onMarketChange }: Props) => (
  <div className="flex flex-wrap gap-3">
    <div className="flex gap-1">
      {SIGNALS.map((s) => (
        <Button
          key={s.key}
          variant={signal === s.key ? "primary" : "secondary"}
          size="sm"
          onClick={() => onSignalChange(s.key)}
        >
          {s.label}
        </Button>
      ))}
    </div>
    <div className="flex gap-1">
      {MARKETS.map((m) => (
        <Button
          key={m.key}
          variant={market === m.key ? "primary" : "secondary"}
          size="sm"
          onClick={() => onMarketChange(m.key)}
        >
          {m.label}
        </Button>
      ))}
    </div>
  </div>
);
