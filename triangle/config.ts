export const TriangleConfig = {
  lookback: 80,

  pivotLeft: 3,
  pivotRight: 3,

  minHighs: 3,
  minLows: 3,

  minPatternBars: 20,

  minCompression: 0.6,

  slopeRatioMin: 0.4,
  slopeRatioMax: 2.5,

  maxApexDistance: 40,

  tolerancePercent: 0.004,
} as const;
