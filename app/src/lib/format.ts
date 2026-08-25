export function formatGameId(gameId: bigint, locale = "en") {
  return gameId.toLocaleString(locale);
}

export function formatPower(power: number) {
  return `${power.toFixed(1)}B`;
}

export function formatInt(n: number, locale = "en") {
  return Math.round(n).toLocaleString(locale);
}

export function formatCompact(n: number, locale = "en") {
  if (n === 0) return "0";
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    n
  );
}
