// ============================================================================
//  Obee -- Backend proxy for the Claude API  (/api/chat.js)
// ----------------------------------------------------------------------------
//  Serverless function on Vercel. Receives intake messages from the
//  frontend, applies spend/safety limits, and asks Claude for a
//  STRUCTURED JSON response so the frontend can:
//   1) extract profile data from free-text chat
//   2) decide whether to jump to another intake step
//   3) render a rich results UI (schools/top-pick/gaps/next-steps) instead
//      of a wall of prose, or ask a clarifying question when unsure
//
//  The student NEVER sees the API key. The browser only talks to your domain.
// ============================================================================

const CONFIG = {
  MODEL: 'claude-sonnet-4-6',
  MAX_TOKENS: 1600,
  MAX_MESSAGES_PER_CONVERSATION: 20,
  MAX_INPUT_CHARS: 4000,
  RATE_LIMIT_REQUESTS: 30,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
};

// --------------------------------------------------------------------------
//  Step ids -- must match public/js/steps.js exactly.
// --------------------------------------------------------------------------
const HS_STEPS = [
  'hs_grade', 'hs_gpa', 'hs_courses', 'hs_extracurriculars', 'hs_major',
  'hs_college_type', 'hs_state', 'hs_out_of_state', 'hs_first_gen', 'hs_test_scores',
];

const CC_STEPS = [
  'cc_college_name', 'cc_gpa', 'cc_units', 'cc_major', 'cc_courses',
  'cc_ap_ib', 'cc_igetc', 'cc_extracurriculars', 'cc_transfer_timeline',
  'cc_specific_schools', 'cc_out_of_state', 'cc_first_gen', 'cc_test_scores',
];

const ALL_STEPS = ['student_type', ...HS_STEPS, ...CC_STEPS];

// --------------------------------------------------------------------------
//  INTAKE system prompt -- extracts data + decides step jumps.
// --------------------------------------------------------------------------
function buildIntakeSystemPrompt() {
  return `You are the conversational engine of Obee, a warm and honest college advisor for US students. Your job right now is NOT to give the final recommendation -- it's to help fill in the student's profile during a Duolingo-style intake (card-by-card questions), interpreting what they write in a free-text field called "Anything else you'd like to share?".

CONTEXT YOU RECEIVE EACH TURN:
- "current_step": the intake step the student is currently on.
- "profile": data already collected from the student so far (may be empty).
- The student's latest message: what they wrote in that step's free-text field.

YOUR JOB:
1. Read the student's free text.
2. Extract any profile data present (GPA, courses, extracurriculars, state, major, etc.), even if it doesn't map exactly to the current step -- students sometimes volunteer info about future steps.
3. Decide if the student's message naturally already answers a FUTURE step that hasn't been shown yet. If so, set next_step to jump there.
4. If the text adds nothing new or is just conversation (greetings, questions), do not fabricate extracted data -- leave extracted_data empty.
5. Write a very short (1 sentence, max 2) warm conversational reply in the SAME language the student wrote in (English or Spanish). Confirm what you understood without sounding robotic.

VALID STEP IDS FOR next_step (use the exact id, or null if no jump applies):
${ALL_STEPS.map((s) => `- ${s}`).join('\n')}

RULES:
- NEVER invent data the student didn't mention.
- If something is ambiguous (e.g. "I have good grades" with no number), do NOT put it as a numeric GPA -- leave that field empty. Your reply can gently ask for a number without blocking the flow.
- If the student asks an informational question (e.g. "what is IGETC?"), answer it briefly in "reply" and do not extract data or jump steps.
- Respond ONLY with a single valid JSON object, no text before or after, no markdown fences. Exact shape:

{
  "reply": "string -- short message to show in the chat",
  "extracted_data": { "field": "value" },
  "next_step": "string step id or null",
  "needs_clarification": false
}

No extra fields. No reasoning outside the JSON.`;
}

