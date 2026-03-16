import { useState } from "react";
import { RSIChart } from "./RSIChart";
import { MACDChart } from "./MACDChart";
import { BollingerChart } from "./BollingerChart";
import { Tabs } from "@/components/ui/Tabs";

interface Props {
  data: any[];
}

const TABS = [
  { key: "rsi",       label: "RSI" },
  { key: "macd",      label: "MACD" },
  { key: "bollinger", label: "볼린저 밴드" },
];

export const IndicatorPanel = ({ data }: Props) => {
  const [active, setActive] = useState("rsi");

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        지표 데이터 없음
      </div>
    );
  }

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} className="mb-4" />
      {active === "rsi"       && <RSIChart data={data} />}
      {active === "macd"      && <MACDChart data={data} />}
      {active === "bollinger" && <BollingerChart data={data} />}
    </div>
  );
};
