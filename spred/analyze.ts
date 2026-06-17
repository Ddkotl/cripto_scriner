import { getKlines } from "../api_mex/get_clines";

export interface MarketRegime {
  anchor: number;
  range: number;
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  rangePct: number;
  driftPct: number;
  trendFactor: number;
  isSideways: boolean;
  localMinPrice: number;
  localMaxPrice: number;
  localRange: number;
  spreadPct: number;
  tradesLastMinute: number;
}

export async function analyzeMarket(
  symbol: string,
  lookbackMinutes: number = 15, // Изменил дефолт на 15, так как в ваших комментариях указано 15 минут
): Promise<MarketRegime | null> {
  try {
    const klines = await getKlines(symbol, "1m", lookbackMinutes);
    if (!klines || klines.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = 0;

    for (const k of klines) {
      const high = Number(k[2]); // High
      const low = Number(k[3]); // Low

      if (isNaN(low) || isNaN(high)) continue;

      if (low < minPrice) minPrice = low;
      if (high > maxPrice) maxPrice = high;
    }

    if (minPrice === Infinity || maxPrice === 0) return null;

    const anchor = (minPrice + maxPrice) / 2;
    const range = maxPrice - minPrice;

    const lastCandle = klines[klines.length - 1];
    const currentPrice = Number(lastCandle?.[4]); // Close
    if (isNaN(currentPrice)) return null;

    const localHigh = Number(lastCandle?.[2]);
    const localLow = Number(lastCandle?.[3]);

    const localMinPrice = !isNaN(localLow) ? localLow : currentPrice;
    const localMaxPrice = !isNaN(localHigh) ? localHigh : currentPrice;
    const localRange = localMaxPrice - localMinPrice;

    const rangePct = ((maxPrice - minPrice) / anchor) * 100;
    const driftPct = (Math.abs(currentPrice - anchor) / anchor) * 100;
    const trendFactor = rangePct > 0 ? driftPct / rangePct : 0;

    // Ваше условие флета
    const isSideways =
      rangePct >= 0.05 && rangePct <= 1.5 && trendFactor <= 0.5;
    return {
      anchor,
      range,
      minPrice,
      maxPrice,
      currentPrice,
      rangePct,
      driftPct,
      trendFactor,
      isSideways,
      localMinPrice,
      localMaxPrice,
      localRange,
      spreadPct: 0,
      tradesLastMinute: 0,
    };
  } catch (e: any) {
    return null;
  }
}
