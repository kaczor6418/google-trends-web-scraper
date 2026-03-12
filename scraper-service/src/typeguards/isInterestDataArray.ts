import { InterestOverTimePoint } from '../types/trends.types';

/**
 * Type Guard: Verifies that the data is an array of InterestOverTimePoint
 */
export function isInterestDataArray(data: unknown): data is InterestOverTimePoint[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item.time === 'string' && 
        typeof item.value === 'string'
    )
  );
}