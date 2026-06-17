import type { Candle, Pivot } from "./types";

export function findPivots(
  candles: Candle[],
  left: number,
  right: number,
): { highs: Pivot[]; lows: Pivot[] } {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];

  for (let i = left; i < candles.length - right; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;

      if (candles[j]!.high >= candles[i]!.high) isHigh = false;

      if (candles[j]!.low <= candles[i]!.low) isLow = false;
    }

    if (isHigh) {
      highs.push({
        index: i,
        price: candles[i]!.high,
      });
    }

    if (isLow) {
      lows.push({
        index: i,
        price: candles[i]!.low,
      });
    }
  }

  return { highs, lows };
}