// --------------------------------------------------------------------------
//  RESULTS system prompt -- always English, always structured JSON, asks
//  clarifying questions instead of guessing, and keeps the anti-hallucination
//  rule (the single most important principle in this whole product) intact.
// --------------------------------------------------------------------------
function buildResultsSystemPrompt() {
  return `You are Obee, a warm and honest college advisor helping US students (high schoolers applying as freshmen, and community college students transferring to a 4-year university) find the right path.

LANGUAGE: Always respond in English in this phase, no matter what language the student used during the intake. This is a firm rule with no exceptions.

You will receive the student's full profile as JSON in the first user message. Later messages may be follow-up questions -- you will also see your own prior JSON responses in the conversation history.

ANTI-HALLUCINATION RULE (the most important principle in this product):
Every factual claim falls into one of three buckets:
1. VERIFIED -- backed by well-documented facts (e.g. California's ASSIST/TAG/IGETC system) -- state it with confidence.
2. GENERAL -- broadly true but needs the student to verify -- state it, and say so.
3. UNKNOWN -- you don't confidently know it -- say so plainly and point to the right source instead of guessing.
NEVER invent specific course equivalencies, GPA cutoffs, or deadlines for schools outside California's ASSIST system. Admitting uncertainty builds trust; a confident wrong answer destroys it. A student in Ohio deserves the same honesty as one in California.

NATIONAL COVERAGE: California has ASSIST.org, TAG, UC Transfer Pathways, and IGETC -- you can speak with real confidence there, and cite ASSIST.org specifically for California students. For the other 49 states, do NOT invent specific numbers -- instead point the student to Transferology.com and their target school's own official transfer/articulation office. Never tell a student outside California to "check ASSIST.org" -- that system doesn't cover them, and saying so would itself be a confident wrong answer.

WHEN UNCERTAIN, ASK -- NEVER GUESS:
If the student's profile is missing something you genuinely need for sound advice (no target major, no state, no GPA, contradictory info, etc.), do not paper over the gap with a generic answer. Set "mode":"clarify", ask ONE focused, warm question in "message", and leave schools/top_pick/gaps/next_steps empty. This applies on the very first results call just as much as on a follow-up -- a good clarifying question is more useful to the student than a shaky guess.

TIER SYSTEM (use consistently):
- safety: strong likelihood, GPA/scores well above typical admits
- match: within the typical admit range
- reach: below typical admits, or a very competitive program
- tag: student meets an explicit transfer guarantee (e.g. California TAG)

OUTPUT FORMAT -- respond ONLY with a single JSON object. No markdown fences, no text outside the JSON:
{
  "mode": "recommendation" | "clarify" | "answer",
  "message": "string, always present -- the clarifying question (mode=clarify), a conversational reply (mode=answer, can be 2-4 sentences), or a brief 1-sentence warm intro (mode=recommendation)",
  "summary": "string or null -- 1-2 sentence overview of the student's positioning, only for mode=recommendation",
  "schools": [ { "name": "string", "program": "string", "tier": "safety|match|reach|tag", "note": "short 1-2 sentence fit note" } ],
  "top_pick": { "name": "string", "reasoning": "string" } or null,
  "gaps": ["short phrase naming a missing course or requirement, if any"],
  "next_steps": ["short, concrete, actionable next step"]
}

Use mode="recommendation" once you have enough to responsibly build a list. Use mode="clarify" when you need more first. Use mode="answer" for a simple follow-up that doesn't require rebuilding the whole list (e.g. "what about Berkeley?") -- in that case keep schools/gaps/next_steps as empty arrays and top_pick as null, and put your full answer in "message".

Every next_steps item should be concrete and specific (e.g. "Verify the ECON 5 equivalency for Business majors on CCSF's official ASSIST.org page" rather than a vague "check requirements"). Weave a reminder to verify with the target school's official transfer office (and ASSIST.org specifically if California) and a counselor into next_steps itself -- the interface already shows a general disclaimer, so don't repeat it as a separate sentence.`;
}

// --------------------------------------------------------------------------
//  In-memory rate limiter (good enough for MVP traffic).
// --------------------------------------------------------------------------
const ipHits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip) || { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + CONFIG.RATE_LIMIT_WINDOW_MS;
  }
  entry.count++;
  ipHits.set(ip, entry);
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k);
  }
  return entry.count > CONFIG.RATE_LIMIT_REQUESTS;
}

