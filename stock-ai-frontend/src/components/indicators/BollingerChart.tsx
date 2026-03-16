import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface Props {
  data: Array<{
    date: string;
    close?: number;
    bb_upper?: number;
    bb_middle?: number;
    bb_lower?: number;
  }>;
}

export const BollingerChart = ({ data }: Props) => (
  <div>
    <h4 className="text-sm font-medium text-gray-500 mb-2">볼린저 밴드</h4>
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, bottom: 0, left: 10 }}>
        <defs>
          <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={(v) => v.toLocaleString()} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: "none", background: "#1f2937", color: "#fff" }}
          formatter={(v: number) => [v?.toLocaleString(), ""]}
        />
        <Area type="monotone" dataKey="bb_upper" stroke="#0ea5e9" fill="url(#bbGrad)" strokeWidth={1} dot={false} />
        <Line type="monotone" dataKey="bb_middle" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" dot={false} />
        <Line type="monotone" dataKey="bb_lower" stroke="#0ea5e9" strokeWidth={1} dot={false} />
        <Line type="monotone" dataKey="close" stroke="#1f2937" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);
