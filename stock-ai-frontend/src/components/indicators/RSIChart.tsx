import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface Props {
  data: Array<{ date: string; rsi_14?: number; rsi_9?: number }>;
}

export const RSIChart = ({ data }: Props) => (
  <div>
    <h4 className="text-sm font-medium text-gray-500 mb-2">RSI</h4>
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 5, right: 30, bottom: 0, left: 10 }}>
        <defs>
          <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 10 }} width={25} />
        <Tooltip
          formatter={(v: number) => [`${v?.toFixed(1)}`, "RSI"]}
          contentStyle={{ fontSize: 11, borderRadius: 6, border: "none", background: "#1f2937", color: "#fff" }}
        />
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={30} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />
        <Area type="monotone" dataKey="rsi_14" stroke="#8b5cf6" fill="url(#rsiGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
