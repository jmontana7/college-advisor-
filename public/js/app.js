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
  // Free product, real API cost per message -- caps total exchanges in the
  // results screen (the initial fetch counts as #1, every follow-up after
  // adds one more) so nobody can chat unboundedly. Counted via
  // state.turnCount, which already persists across reloads.
  const RESULTS_CHAT_LIMIT = 15;

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

  async function uploadTranscript(fileData, mediaType) {
    return callChatApi({ mode: 'transcript', fileData, mediaType, lang: Engine.getLang() });
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

  // Wipes every bit of the previous run's data before a fresh intake
  // starts -- otherwise a student who finishes once and clicks "Start"
  // again keeps their old profile/answers/results underneath, which can
  // silently mix HS and CC fields together or carry a stale GPA/major
  // into a new run. A brand new intake should never see leftover state.
  function resetSessionForNewIntake() {
    state.history = [];
    state.profile = {};
    state.stepAnswers = {};
    state.conversation = [];
    state.turnCount = 0;
    state.resultsData = null;
    state.limitMessage = null;
    saveState();
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
        lang: Engine.getLang(),
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
    window.scrollTo(0, 0);
    const stepId = state.currentStepId;

    if (stepId === 'home') {
      Engine.renderHome(() => {
        resetSessionForNewIntake();
        goTo('student_type');
      });
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
        profile: state.profile,
      });
      return;
    }

    Engine.renderQuestion(step, state.stepAnswers[stepId], {
      canGoBack: state.history.length > 0,
      onBack: goBack,
      onSkip: () => handleContinue(step, { value: null, structured: null, freeformText: '' }, true),
      onContinue: (payload) => handleContinue(step, payload),
      onInfoRequest: (optionValue) => handleInfoRequest(step, optionValue),
      onTranscriptUpload: uploadTranscript,
      profile: state.profile,
    });
  }

  function handleInfoRequest(step, optionValue) {
    const infoCopy = {
      what_is_igetc: {
        title: tr('dynamic.igetcTitle', 'What is IGETC?'),
        text: tr(
          'dynamic.igetcText',
          'IGETC (Intersegmental General Education Transfer Curriculum) is a set of courses CA community college students can complete to satisfy lower-division general education requirements at most UCs and CSUs. Check ASSIST.org for your college\u2019s specific IGETC course list.'
        ),
      },
    };
    const info = infoCopy[optionValue] || {
      title: tr('dynamic.moreInfoTitle', 'More info'),
      text: tr('dynamic.moreInfoText', 'More info coming soon.'),
    };
    Engine.renderInfoModal(info.title, info.text);
  }

  async function handleContinue(step, payload, isSkip = false) {
    let interpretResult = null;

    if (!isSkip && payload.freeformText) {
      interpretResult = await interpretFreeform(step, payload.freeformText);
      if (interpretResult && interpretResult.limitReached) {
        state.limitMessage = interpretResult.reply;
        goTo('limit_reached');
        return;
      }
      if (interpretResult && interpretResult.blocked) {
        Engine.renderInfoModal(
          tr('dynamic.keepFriendlyTitle', 'Let’s keep it friendly'),
          interpretResult.reply ||
            tr('dynamic.keepFriendlyText', 'I’m only here to help with your college search — let’s keep things respectful and on-topic so I can help you.')
        );
        return;
      }
    }

    state.stepAnswers[step.id] = payload;

    if (!isSkip) {
      applyToProfile(step, payload);
    }

    saveState();

    let determinedNext = nextStepId(step, payload);

    if (interpretResult) {
      if (interpretResult.extracted_data && Object.keys(interpretResult.extracted_data).length) {
        Object.assign(state.profile, interpretResult.extracted_data);
      }
      if (interpretResult.next_step && STEPS[interpretResult.next_step]) {
        determinedNext = interpretResult.next_step;
      }
    }

    saveState();
    goTo(determinedNext);
  }

  const EMAIL_UNLOCK_KEY = 'obee_unlocked_email';

  // Only used to prefill the gate so a student who already typed their
  // email once this session doesn't have to retype it -- it never skips
  // the gate. The gate is asked for every fresh results screen and every
  // new recommendation on purpose, so every one of those is a captured lead.
  function getRememberedEmail() {
    try {
      return localStorage.getItem(EMAIL_UNLOCK_KEY) || '';
    } catch {
      return '';
    }
  }

  function saveUnlockedEmail(email) {
    try {
      localStorage.setItem(EMAIL_UNLOCK_KEY, email);
    } catch {
      /* not fatal -- gate will just reappear next time */
    }
  }

  async function sendResultsEmail(email, data) {
    try {
      await fetch('/api/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, results: data }),
      });
    } catch (err) {
      console.error('send-results failed', err);
    }
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
        lang: Engine.getLang(),
      });
      if (data.limitReached) {
        state.limitMessage = data.reply;
        goTo('limit_reached');
        return;
      }
      state.resultsData = data;
      state.turnCount = 1;
      saveState();

      // Gate every fresh results screen, whether Claude already has enough
      // for a real list or still needs a clarifying answer first -- a
      // clarifying question is still worth a captured lead, not just the
      // final list. The email itself only actually gets sent once there's
      // a real list to put in it though (mode:"recommendation") -- sending
      // now would just mail out an empty list. If this is still a
      // clarifying question, the email is remembered (for prefill) and
      // gets sent for real once the follow-up gate below fires.
      Engine.renderEmailGateModal(async (email) => {
        saveUnlockedEmail(email);
        if (data.mode === 'recommendation') {
          await sendResultsEmail(email, data);
        }
        mountResults(data);
      }, getRememberedEmail());
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

  function chatLimitMessage() {
    return tr(
      'dynamic.chatLimitReached',
      "You've reached this list's question limit. Feel free to re-read everything above, save it, or start a new session for a fresh list."
    );
  }

  function mountResults(data) {
    Engine.renderResults(data, async (followupText, onReply) => {
      if (state.turnCount >= RESULTS_CHAT_LIMIT) {
        // Shouldn't normally be reachable -- the input gets disabled the
        // moment the limit is hit -- but guards a stray call regardless.
        return;
      }
      state.turnCount++;
      saveState();
      const followupMessages = [
        { role: 'user', content: JSON.stringify(state.profile) },
        { role: 'assistant', content: JSON.stringify(state.resultsData) },
        { role: 'user', content: followupText },
      ];

      function afterReply() {
        if (state.turnCount >= RESULTS_CHAT_LIMIT) Engine.disableFollowupChat(chatLimitMessage());
      }

      try {
        const reply = await callChatApi({ mode: 'results', resultsPhase: 'followup', messages: followupMessages, lang: Engine.getLang() });
        if (reply.limitReached) {
          onReply({ mode: 'answer', message: reply.reply });
          afterReply();
          return;
        }
        if (reply.mode === 'blocked') {
          Engine.renderInfoModal(
            tr('dynamic.keepFriendlyTitle', 'Let’s keep it friendly'),
            reply.message ||
              tr('dynamic.keepFriendlyText', 'I’m only here to help with your college search — let’s keep things respectful and on-topic so I can help you.')
          );
          onReply({ mode: 'blocked', message: null });
          afterReply();
          return;
        }
        if (reply.mode === 'recommendation') {
          state.resultsData = reply;
          saveState();
          // A brand new list is exactly the moment worth gating again --
          // the student went from "not enough info" to an actual result.
          Engine.renderEmailGateModal(async (email) => {
            saveUnlockedEmail(email);
            await sendResultsEmail(email, reply);
            onReply(reply);
            afterReply();
          }, getRememberedEmail());
          return;
        }
        onReply(reply);
        afterReply();
      } catch {
        onReply({ mode: 'answer', message: 'Something went wrong reaching Obee. Please try again.' });
        afterReply();
      }
    }, async (latestData) => {
      // The list can change after follow-up questions -- this lets the
      // student pull the CURRENT version by email on demand, using the
      // address they already gave at the gate instead of asking again.
      const email = getRememberedEmail();
      if (!email) return { ok: false };
      await sendResultsEmail(email, latestData);
      return { ok: true };
    });

    if (state.turnCount >= RESULTS_CHAT_LIMIT) Engine.disableFollowupChat(chatLimitMessage());
  }

  // ---- Boot ----
  function boot() {
    const sharedParam = new URLSearchParams(location.search).get('r');
    if (sharedParam) {
      const shared = Engine.decodeShareData(sharedParam);
      if (shared) {
        state.currentStepId = 'results';
        state.resultsData = shared;
        render();
        return;
      }
    }

    const hadStoredState = loadState();
    if (!hadStoredState) {
      state.currentStepId = 'home';
    }
    render();
  }

  const logoBtn = document.getElementById('logo-home-btn');
  if (logoBtn) logoBtn.addEventListener('click', goHome);

  initLanguageSwitcher();
  boot();

  // ---- Language switcher (header) ----
  function initLanguageSwitcher() {
    const btn = document.getElementById('lang-btn');
    const dropdown = document.getElementById('lang-dropdown');
    if (!btn || !dropdown || typeof LANGUAGES === 'undefined') return;

    function paintOptions() {
      dropdown.innerHTML = '';
      LANGUAGES.forEach((lang) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'lang-option' + (lang.code === getLang() ? ' selected' : '');
        opt.innerHTML = '<span class="lang-flag">' + lang.flag + '</span> ' + lang.label;
        opt.addEventListener('click', () => {
          setLang(lang.code);
          closeDropdown();
          render();
        });
        dropdown.appendChild(opt);
      });
    }

    function openDropdown() {
      paintOptions();
      dropdown.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeDropdown() {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.classList.contains('open')) closeDropdown();
      else openDropdown();
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) closeDropdown();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDropdown();
    });
  }
})();
