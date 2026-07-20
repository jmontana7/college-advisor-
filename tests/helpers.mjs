// ============================================================================
//  Obee -- Shared test helpers
// ----------------------------------------------------------------------------
//  Minimal mock of Vercel's (req, res) shape -- just enough to drive the
//  handlers' validation branches without a real HTTP server. Every test in
//  this suite exercises paths that return BEFORE any network call to
//  Anthropic/Resend, so no real API keys are needed to run these.
// ============================================================================

export function mockReqRes(body, { method = 'POST', ip = '203.0.113.1' } = {}) {
  const req = {
    method,
    headers: { 'x-forwarded-for': ip },
    body,
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}
