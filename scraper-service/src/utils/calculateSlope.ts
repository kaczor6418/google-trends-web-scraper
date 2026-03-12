/**
 * Calculates the slope of the trend line using Simple Linear Regression:
 * $$m = \frac{n(\sum xy) - (\sum x)(\sum y)}{n(\sum x^2) - (\sum x)^2}$$
 * * @param values - Array of search interest values.
 * @returns The growth rate (slope) of the trend.
 */
export function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const sum = (a: number, b: number) => a + b;
  
  const sumX = xs.reduce(sum, 0);
  const sumY = values.reduce(sum, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  
  const num = n * sumXY - sumX * sumY;
  const den = n * sumX2 - sumX * sumX;
  
  return den === 0 ? 0 : num / den;
}