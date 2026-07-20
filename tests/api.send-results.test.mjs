// ============================================================================
//  Smoke tests for api/send-results.js -- validation branches only (nothing
//  here calls the real Resend API). Run with: node --test
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { mockReqRes } from './helpers.mjs';

delete process.env.RESEND_API_KEY; // exercise the "not configured yet" path
const handler = (await import('../api/send-results.js')).default;

test('rejects non-POST requests', async () => {
  const { req, res } = mockReqRes(null, { method: 'GET', ip: '198.51.100.10' });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test('rejects an unparsable JSON string body', async () => {
  const { req, res } = mockReqRes('{not json', { ip: '198.51.100.11' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
});

test('rejects a malformed email address', async () => {
  const { req, res } = mockReqRes({ email: 'not-an-email', results: {} }, { ip: '198.51.100.12' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'invalid_email');
});

test('rejects an email over the length cap', async () => {
  const longEmail = `${'a'.repeat(250)}@example.com`;
  const { req, res } = mockReqRes({ email: longEmail, results: {} }, { ip: '198.51.100.13' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'invalid_email');
});

test('accepts a valid email and reports sent:false when RESEND_API_KEY is unset', async () => {
  const { req, res } = mockReqRes(
    { email: 'student@example.com', results: { schools: [] } },
    { ip: '198.51.100.14' }
  );
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sent, false);
});

test('rate-limits after too many requests from the same IP within a minute', async () => {
  const ip = '198.51.100.15';
  let last;
  for (let i = 0; i < 11; i++) {
    const { req, res } = mockReqRes({ email: 'not-an-email' }, { ip });
    await handler(req, res);
    last = res;
  }
  assert.equal(last.statusCode, 429);
});
