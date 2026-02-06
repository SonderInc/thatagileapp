import { describe, it, expect } from 'vitest';
import { computeWsjfScore } from './WsjfCalculator';

describe('computeWsjfScore', () => {
  it('returns null when Job Size is null', () => {
    expect(computeWsjfScore(1, 2, 3, null)).toBe(null);
    expect(computeWsjfScore(undefined, 2, 3, null)).toBe(null);
  });

  it('returns null when Job Size is 0', () => {
    expect(computeWsjfScore(1, 2, 3, 0)).toBe(null);
  });

  it('returns null when Job Size is undefined', () => {
    expect(computeWsjfScore(1, 2, 3, undefined)).toBe(null);
  });

  it('computes (BV + TC + RR) / Job Size when Job Size > 0', () => {
    expect(computeWsjfScore(3, 4, 5, 2)).toBe(6); // (3+4+5)/2 = 6
    expect(computeWsjfScore(1, 1, 1, 1)).toBe(3);
    expect(computeWsjfScore(5, 5, 5, 5)).toBe(3);
  });

  it('treats undefined/null BV, TC, RR as 0', () => {
    expect(computeWsjfScore(undefined, 0, 0, 1)).toBe(0);
    expect(computeWsjfScore(0, undefined, 0, 1)).toBe(0);
    expect(computeWsjfScore(0, 0, undefined, 1)).toBe(0);
    expect(computeWsjfScore(2, null, 3, 2)).toBe(2.5); // (2+0+3)/2
  });
});
