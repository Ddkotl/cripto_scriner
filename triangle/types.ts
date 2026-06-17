export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Pivot {
  index: number;
  price: number;
}

export interface RegressionLine {
  slope: number;
  intercept: number;
}

export interface TriangleResult {
  isTriangle: boolean;
  upperSlope: number;
  lowerSlope: number;
  upperIntercept: number;
  lowerIntercept: number;
  apexIndex: number;
}