# Obee

AI-powered college advisor for high school and community college students.
*Find Your Path* — the intake-to-recommendation flow — is the first tool live.

## Structure

```
covenant/
├── api/
│   └── chat.js          # Serverless proxy to the Anthropic API (key never reaches the browser)
├── public/
│   ├── index.html        # Single-page app shell + screen templates
│   ├── css/main.css      # All styling (matches the Figma design system)
│   └── js/
│       ├── steps.js       # Declarative definition of all 23 intake steps
│       ├── engine.js      # Renders each step type (options, slider, card-stack, dropdown, score-card)
│       └── app.js         # State, navigation, and calls to /api/chat
├── vercel.json
├── package.json
└── .env.example
```

## How the intake works

1. Each step in `steps.js` defines a question, its input type, and which
   `profileKey` it writes to.
2. Quick-reply buttons select an answer; the student can *also* add detail in
   the "Anything else you'd like to share?" field before hitting Continue.
3. On Continue, free text (if any) is sent to `/api/chat` in `intake` mode.
   Claude responds with structured JSON: `{ reply, extracted_data, next_step,
   needs_clarification }`. The app merges `extracted_data` into the profile
   and, if `next_step` is set, jumps there — even skipping steps the student
   effectively already answered in free text.
4. After the last step, the full profile is sent to `/api/chat` in `results`
   mode, where the full college-advisor system prompt (anti-hallucination
   rules, ASSIST/TAG knowledge, tier system) generates the recommendation.
5. A capped follow-up chat (shares the same session limit) lets students ask
   more questions about their results.

## Local development

```bash
npm install -g vercel   # if you don't have the Vercel CLI yet
vercel dev               # serves public/ and api/chat.js together, locally
```

Create a `.env.local` (copy `.env.example`) with your own
`ANTHROPIC_API_KEY` for local testing. Never commit this file.

## Deploying

This repo is connected to Vercel for automatic deploys on every push to
`main`. The production API key lives only in Vercel → Project Settings →
Environment Variables — it is never in the codebase.

## Spend & safety controls (in `api/chat.js`)

- 20 user turns max per session
- 4000 character max per message
- 30 requests/minute per IP (in-memory; consider Upstash Redis if traffic grows)
- Graceful "Covenant reached its limit" message when credits run out
- Fixed server-side system prompt — the frontend cannot override it
