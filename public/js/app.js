// ============================================================================
//  Obee -- App controller
// ----------------------------------------------------------------------------
//  Owns the shared state (profile + currentStepId + conversation log),
//  drives navigation between steps, and talks to /api/chat.js.
//
//  State persists in sessionStorage only (no accounts, no login).
// ============================================================================

(function () {
  const STORAGE_KEY = 'obee_session_v1';

  const state = {
    currentStepId: 'home',
    history: [],
    profile: {},
    stepAnswers: {},
    conversation: [],
    turnCount: 0,
  };

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        Object.assign(state, JSON.parse(raw));
        return true;
      }
    } catch {
      /* ignore corrupt storage */
    }
    return false;
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable -- not fatal */
    }
  }

  Engine.init(state);

  // ---- Networking ----
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

  function getStep(id) {
    return STEPS[id];
  }

  function goTo(stepId, { pushHistory = true } = {}) {
    if (pushHistory && state.currentStepId && state.currentStepId !== 'home') {
      state.history.push(state.currentStepId);
    }
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
    } else {
      goHome();
    }
  }

  function goHome() {
    state.currentStepId = 'home';
    state.history = [];
    saveState();
    render();
  }

  // ---- Apply extracted/structured data into the flat profile ----
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

  // ---- Free-text interpretation via backend (JSON mode) ----
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

  // ---- Rendering ----
  function render() {
    const stepId = state.currentStepId;

    if (stepId === 'home') {
      Engine.renderHome(() => goTo('student_type'));
      return;
    }

    if (stepId === 'thinking') {
      Engine.renderThinking();
      setTimeout(() => goTo('results'), 1400);
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
      Engine.renderQuestion(step, state.stepAnswers[stepId], {
        canGoBack: true,
        onBack: goHome,
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

  function handleInfoRequest(step, optionValue) {
    const infoCopy = {
      what_is_igetc:
        'IGETC (Intersegmental General Education Transfer Curriculum) is a set of courses CA community college students can complete to satisfy lower-division general education requirements at most UCs and CSUs. Check ASSIST.org for your college\u2019s specific IGETC course list.',
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
    if (state.resultsData) {
      mountResults(state.resultsData);
      return;
    }
    Engine.renderThinking();
    try {
      const data = await callChatApi({
        mode: 'results',
        resultsPhase: 'initial',
        messages: [{ role: 'user', content: JSON.stringify(state.profile) }],
      });
      if (data.limitReached) {
        state.limitMessage = data.reply;
        goTo('limit_reached');
        return;
      }
      state.resultsData = data;
      saveState();
      mountResults(data);
    } catch (err) {
      console.error(err);
      state.resultsData = {
        mode: 'answer',
        message: "We couldn't generate your results right now. Please try again in a moment.",
        summary: null, schools: [], top_pick: null, gaps: [], next_steps: [],
      };
      mountResults(state.resultsData);
    }
  }

  function mountResults(data) {
    Engine.renderResults(data, async (followupText, onReply) => {
      state.turnCount++;
      const followupMessages = [
        { role: 'user', content: JSON.stringify(state.profile) },
        { role: 'assistant', content: JSON.stringify(state.resultsData) },
        { role: 'user', content: followupText },
      ];
      try {
        const reply = await callChatApi({ mode: 'results', resultsPhase: 'followup', messages: followupMessages });
        if (reply.limitReached) {
          onReply({ mode: 'answer', message: reply.reply });
          return;
        }
        if (reply.mode === 'recommendation') {
          state.resultsData = reply;
          saveState();
        }
        onReply(reply);
      } catch {
        onReply({ mode: 'answer', message: 'Something went wrong reaching Obee. Please try again.' });
      }
    });
  }

  // ---- Boot ----
  function boot() {
    const hadStoredState = loadState();
    if (!hadStoredState) {
      state.currentStepId = 'home';
    }
    render();
  }

  const logoBtn = document.getElementById('logo-home-btn');
  if (logoBtn) logoBtn.addEventListener('click', goHome);

  document.getElementById('header-cta').addEventListener('click', () => goTo('student_type'));

  boot();
})();
