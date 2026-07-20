// ============================================================================
//  Smoke tests for api/chat.js -- validation branches only (nothing here
//  calls the real Anthropic API). Run with: node --test
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { mockReqRes } from './helpers.mjs';

process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
const handler = (await import('../api/chat.js')).default;

test('rejects non-POST requests', async () => {
  const { req, res } = mockReqRes(null, { method: 'GET', ip: '203.0.113.10' });
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});

test('500s when ANTHROPIC_API_KEY is missing', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const { req, res } = mockReqRes({ messages: [{ role: 'user', content: 'hi' }] }, { ip: '203.0.113.11' });
  await handler(req, res);
  assert.equal(res.statusCode, 500);
  process.env.ANTHROPIC_API_KEY = saved;
});

test('rejects an unparsable JSON string body', async () => {
  const { req, res } = mockReqRes('{not json', { ip: '203.0.113.12' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
});

test('rejects an empty/non-array messages field', async () => {
  const { req, res } = mockReqRes({ messages: [] }, { ip: '203.0.113.13' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /non-empty array/);
});

test('rejects a malformed message shape', async () => {
  const { req, res } = mockReqRes({ messages: [{ role: 'user' }] }, { ip: '203.0.113.14' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'invalid_message_shape');
});

test('rejects a message over the character cap', async () => {
  const { req, res } = mockReqRes(
    { messages: [{ role: 'user', content: 'x'.repeat(5000) }] },
    { ip: '203.0.113.15' }
  );
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'input_too_long');
});

test('flags limitReached once a conversation exceeds the turn cap', async () => {
  const messages = Array.from({ length: 21 }, (_, i) => ({ role: 'user', content: `turn ${i}` }));
  const { req, res } = mockReqRes({ messages }, { ip: '203.0.113.16' });
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.limitReached, true);
});

test('transcript mode requires fileData', async () => {
  const { req, res } = mockReqRes({ mode: 'transcript', mediaType: 'image/png' }, { ip: '203.0.113.17' });
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /fileData/);
});

test('transcript mode rejects an unsupported media type', async () => {
  const { req, res } = mockReqRes(
    { mode: 'transcript', fileData: 'YWJj', mediaType: 'application/zip' },
    { ip: '203.0.113.18' }
  );
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'unsupported_media_type');
});

test('rate-limits after too many requests from the same IP within a minute', async () => {
  const ip = '203.0.113.19';
  let last;
  for (let i = 0; i < 31; i++) {
    const { req, res } = mockReqRes({ messages: [] }, { ip });
    await handler(req, res);
    last = res;
  }
  assert.equal(last.statusCode, 429);
});
