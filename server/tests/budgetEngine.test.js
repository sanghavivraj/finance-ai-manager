import { describe, it, expect } from 'vitest';
import { generateAIBudget, autoRebalance } from '../ai/budgetEngine.js';

const ALL = ['Food', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Savings', 'Investments'];
const sum = obj => Object.values(obj).reduce((a, b) => a + b, 0);

describe('generateAIBudget', () => {
  it('allocates exactly the monthly income across all categories', () => {
    expect(sum(generateAIBudget(50000, ALL))).toBe(50000);
  });

  it('still sums to income when only some categories are active', () => {
    const budget = generateAIBudget(33333, ['Food', 'Bills', 'Savings']);
    expect(Object.keys(budget)).toEqual(['Food', 'Bills', 'Savings']);
    expect(sum(budget)).toBe(33333);
  });

  it('returns an empty budget with no active categories', () => {
    expect(generateAIBudget(50000, [])).toEqual({});
  });

  it('gives Bills a larger share than Entertainment', () => {
    const b = generateAIBudget(100000, ALL);
    expect(b.Bills).toBeGreaterThan(b.Entertainment);
  });
});

describe('autoRebalance', () => {
  it('trims 10% from every category except the overspent one', () => {
    const out = autoRebalance({ Food: 1000, Shopping: 500, Bills: 2000 }, 'Food', 10000);
    expect(out).toEqual({ Shopping: 450, Bills: 1800 });
    expect(out.Food).toBeUndefined();
  });

  it('never returns negative amounts', () => {
    const out = autoRebalance({ Food: 0, Bills: 0 }, 'Food', 0);
    expect(out.Bills).toBeGreaterThanOrEqual(0);
  });
});
