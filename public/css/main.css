/* ============================================================
   Covenant — Design tokens (from Figma)
   ============================================================ */
:root {
  --gold-start: #fecf85;
  --cream: #fdf6ec;
  --lavender-end: rgba(133, 165, 254, 0.4);
  --lavender-solid: #85a5fe;
  --accent: #a8bdf9;
  --accent-soft: rgba(255, 255, 255, 0.8);
  --ink: #000000;
  --ink-soft: rgba(0, 0, 0, 0.6);
  --gold-grad-start: #ffb636;
  --gold-grad-end: #996d20;
  --max-width: 1440px;
  --radius-pill: 60px;
  --radius-card: 30px;
  --radius-box: 10px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  min-height: 100%;
  font-family: 'Poppins', sans-serif;
  color: var(--ink);
}

body {
  background: linear-gradient(180deg,
    var(--cream) 0%,
    var(--gold-start) 0.4%,
    var(--cream) 22%,
    var(--lavender-end) 100%);
  background-attachment: fixed;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

button { font-family: inherit; cursor: pointer; }
textarea { font-family: inherit; }

/* ============================================================
   HEADER
   ============================================================ */
#app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: var(--max-width);
  width: calc(100% - 80px);
  margin: 26px auto 0;
  background: #fff;
  border-radius: var(--radius-pill);
  padding: 16px 32px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}

.logo-mark { font-size: 28px; }

.tools-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #000;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cta-pill {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-pill);
  padding: 14px 28px;
  font-size: 17px;
  font-weight: 400;
  color: #000;
  transition: transform 0.15s, filter 0.15s;
}
.cta-pill:hover { filter: brightness(1.05); transform: translateY(-1px); }

.cta-pill--lg { padding: 18px 36px; font-size: 18px; margin-top: 24px; }

/* ============================================================
   APP ROOT / SCREEN LAYOUT
   ============================================================ */
#app-root {
  flex: 1;
  display: flex;
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
}

.screen {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px 40px;
  animation: fadeUp 0.35s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   HOME SCREEN
   ============================================================ */
.home-screen { text-align: center; max-width: 860px; margin: 60px auto; padding-top: 40px; }

.eyebrow {
  font-size: 13px;
  letter-spacing: 0.5px;
  color: var(--ink-soft);
  margin-bottom: 16px;
}

h1 {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 600;
  line-height: 1.15;
  margin-bottom: 20px;
}
h1 em { font-style: normal; }

.hero-sub {
  font-size: 20px;
  font-weight: 300;
  max-width: 640px;
  margin: 0 auto 32px;
  line-height: 1.5;
}

.mandela-quote {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 600;
  max-width: 760px;
  margin: 0 auto 28px;
  line-height: 1.4;
}
.mandela-quote cite {
  display: block;
  font-family: 'Montaga', serif;
  font-size: 18px;
  font-weight: 400;
  font-style: normal;
  margin-top: 12px;
  color: var(--ink-soft);
}

/* ============================================================
   QUESTION SCREENS
   ============================================================ */
.question-screen {
  max-width: 920px;
  margin: 0 auto;
  text-align: center;
  flex: 1;
  justify-content: flex-start;
  padding-top: 80px;
}

.question-header { margin-bottom: 36px; }

.question-title {
  font-size: 34px;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 8px;
}

.question-sub {
  font-size: 24px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--ink);
}
.question-sub:empty { display: none; }

.question-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

/* Quick-reply option buttons */
.opt-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.opt-btn {
  background: var(--accent-soft);
  border: none;
  border-radius: var(--radius-card);
  padding: 14px 26px;
  font-size: 18px;
  color: var(--ink-soft);
  transition: all 0.15s;
}
.opt-btn:hover { background: #fff; }
.opt-btn.selected {
  background: var(--accent);
  color: #000;
  font-weight: 500;
}

/* ============================================================
   SLIDER (GPA / Units)
   ============================================================ */
.slider-wrap {
  width: 100%;
  max-width: 600px;
  position: relative;
  margin: 20px 0;
}

.slider-track {
  position: relative;
  height: 64px;
  border-radius: var(--radius-pill);
  background: linear-gradient(to right, #fff 0%, #fff 50%, rgba(227,226,226,0.8) 50%, rgba(227,226,226,0.8) 100%);
  display: flex;
  align-items: center;
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 64px;
  background: transparent;
  position: absolute;
  top: 0; left: 0;
  margin: 0;
  cursor: pointer;
  z-index: 2;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--gold-grad-start) 18%, var(--gold-grad-end) 93%);
  border: 3px solid #fffefe;
  color: #fff;
  cursor: pointer;
}
.slider-input::-moz-range-thumb {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--gold-grad-start) 18%, var(--gold-grad-end) 93%);
  border: 3px solid #fffefe;
  cursor: pointer;
}

.slider-bubble-start {
  position: absolute;
  left: 0; top: 0;
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: #fff;
  pointer-events: none;
}

.slider-value-display {
  margin-top: 14px;
  font-size: 16px;
  color: var(--ink-soft);
  text-align: center;
}
.slider-value-display strong { font-size: 22px; color: var(--ink); }

/* Dual sliders (e.g. CC GPA cumulative + transferable) */
.slider-group { width: 100%; display: flex; flex-direction: column; gap: 28px; }
.slider-row-label { font-size: 22px; color: var(--ink-soft); margin-bottom: 8px; text-align: left; }

/* ============================================================
   STACKED CARDS (courses, AP/IB)
   ============================================================ */
.card-stack {
  position: relative;
  width: 314px;
  min-height: 280px;
  margin: 10px auto 24px;
}

