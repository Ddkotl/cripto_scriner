import { TriangleConfig } from "./config";
import type { Candle, TriangleResult } from "./types";
import { findPivots } from "./pivots";
import { regression } from "./regression";

const empty = (): TriangleResult => ({
  isTriangle: false,
  upperSlope: 0,
  lowerSlope: 0,
  upperIntercept: 0,
  lowerIntercept: 0,
  apexIndex: 0,
});

export function detectTriangle(candles: Candle[]): TriangleResult {
  const { highs, lows } = findPivots(
    candles,
    TriangleConfig.pivotLeft,
    TriangleConfig.pivotRight,
  );

  if (
    highs.length < TriangleConfig.minHighs ||
    lows.length < TriangleConfig.minLows
  ) {
    return empty();
  }

  const upper = regression(highs);
  const lower = regression(lows);

  if (upper.slope >= 0) return empty();
  if (lower.slope <= 0) return empty();

  const firstWidth = highs[0]!.price - lows[0]!.price;

  const lastWidth = highs.at(-1)!.price - lows.at(-1)!.price;

  const compression = lastWidth / firstWidth;

  if (compression > TriangleConfig.minCompression) {
    return empty();
  }

  const ratio = Math.abs(upper.slope) / Math.abs(lower.slope);

  if (
    ratio < TriangleConfig.slopeRatioMin ||
    ratio > TriangleConfig.slopeRatioMax
  ) {
    return empty();
  }

  const apex =
    (lower.intercept - upper.intercept) / (upper.slope - lower.slope);

  if (
    apex <= candles.length ||
    apex > candles.length + TriangleConfig.maxApexDistance
  ) {
    return empty();
  }

  return {
    isTriangle: true,
    upperSlope: upper.slope,
    lowerSlope: lower.slope,
    upperIntercept: upper.intercept,
    lowerIntercept: lower.intercept,
    apexIndex: Math.round(apex),
  };
}
