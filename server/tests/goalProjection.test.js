import { describe, it, expect } from 'vitest';
import { projectGoal } from '../utils/goalProjection.js';

const now = new Date('2026-11-15');

describe('projectGoal', () => {
  it('marks a completed goal as 100%', () => {
    const p = projectGoal({ target: 1000, current: 1000, deadline: '2027-01-01', now });
    expect(p.likelihood).toBe(100);
  });

  it('computes the required monthly deposit from the deadline (not a fixed /3)', () => {
    const p = projectGoal({ target: 120000, current: 0, deadline: '2027-11-15', monthlySaving: 5000, now });
    expect(p.monthsLeft).toBe(12);
    expect(p.requiredMonthly).toBe(10000);
  });

  it('likelihood scales with savings pace vs requirement', () => {
    const base = { target: 120000, current: 0, deadline: '2027-11-15', now };
    const slow = projectGoal({ ...base, monthlySaving: 2000 }).likelihood;
    const fast = projectGoal({ ...base, monthlySaving: 10000 }).likelihood;
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeLessThanOrEqual(99);
  });

  it('gives a low likelihood with no savings pace', () => {
    expect(projectGoal({ target: 50000, current: 0, deadline: '2027-06-01', monthlySaving: 0, now }).likelihood).toBe(5);
  });

  it('handles a passed deadline', () => {
    const p = projectGoal({ target: 50000, current: 10000, deadline: '2026-01-01', monthlySaving: 9000, now });
    expect(p.likelihood).toBe(0);
    expect(p.suggestion).toMatch(/deadline passed/i);
  });

  it('handles goals with no deadline', () => {
    const p = projectGoal({ target: 50000, current: 10000, deadline: null, monthlySaving: 10000, now });
    expect(p.likelihood).toBeNull();
    expect(p.suggestion).toMatch(/4 months/);
  });
});
