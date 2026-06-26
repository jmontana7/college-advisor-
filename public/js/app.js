// ============================================================================
//  Covenant — App controller
// ----------------------------------------------------------------------------
//  Owns the shared state (profile + currentStepId + conversation log),
//  drives navigation between steps, and talks to /api/chat.js.
//
//  State persists in sessionStorage only (no accounts, no login — per the
//  COPPA/FERPA decision in the project brief). Clearing the tab clears it.
// ============================================================================

(function () {
  const STORAGE_KEY = 'covenant_session_v1';

  const state = {
    currentStepId: 'student_type',
    history: [], // stack of previous step ids, for Back
    profile: {}, // flat profile object built across the whole intake
    stepAnswers: {}, // raw per-step UI state, so Back restores what was typed/selected
    conversation: [], // {role, content} pairs sent to /api/chat for intake JSON mode
    turnCount: 0,
  };

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch { /* ignore corrupt storage */ }
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full or unavailable — fail silently, not fatal */ }
  }

  Engine.init(state);

  // ── Networking ──
  async function callChatApi(payload) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok && !data) throw new Error('Network error');
    return data;
  }

  // ── Step lookup helpers ──
  function getStep(id) { return STEPS[id]; }

  function goTo(stepId, { pushHistory = true } = {}) {
    if (pushHistory && state.currentStepId) state.history.push(state.currentStepId);
    state.currentStepId = stepId;
    saveState();
    render();
  }

  function goBack() {
    const prev = state.history.pop();
    if (prev) {
      state.currentStepId = prev;
      saveState();
      render();
    }
  }

  // ── Apply extracted/structured data into the flat profile ──
  function applyToProfile(step, payload) {
    const key = step.profileKey;
    if (!key) return;

    if (step.field === 'options') {
      if (payload.value) state.profile[key] = payload.value;
    } else if (step.field === 'slider') {
      state.profile[key] = payload.structured ? payload.structured.value : payload.value;
    } else if (step.field === 'dual-slider' || step.field === 'score-card' || step.field === 'dropdown') {
      state.profile[key] = payload.structured;
    } else if (step.field === 'card-stack') {
      state.profile[key] = payload.structured;
    } else if (step.field === 'freeform-only') {
      state.profile[key] = payload.freeformText;
    }

    // Freeform text is ALWAYS preserved for holistic context, even on steps
    // that also have a structured answer — nothing the student wrote is lost.
    if (payload.freeformText) {
      state.profile._raw_notes = state.profile._raw_notes || [];
      state.profile._raw_notes.push({ step: step.id, text: payload.freeformText });
    }
  }

  function nextStepId(step, payload) {
    if (step.branch) {
      return step.branch[payload.value] || step.next;
    }
    return step.next;
  }

  // ── Free-text interpretation via backend (JSON mode) ──
  async function interpretFreeform(step, freeformText) {
    if (!freeformText) return null;

    state.turnCount++;
    state.conversation.push({ role: 'user', content: freeformText });

    try {
      const data = await callChatApi({
        mode: 'intake',
        messages: state.conversation,
        currentStep: step.id,
        profile: state.profile,
      });

      if (data.limitReached) {
        return { limitReached: true, reply: data.reply };
      }

      state.conversation.push({ role: 'assistant', content: JSON.stringify(data) });
      saveState();
      return data;
    } catch (err) {
      console.error('interpretFreeform failed', err);
      return null;
    }
  }

  // ── Rendering ──
  function render() {
    const stepId = state.currentStepId;

    if (stepId === 'thinking') {
      Engine.renderThinking();
      setTimeout(runResults, 1400);
      return;
    }

    if (stepId === 'results') {
      renderResultsScreen();
      return;
    }

    if (stepId === 'limit_reached') {
      Engine.renderLimitReached(state.limitMessage);
      return;
    }

    const step = getStep(stepId);
    if (!step) {
      console.error('Unknown step', stepId);
      return;
    }

    if (stepId === 'student_type') {
      // Renders as the home screen's "Find your path" already routes here;
      // this is the actual selector screen.
      Engine.renderQuestion(step, state.stepAnswers[stepId], {
        canGoBack: false,
        onContinue: (payload) => handleContinue(step, payload),
      });
      return;
    }

    Engine.renderQuestion(step, state.stepAnswers[stepId], {
      canGoBack: state.history.length > 0,
      onBack: goBack,
      onSkip: () => handleContinue(step, { value: null, structured: null, freeformText: '' }, true),
      onContinue: (payload) => handleContinue(step, payload),
      onInfoRequest: (optionValue) => handleInfoRequest(step, optionValue),
    });
  }

  async function handleInfoRequest(step, optionValue) {
    // e.g. "What is IGETC?" — informational, doesn't extract data or advance.
    const infoCopy = {
      what_is_igetc:
        'IGETC (Intersegmental General Education Transfer Curriculum) is a set of courses CA community college students can complete to satisfy lower-division general education requirements at most UCs and CSUs. Check assist.org for your college\u2019s specific IGETC course list.',
    };
    alert(infoCopy[optionValue] || 'More info coming soon.');
  }

  async function handleContinue(step, payload, isSkip = false) {
    state.stepAnswers[step.id] = payload;

    if (!isSkip) {
      applyToProfile(step, payload);
    }

    saveState();

    let determinedNext = nextStepId(step, payload);

    if (!isSkip && payload.freeformText) {
      const result = await interpretFreeform(step, payload.freeformText);
      if (result) {
        if (result.limitReached) {
          state.limitMessage = result.reply;
          goTo('limit_reached');
          return;
        }
        if (result.extracted_data && Object.keys(result.extracted_data).length) {
          Object.assign(state.profile, result.extracted_data);
        }
        if (result.next_step && STEPS[result.next_step]) {
          determinedNext = result.next_step;
        }
      }
    }

    saveState();
    goTo(determinedNext);
  }

  async function renderResultsScreen() {
    if (state.resultsText) {
      mountResults(state.resultsText);
      return;
    }
    Engine.renderThinking();
    try {
      const data = await callChatApi({
        mode: 'results',
        messages: [{ role: 'user', content: JSON.stringify(state.profile) }],
      });
      state.resultsText = data.reply || "We couldn't generate your results right now. Please try again.";
      saveState();
      mountResults(state.resultsText);
    } catch (err) {
      console.error(err);
      state.resultsText = "We couldn't generate your results right now. Please try again in a moment.";
      mountResults(state.resultsText);
    }
  }

  function mountResults(text) {
    Engine.renderResults(text, async (followupText, onReply) => {
      state.turnCount++;
      const followupMessages = [
        { role: 'user', content: JSON.stringify(state.profile) },
        { role: 'assistant', content: state.resultsText },
        { role: 'user', content: followupText },
      ];
      try {
        const data = await callChatApi({ mode: 'results', messages: followupMessages });
        if (data.limitReached) {
          onReply(data.reply);
          return;
        }
        onReply(data.reply || "I'm not sure how to answer that right now.");
      } catch {
        onReply('Something went wrong reaching Covenant. Please try again.');
      }
    });
  }

  async function runResults() {
    goTo('results');
  }

  // ── Boot ──
  function boot() {
    loadState();

    if (state.currentStepId === 'student_type' && state.history.length === 0 && !state.profile.student_type) {
      Engine.renderHome(() => goTo('student_type'));
      document.getElementById('header-cta').onclick = () => goTo('student_type');
      return;
    }

    render();
  }

  document.getElementById('header-cta').addEventListener('click', () => goTo('student_type'));
  document.getElementById('tools-btn').addEventListener('click', () => {
    alert('Essay Validator and AI Major Quiz — coming soon!');
  });

  boot();
})();
