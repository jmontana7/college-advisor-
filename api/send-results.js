// ============================================================================
//  Obee -- Email-gate delivery endpoint  (/api/send-results.js)
// ----------------------------------------------------------------------------
//  Called once a student submits their email on the results-unlock modal.
//  Emails them a copy of their list via Resend. If RESEND_API_KEY isn't set
//  yet, it just logs the lead and returns success -- the frontend always
//  unlocks the results regardless of what this endpoint reports, so a
//  missing/failed send never blocks the student.
// ============================================================================

import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const ipHits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count++;
  ipHits.set(ip, entry);
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k);
  }
  return entry.count > RATE_LIMIT_REQUESTS;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(results) {
  const schools = Array.isArray(results && results.schools) ? results.schools : [];
  const schoolsHtml = schools
    .map((s) => {
      const name = escapeHtml(s.name || '');
      const tier = escapeHtml(s.tier || '');
      const note = s.note ? `: ${escapeHtml(s.note)}` : '';
      return `<li><strong>${name}</strong> (${tier})${note}</li>`;
    })
    .join('');

  const summary = results && results.summary ? `<p>${escapeHtml(results.summary)}</p>` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2b2b2b;">
      <h2>Your Obee college list</h2>
      ${summary}
      <ul>${schoolsHtml}</ul>
      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        Always verify with your target school's official site and talk to your counselor before making final decisions.
      </p>
    </div>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { email, results } = body || {};
  if (typeof email !== 'string' || email.length > 200 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.log('Lead captured (RESEND_API_KEY not set):', email);
    return res.status(200).json({ sent: false });
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Obee <onboarding@resend.dev>',
      to: email,
      subject: 'Your personalized college list from Obee',
      html: buildEmailHtml(results),
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(200).json({ sent: false });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('send-results error:', err);
    return res.status(200).json({ sent: false });
  }
}
