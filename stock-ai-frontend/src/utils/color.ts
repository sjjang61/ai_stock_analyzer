export const getPriceColor = (change: number, isDomestic = true) => {
  if (change === 0) return "text-gray-500";
  if (isDomestic) {
    return change > 0 ? "text-red-500" : "text-blue-500";
  }
  return change > 0 ? "text-green-500" : "text-red-500";
};

export const getRSIColor = (rsi: number): string => {
  if (rsi >= 70) return "text-red-500";
  if (rsi <= 30) return "text-blue-500";
  return "text-gray-600";
};

export const getSignalColor = (signal: string): string => {
  switch (signal) {
    case "BUY":   return "text-green-600";
    case "SELL":  return "text-red-600";
    case "HOLD":  return "text-yellow-600";
    case "WATCH": return "text-gray-500";
    default:      return "text-gray-500";
  }
};
