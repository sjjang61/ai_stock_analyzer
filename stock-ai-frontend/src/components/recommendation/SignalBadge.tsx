import clsx from "clsx";
import type { SignalType } from "@/types/recommendation";

const SIGNAL_CONFIG: Record<SignalType, { label: string; className: string }> = {
  BUY:   { label: "매수",  className: "bg-green-100 text-green-700 border-green-200" },
  SELL:  { label: "매도",  className: "bg-red-100 text-red-700 border-red-200" },
  HOLD:  { label: "보유",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  WATCH: { label: "관망",  className: "bg-gray-100 text-gray-600 border-gray-200" },
};

interface Props {
  signal: SignalType | string;
  size?: "sm" | "md" | "lg";
}

export const SignalBadge = ({ signal, size = "md" }: Props) => {
  const config = SIGNAL_CONFIG[signal as SignalType] ?? { label: signal, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold border rounded-full",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        size === "lg" && "px-4 py-1.5 text-base",
        config.className
      )}
    >
      {config.label}
    </span>
  );
};