.entry-card {
  position: absolute;
  top: 0; left: 0;
  width: 314px;
  background: #fff;
  border-radius: var(--radius-box);
  box-shadow: 0 4px 4px rgba(0,0,0,0.25);
  padding: 24px;
  text-align: left;
}

.entry-card label {
  display: block;
  font-size: 16px;
  color: var(--ink-soft);
  margin-bottom: 6px;
  margin-top: 14px;
}
.entry-card label:first-child { margin-top: 0; }

.entry-card input {
  width: 100%;
  border: 1.5px solid #000;
  border-radius: var(--radius-pill);
  padding: 10px 16px;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink-soft);
  outline: none;
}
.entry-card input::placeholder { opacity: 0.6; }

.add-entry-btn {
  position: absolute;
  bottom: 14px;
  right: 18px;
  background: none;
  border: none;
  font-size: 22px;
  color: var(--ink-soft);
}

.entries-list {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.entry-pill {
  background: rgba(255,255,255,0.6);
  border-radius: var(--radius-card);
  padding: 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}
.entry-pill .remove-entry {
  background: none; border: none; color: var(--ink-soft); font-size: 16px; padding-left: 10px;
}

/* ============================================================
   DROPDOWN (state select)
   ============================================================ */
.dropdown-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.8);
  border-radius: var(--radius-card);
  padding: 12px 24px;
  font-size: 18px;
  color: var(--ink-soft);
  flex-wrap: wrap;
  justify-content: center;
}
.dropdown-row select {
  border: 1.5px solid #000;
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-family: inherit;
  font-size: 16px;
  color: var(--ink-soft);
  background: #fffefe;
  outline: none;
}
.dropdown-row input[type="text"] {
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 18px;
  color: var(--ink-soft);
  min-width: 180px;
}

/* ============================================================
   FREEFORM TEXT DOCK
   ============================================================ */
.freeform-dock { width: 100%; max-width: 760px; margin-top: auto; }

.freeform-box {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: rgba(255,255,255,0.8);
  border-radius: var(--radius-pill);
  padding: 14px 24px;
}

.freeform-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  font-size: 18px;
  color: var(--ink-soft);
  max-height: 120px;
  line-height: 1.4;
}
.freeform-input::placeholder { color: var(--ink-soft); opacity: 0.85; }

.mic-btn { background: none; border: none; font-size: 22px; }

/* ============================================================
   NAV ROW (Back / Skip / Continue)
   ============================================================ */
.nav-row {
  width: 100%;
  max-width: 760px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--ink-soft);
}

.skip-link {
  background: none;
  border: none;
  font-size: 15px;
  color: var(--ink-soft);
  text-decoration: underline;
}

.continue-btn {
  background: #000;
  color: #fff;
  border: none;
  border-radius: var(--radius-pill);
  padding: 14px 30px;
  font-size: 17px;
  transition: opacity 0.15s;
}
.continue-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ============================================================
   THINKING SCREEN
   ============================================================ */
.thinking-screen {
  align-items: center;
  justify-content: center;
  text-align: center;
  margin: auto;
}
.thinking-ring {
  width: 220px; height: 220px;
  border-radius: 50%;
  border: 10px solid rgba(36,81,253,0.12);
  border-top-color: rgba(36,81,253,0.7);
  border-right-color: rgba(36,81,253,0.7);
  animation: spin 1s linear infinite;
  margin-bottom: 28px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.thinking-label {
  font-size: 28px;
  font-weight: 600;
  color: rgba(36,81,253,0.7);
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */
.results-screen { max-width: 880px; margin: 0 auto; text-align: left; align-items: stretch; }
.results-header { text-align: left; margin-bottom: 8px; }
.results-header h2 { font-size: 28px; margin-bottom: 16px; }

.results-body {
  background: rgba(255,255,255,0.7);
  border-radius: 16px;
  padding: 28px;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.results-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
.results-body th, .results-body td { padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.08); }
.results-body th { font-weight: 600; }

.results-disclaimer {
  font-size: 13px;
  color: var(--ink-soft);
  text-align: center;
  margin: 16px 0;
  padding: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
}

.results-chat-dock { margin-top: 8px; }
.results-chat-messages { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; max-height: 320px; overflow-y: auto; }
.chat-msg { padding: 10px 16px; border-radius: 16px; font-size: 15px; max-width: 80%; }
.chat-msg.user { align-self: flex-end; background: #000; color: #fff; }
.chat-msg.ai { align-self: flex-start; background: rgba(255,255,255,0.85); }

.send-btn { background: var(--accent); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 16px; }

/* ============================================================
   LIMIT REACHED SCREEN
   ============================================================ */
.limit-screen { align-items: center; justify-content: center; text-align: center; margin: auto; max-width: 480px; }
.limit-icon { font-size: 48px; margin-bottom: 16px; }
.limit-screen h2 { font-size: 26px; margin-bottom: 12px; }
.limit-message { font-size: 16px; color: var(--ink-soft); line-height: 1.6; }

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 720px) {
  #app-header { width: calc(100% - 32px); padding: 12px 18px; }
  .cta-pill { padding: 10px 18px; font-size: 14px; }
  .screen { padding: 32px 20px 24px; }
  .question-title { font-size: 26px; }
  .question-sub { font-size: 18px; }
  h1 { font-size: 30px; }
  .hero-sub { font-size: 16px; }
  .mandela-quote { font-size: 18px; }
  .card-stack, .entry-card { width: 100%; max-width: 314px; }
  .nav-row { flex-wrap: wrap; }
}
