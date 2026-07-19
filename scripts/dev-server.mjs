// ============================================================================
//  Obee -- Local dev server (no Anthropic/Resend calls, no token spend)
// ----------------------------------------------------------------------------
//  Serves public/ as static files and stubs out /api/chat and
//  /api/send-results with canned responses, so you can click through the
//  whole app (or jump straight to results, see below) while iterating on
//  design/CSS without burning real API tokens.
//
//  Run:  node scripts/dev-server.mjs
//  Then open the URL it prints. It also prints a second URL that jumps
//  straight into the results screen with a realistic sample list, no
//  intake needed, via the same ?r= share-link mechanism the real "Copy
//  link" button uses (see decodeShareData in public/js/engine.js) --
//  that path never touches the network at all.
//
//  To change what the results screen looks like, edit SAMPLE_RESULTS
//  below and restart the server for a fresh preview link.
// ============================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'public');
const PORT = 5500;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.json': 'application/json',
};

// ----------------------------------------------------------------------------
// Sample recommendation -- edit freely. Shape matches what api/chat.js
// returns for mode:"results" (see buildResultsSystemPrompt's OUTPUT FORMAT).
// ----------------------------------------------------------------------------
const SAMPLE_RESULTS = {
  mode: 'recommendation',
  message: "Here's a list built around your strengths, a strong GPA and a clear direction in UI/UX go a long way.",
  summary: "You're a first-gen CCSF transfer with a 3.5 GPA, completed IGETC, 114 units, and a Google internship on your resume. That combination puts you in a strong position for competitive design programs.",
  schools: [
    { name: 'San Francisco State University', program: 'Design + Industry', tier: 'safety', note: 'Well within typical transfer GPA ranges, strong SF design network.', basis: 'general', source: 'general admission trends' },
    { name: 'San Jose State University', program: 'Design (Interaction Design concentration)', tier: 'match', note: 'Solid fit for your GPA, close to Silicon Valley internship pipelines.', basis: 'general', source: 'general admission trends' },
    { name: 'UC Santa Cruz', program: 'Computer Science: Human-Computer Interaction', tier: 'match', note: 'Meets published UC transfer GPA expectations for your major.', basis: 'verified', source: 'ASSIST.org' },
    { name: 'UC San Diego', program: 'Interdisciplinary Computing and the Arts', tier: 'reach', note: 'Competitive impacted program, your profile is workable but not guaranteed.', basis: 'verified', source: 'ASSIST.org' },
    { name: 'UC Berkeley', program: 'Cognitive Science (HCI track)', tier: 'reach', note: 'Highly competitive transfer admit, a strong personal statement matters a lot here.', basis: 'verified', source: 'ASSIST.org' },
    { name: 'San Francisco State University', program: 'Design + Industry (TAG)', tier: 'tag', note: "You meet the transfer guarantee, this is close to a lock if you keep your GPA steady.", basis: 'verified', source: 'ASSIST.org / TAG' },
  ],
  top_pick: { name: 'San Jose State University', reasoning: 'Strong program fit, realistic admit odds, and close to the internship market you already have a foot in.' },
  gaps: ['No portfolio review process confirmed yet for design-track applicants.'],
  next_steps: [
    'Verify the Design + Industry TAG agreement details on ASSIST.org for your specific catalog year.',
    'Ask your counselor about portfolio requirements for SJSU and UCSC before you finalize your list.',
  ],
};

const SAMPLE_PROFILE = {
  student_type: 'community_college', cc_college_name: 'City College of San Francisco',
  gpa: 3.5, units: 114, major: 'UI/UX Design', first_gen: 'yes',
};

function encodeShareData(data) {
  return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
}

http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/api/chat' || req.url === '/api/send-results')) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (req.url === '/api/send-results') {
        console.log(`[stub] would have emailed results to: ${parsed.email}`);
        res.end(JSON.stringify({ sent: false }));
        return;
      }

      if (parsed.mode === 'transcript') {
        res.end(JSON.stringify({ readable: true, courses: [{ name: 'English 11', grade: 'A-', units: '5' }] }));
        return;
      }
      if (parsed.mode === 'results') {
        res.end(JSON.stringify(SAMPLE_RESULTS));
        return;
      }
      // mode: 'intake' -- keep the flow moving without extracting anything.
      res.end(JSON.stringify({ reply: 'Got it, thanks!', extracted_data: {}, next_step: null, needs_clarification: false, blocked: false }));
    });
    return;
  }

  let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (req.url === '/' || req.url.startsWith('/?')) filePath = path.join(ROOT, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  const base = `http://localhost:${PORT}`;
  const resultsUrl = `${base}/?r=${encodeShareData(SAMPLE_RESULTS)}`;
  console.log(`\nObee dev server running (no API calls, no tokens spent):`);
  console.log(`  Full app:            ${base}`);
  console.log(`  Straight to results: ${resultsUrl}\n`);
  console.log('Edit SAMPLE_RESULTS in scripts/dev-server.mjs and restart to change the preview data.\n');
});
