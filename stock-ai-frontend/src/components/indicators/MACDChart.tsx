import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface Props {
  data: Array<{ date: string; macd?: number; macd_signal?: number; macd_hist?: number }>;
}

export const MACDChart = ({ data }: Props) => (
  <div>
    <h4 className="text-sm font-medium text-gray-500 mb-2">MACD</h4>
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: "none", background: "#1f2937", color: "#fff" }}
          formatter={(v: number, name: string) => [v?.toFixed(2), name === "macd" ? "MACD" : name === "macd_signal" ? "시그널" : "히스토그램"]}
        />
        <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
        <Bar dataKey="macd_hist" fill="#93c5fd" opacity={0.6} radius={[1, 1, 0, 0]} />
        <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="macd_signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);
