import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cached, clearCache } from '../ai/cache.js';

describe('ttl cache', () => {
  beforeEach(() => clearCache());

  it('calls the producer once within the TTL', async () => {
    const producer = vi.fn().mockResolvedValue('v');
    await cached('k', 1000, producer);
    await cached('k', 1000, producer);
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('recomputes after the TTL expires', async () => {
    const producer = vi.fn().mockResolvedValue('v');
    await cached('k', -1, producer);
    await cached('k', -1, producer);
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('keeps separate keys separate (per-user isolation)', async () => {
    const a = await cached('user:1', 1000, async () => 'A');
    const b = await cached('user:2', 1000, async () => 'B');
    expect([a, b]).toEqual(['A', 'B']);
  });
});
