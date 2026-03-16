import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";
import clsx from "clsx";

interface Props {
  data: any[];
  showVolume?: boolean;
  showMA?: boolean;
  isDomestic?: boolean;
}

const SERIES_DEFS = [
  { key: "close",   label: "종가",   color: "#0ea5e9", isMA: false },
  { key: "sma_5",   label: "MA5",   color: "#f59e0b", isMA: true  },
  { key: "sma_20",  label: "MA20",  color: "#8b5cf6", isMA: true  },
  { key: "sma_60",  label: "MA60",  color: "#10b981", isMA: true  },
  { key: "sma_120", label: "MA120", color: "#ef4444", isMA: true  },
];

interface CrossPoint {
  date: string;
  price: number;
  type: "golden" | "dead";
}

function computeCrosses(data: any[]): CrossPoint[] {
  const crosses: CrossPoint[] = [];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    if (prev.sma_5 == null || prev.sma_20 == null || curr.sma_5 == null || curr.sma_20 == null) continue;
    const prevDiff = prev.sma_5 - prev.sma_20;
    const currDiff = curr.sma_5 - curr.sma_20;
    if (prevDiff <= 0 && currDiff > 0) {
      crosses.push({ date: curr.date, price: curr.close, type: "golden" });
    } else if (prevDiff >= 0 && currDiff < 0) {
      crosses.push({ date: curr.date, price: curr.close, type: "dead" });
    }
  }
  return crosses;
}

export const StockPriceChart = ({ data, showVolume = true, showMA = false, isDomestic = true }: Props) => {
  const firstClose = data[0]?.close ?? 0;

  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(SERIES_DEFS.map((s) => s.key))
  );

  const toggle = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const crosses = useMemo(() => (showMA ? computeCrosses(data) : []), [data, showMA]);

  // 실제 렌더링 여부: MA 계열은 showMA도 true여야 함
  const isOn = (key: string, isMA: boolean) => visible.has(key) && (!isMA || showMA);

  return (
    <div>
      {/* 범례 (클릭 토글) */}
      <div className="flex gap-3 flex-wrap mb-3 px-1 items-center">
        {SERIES_DEFS.map((s) => {
          const on = isOn(s.key, s.isMA);
          const disabled = s.isMA && !showMA;
          return (
            <button
              key={s.key}
              onClick={() => !disabled && toggle(s.key)}
              disabled={disabled}
              title={disabled ? "이동평균선 체크박스를 먼저 켜주세요" : on ? "클릭해서 숨기기" : "클릭해서 보이기"}
              className={clsx(
                "flex items-center gap-1.5 text-xs transition-opacity",
                !on ? "opacity-25" : "opacity-100",
                disabled ? "cursor-not-allowed" : "cursor-pointer hover:opacity-70"
              )}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 2.5,
                  borderRadius: 2,
                  background: s.color,
                }}
              />
              <span className="text-gray-600">{s.label}</span>
            </button>
          );
        })}

        {/* 골든/데드크로스 범례 */}
        {showMA && crosses.length > 0 && (
          <>
            <span className="inline-block w-px h-3 bg-gray-200 mx-1" />
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
              골든크로스
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
              데드크로스
            </span>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 0, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v?.slice(5) ?? ""}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tickFormatter={(v) => v.toLocaleString()}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="left"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "none",
              borderRadius: 8,
              color: "#f9fafb",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              const currency = isDomestic ? "원" : "$";
              const priceStr = isDomestic
                ? value?.toLocaleString() + currency
                : currency + value?.toLocaleString();
              if (name === "close")   return [priceStr, "종가"];
              if (name === "volume")  return [value?.toLocaleString(), "거래량"];
              if (name === "sma_5")   return [priceStr, "MA5"];
              if (name === "sma_20")  return [priceStr, "MA20"];
              if (name === "sma_60")  return [priceStr, "MA60"];
              if (name === "sma_120") return [priceStr, "MA120"];
              return [value, name];
            }}
            labelFormatter={(label) => `📅 ${label}`}
          />

          {showVolume && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#e5e7eb"
              opacity={0.6}
              radius={[2, 2, 0, 0]}
            />
          )}

          {isOn("close", false) && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {isOn("sma_5", true) && (
            <Line yAxisId="price" type="monotone" dataKey="sma_5"   stroke="#f59e0b" strokeWidth={1.2} dot={false} strokeOpacity={0.9} />
          )}
          {isOn("sma_20", true) && (
            <Line yAxisId="price" type="monotone" dataKey="sma_20"  stroke="#8b5cf6" strokeWidth={1.2} dot={false} strokeOpacity={0.9} />
          )}
          {isOn("sma_60", true) && (
            <Line yAxisId="price" type="monotone" dataKey="sma_60"  stroke="#10b981" strokeWidth={1.2} dot={false} strokeOpacity={0.9} />
          )}
          {isOn("sma_120", true) && (
            <Line yAxisId="price" type="monotone" dataKey="sma_120" stroke="#ef4444" strokeWidth={1.2} dot={false} strokeOpacity={0.9} />
          )}

          {/* 골든/데드크로스 마커 */}
          {showMA &&
            crosses.map((cross, i) => (
              <ReferenceDot
                key={i}
                yAxisId="price"
                x={cross.date}
                y={cross.price}
                r={5}
                fill={cross.type === "golden" ? "#fbbf24" : "#6366f1"}
                stroke="white"
                strokeWidth={1.5}
              />
            ))}

          <ReferenceLine yAxisId="price" y={firstClose} stroke="#d1d5db" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
