import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// No real DB / Telegram connection in unit tests
const query = vi.fn();
vi.mock('../config/db.js', () => ({ pool: { query: (...a) => query(...a) } }));
vi.mock('../telegramBot.js', () => ({ default: { sendMessage: vi.fn() } }));

let app;
beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
  process.env.NODE_ENV = 'test';
  app = (await import('../app.js')).default;
});

const token = id => jwt.sign({ id }, process.env.JWT_SECRET);

describe('health & security headers', () => {
  it('GET /api/health is ok and sends helmet headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('auth middleware', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/categories').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});

describe('registration validation', () => {
  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects a bad email', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'nope', password: 'longenough1' });
    expect(res.status).toBe(400);
  });
});

describe('password reset hardening', () => {
  it('requires the email, not just the code', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ code: '123456', newPassword: 'longenough1' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown email with a generic error', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/reset-password')
      .send({ email: 'x@y.com', code: '123456', newPassword: 'longenough1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('locks the code after 5 wrong attempts', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, reset_code: 'abc', reset_code_expires: new Date(Date.now() + 60000), attempts: 5 }],
    });
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/reset-password')
      .send({ email: 'x@y.com', code: '123456', newPassword: 'longenough1' });
    expect(res.status).toBe(429);
  });
});

describe('category toggle is per-user', () => {
  it('only writes to the caller\'s own user_disabled_categories rows', async () => {
    query.mockReset();
    query.mockResolvedValue({ rowCount: 0, rows: [] });
    const res = await request(app).put('/api/categories/3/toggle').set('Authorization', `Bearer ${token(42)}`);
    expect(res.status).toBe(200);
    const sqls = query.mock.calls.map(c => c[0]);
    expect(sqls.every(s => s.includes('user_disabled_categories'))).toBe(true);
    expect(query.mock.calls[0][1]).toEqual([42, 3]); // scoped to user 42
    expect(sqls.some(s => /UPDATE categories/i.test(s))).toBe(false);
  });

  it('rejects a non-numeric category id', async () => {
    const res = await request(app).put('/api/categories/abc/toggle').set('Authorization', `Bearer ${token(1)}`);
    expect(res.status).toBe(400);
  });
});

describe('AI endpoints', () => {
  it('validates the question', async () => {
    const res = await request(app).post('/api/ask-your-money')
      .set('Authorization', `Bearer ${token(1)}`).send({ question: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects over-long questions', async () => {
    const res = await request(app).post('/api/ask-your-money')
      .set('Authorization', `Bearer ${token(1)}`).send({ question: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });
});
