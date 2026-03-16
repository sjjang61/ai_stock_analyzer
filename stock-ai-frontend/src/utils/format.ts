export const formatPrice = (price: number, isDomestic = true): string => {
  if (isDomestic) return `₩${price.toLocaleString("ko-KR")}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
};

export const formatChangePct = (pct: number): string => {
  const sign = pct >= 0 ? "▲ +" : "▼ ";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
};

export const formatVolume = (vol: number): string => {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000)     return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
};

export const formatMarketCap = (cap: number): string => {
  if (cap >= 1_000_000_000_000) return `${(cap / 1_000_000_000_000).toFixed(1)}조`;
  if (cap >= 100_000_000)       return `${(cap / 100_000_000).toFixed(0)}억`;
  return cap.toLocaleString();
};

export const formatDate = (dateStr: string): string => {
  return dateStr?.slice(0, 10) ?? "";
};
