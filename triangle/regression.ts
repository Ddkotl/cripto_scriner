import type { Pivot, RegressionLine } from "./types";

export function regression(points: Pivot[]): RegressionLine {

  const n = points.length;

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;

  for (const p of points) {
    sx += p.index;
    sy += p.price;
    sxy += p.index * p.price;
    sxx += p.index * p.index;
  }

  const slope =
    (n * sxy - sx * sy) /
    (n * sxx - sx * sx);

  const intercept =
    (sy - slope * sx) / n;

  return {
    slope,
    intercept,
  };
}