function safeParseModelJSON(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
//  MAIN HANDLER
// --------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

  if (rateLimited(ip)) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Too many requests. Please wait a moment and try again.',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages, mode, currentStep, profile } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const userTurns = messages.filter((m) => m.role === 'user').length;
  if (userTurns > CONFIG.MAX_MESSAGES_PER_CONVERSATION) {
    return res.status(200).json({
      limitReached: true,
      reply:
        "We've reached this session's message limit. Save what you have and continue with your counselor, " +
        'or start a new session. Remember to verify everything with your target school and a counselor.',
    });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser && typeof lastUser.content === 'string' && lastUser.content.length > CONFIG.MAX_INPUT_CHARS) {
    return res.status(400).json({
      error: 'input_too_long',
      message: `Your message is too long (max ${CONFIG.MAX_INPUT_CHARS} characters).`,
    });
  }

  const isResultsPhase = mode === 'results';

  let outgoingMessages = messages;
  if (!isResultsPhase) {
    const contextHeader = JSON.stringify({ current_step: currentStep || null, profile: profile || {} });
    outgoingMessages = messages.map((m, idx) =>
      idx === messages.length - 1 && m.role === 'user'
        ? { ...m, content: `[CONTEXT]${contextHeader}[/CONTEXT]\n\n${m.content}` }
        : m
    );
  }

  const systemPrompt = isResultsPhase ? buildResultsSystemPrompt() : buildIntakeSystemPrompt();

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        system: systemPrompt,
        messages: outgoingMessages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Anthropic API error:', anthropicRes.status, data);
      const errType = (data && data.error && data.error.type) || '';
      const errMsg = (data && data.error && data.error.message) || '';
      const looksLikeCredit =
        anthropicRes.status === 402 || /credit|billing|quota|insufficient|balance/i.test(errType + ' ' + errMsg);

      if (looksLikeCredit) {
        return res.status(200).json({
          limitReached: true,
          reply:
            "Obee has reached its usage limit for now \uD83D\uDE4F We're working on expanding it. " +
            'Please save what you have and check back soon -- thank you for your patience.',
        });
      }

      return res.status(502).json({
        error: 'upstream_error',
        message: 'There was a problem generating a response. Please try again in a moment.',
      });
    }

    const rawText = (data.content || []).map((c) => c.text || '').join('');

    if (isResultsPhase) {
      const parsed = safeParseModelJSON(rawText);
      if (!parsed) {
        return res.status(200).json({
          mode: 'answer',
          message: rawText.slice(0, 500) || "Here's what I found.",
          summary: null, schools: [], top_pick: null, gaps: [], next_steps: [],
          parse_warning: true,
        });
      }
      const allowedModes = ['recommendation', 'clarify', 'answer'];
      return res.status(200).json({
        mode: allowedModes.includes(parsed.mode) ? parsed.mode : 'answer',
        message: parsed.message || '',
        summary: parsed.summary || null,
        schools: Array.isArray(parsed.schools) ? parsed.schools : [],
        top_pick: parsed.top_pick || null,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      });
    }

    const parsed = safeParseModelJSON(rawText);
    if (!parsed) {
      return res.status(200).json({
        reply: rawText.slice(0, 300) || 'Got it, thanks for sharing that.',
        extracted_data: {},
        next_step: null,
        needs_clarification: false,
        parse_warning: true,
      });
    }

    return res.status(200).json({
      reply: parsed.reply || '',
      extracted_data: parsed.extracted_data || {},
      next_step: ALL_STEPS.includes(parsed.next_step) ? parsed.next_step : null,
      needs_clarification: Boolean(parsed.needs_clarification),
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Internal error. Please try again.',
    });
  }
}

// ============================================================================
//  NOTE: the in-memory rate limiter isn't consistent across serverless
//  instances. Fine for MVP traffic; migrate to Upstash Redis if traffic grows.
// ============================================================================
