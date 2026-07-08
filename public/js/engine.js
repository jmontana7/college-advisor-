// ============================================================================
//  Obee -- Rendering engine for the intake flow
// ----------------------------------------------------------------------------
//  Reads STEPS (steps.js) and renders the right screen. Talks to engine
//  state (profile, currentStepId) which app.js owns and persists.
// ============================================================================

const TIER_META = {
  safety: { label: 'Safety', cls: 'tier-safety', icon: '\uD83D\uDFE2' },
  match: { label: 'Match', cls: 'tier-match', icon: '\uD83D\uDFE1' },
  reach: { label: 'Reach', cls: 'tier-reach', icon: '\uD83D\uDD34' },
  tag: { label: 'TAG Eligible', cls: 'tier-tag', icon: '\u2B50' },
};

const Engine = (() => {
  const root = document.getElementById('app-root');

  let state = null; // set by app.js via Engine.init()

  function init(sharedState) {
    state = sharedState;
  }

  function clearRoot() {
    root.innerHTML = '';
  }

  function mountTemplate(tplId) {
    const tpl = document.getElementById(tplId);
    const node = tpl.content.firstElementChild.cloneNode(true);
    clearRoot();
    root.appendChild(node);
    return node;
  }

  // ---- HOME ----
  function renderHome(onFindPath) {
    const node = mountTemplate('tpl-home');
    node.querySelectorAll('.js-start').forEach((btn) => btn.addEventListener('click', onFindPath));
    const logoBtn = document.getElementById('logo-home-btn');
    if (logoBtn) logoBtn.onclick = () => {}; // already home; no-op, avoids double-binding surprises
    wireFaqAccordion(node);
    wireScrollReveal(node);
    return node;
  }

  function wireFaqAccordion(node) {
    node.querySelectorAll('.faq-row').forEach((row) => {
      row.addEventListener('click', () => {
        const wasOpen = row.classList.contains('open');
        node.querySelectorAll('.faq-row').forEach((r) => r.classList.remove('open'));
        if (!wasOpen) row.classList.add('open');
      });
    });
  }

  function wireScrollReveal(node) {
    const targets = node.querySelectorAll('.app-card');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
  }

  // ---- THINKING ----
  const THINKING_MESSAGES = [
    'Finding your perfect match...',
    'One step closer...',
    'Refining your ideal college list...',
    'Comparing your options...',
    'Almost there...',
  ];
  const THINKING_ICONS = ['\uD83C\uDF93', '\uD83E\uDD1D', '\uD83D\uDCDA', '\u2728'];

  function renderThinking() {
    const node = mountTemplate('tpl-thinking');
    const label = node.querySelector('.thinking-label');
    const iconEl = node.querySelector('.thinking-icon');
    let i = 0;

    function paint(idx) {
      label.textContent = THINKING_MESSAGES[idx];
      if (iconEl) iconEl.textContent = THINKING_ICONS[idx % THINKING_ICONS.length];
    }
    paint(0);

    const timer = setInterval(() => {
      i = (i + 1) % THINKING_MESSAGES.length;
      label.classList.remove('thinking-fade');
      if (iconEl) iconEl.classList.remove('thinking-fade');
      // eslint-disable-next-line no-unused-expressions
      void label.offsetWidth; // restart CSS animation
      label.classList.add('thinking-fade');
      if (iconEl) iconEl.classList.add('thinking-fade');
      paint(i);
    }, 1500);

    // Clean up automatically once this node leaves the DOM (screen changes).
    const observer = new MutationObserver(() => {
      if (!document.body.contains(node)) {
        clearInterval(timer);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return node;
  }

  // ---- LIMIT REACHED ----
  function renderLimitReached(message) {
    const node = mountTemplate('tpl-limit-reached');
    node.querySelector('.limit-message').textContent =
      message || 'We\u2019ve reached our usage limit for now. Please check back soon.';
    return node;
  }

  // ---- QUESTION SCREEN ----
  function renderQuestion(step, currentValue, callbacks) {
    const node = mountTemplate('tpl-question-screen');

    node.querySelector('.question-title').textContent = step.title;
    const subEl = node.querySelector('.question-sub');
    subEl.textContent = step.subtitle || '';

    const body = node.querySelector('.question-body');
    let localSelection = currentValue && currentValue.value !== undefined ? currentValue.value : null;
    let localStructured = currentValue && currentValue.structured ? currentValue.structured : null;

    if (step.helperText) {
      const helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = step.helperText;
      body.appendChild(helper);
    }

    const continueBtn = node.querySelector('.continue-btn');
    const backBtn = node.querySelector('.back-btn');
    const skipBtn = node.querySelector('.skip-link');
    const freeformInput = node.querySelector('.freeform-input');
    const micBtn = node.querySelector('.mic-btn');

    function refreshContinueState() {
      const hasFreeform = freeformInput.value.trim().length > 0;
      let hasSelection = localSelection !== null;

      if (step.field === 'dropdown') {
        hasSelection = step.stateOnly
          ? Boolean(localStructured && localStructured.state)
          : Boolean(localStructured && localStructured.state && localStructured.name);
      } else if (Array.isArray(localStructured)) {
        hasSelection = hasSelection || localStructured.length > 0;
      } else if (localStructured && typeof localStructured === 'object') {
        hasSelection =
          hasSelection ||
          Object.entries(localStructured).some(
            ([k, v]) => k !== 'manualEntry' && v !== '' && v !== null && v !== undefined
          );
      }

      const alwaysContinuable = ['slider', 'dual-slider', 'score-card'].includes(step.field);
      continueBtn.disabled = !(hasSelection || hasFreeform || alwaysContinuable);
    }

    // ---- field renderers ----
    if (step.field === 'options') {
      const row = document.createElement('div');
      row.className = 'opt-row';
      step.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt-btn';
        btn.textContent = opt.label;
        if (localSelection === opt.value) btn.classList.add('selected');
        btn.addEventListener('click', () => {
          if (opt.isInfo) {
            callbacks.onInfoRequest && callbacks.onInfoRequest(opt.value);
            return;
          }
          localSelection = opt.value;
          row.querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          refreshContinueState();
        });
        row.appendChild(btn);
      });
      body.appendChild(row);
    }

    if (step.field === 'slider') {
      localStructured = localStructured || { value: step.slider.default };
      body.appendChild(
        buildSlider(step.slider, localStructured.value, (v) => {
          localStructured.value = v;
        })
      );
    }

    if (step.field === 'dual-slider') {
      localStructured = localStructured || {};
      const group = document.createElement('div');
      group.className = 'slider-group';
      step.sliders.forEach((s) => {
        const wrap = document.createElement('div');
        const label = document.createElement('p');
        label.className = 'slider-row-label';
        label.textContent = s.label;
        wrap.appendChild(label);
        const initial = localStructured[s.key] !== undefined ? localStructured[s.key] : s.default;
        localStructured[s.key] = initial;
        wrap.appendChild(
          buildSlider(s, initial, (v) => {
            localStructured[s.key] = v;
          })
        );
        group.appendChild(wrap);
      });
      body.appendChild(group);
    }

    if (step.field === 'card-stack') {
      localStructured = Array.isArray(localStructured) ? localStructured : [];
      body.appendChild(buildCardStack(step.cardFields, localStructured, refreshContinueState));
    }

    if (step.field === 'dropdown') {
      localStructured = localStructured || { state: '', name: '', manualEntry: false };
      body.appendChild(buildDropdown(step, localStructured, refreshContinueState));
    }

    if (step.field === 'score-card') {
      localStructured = localStructured || {};
      body.appendChild(buildScoreCard(step.scoreFields, localStructured));
    }

    if (step.field === 'freeform-only' && step.freeformPlaceholder) {
      freeformInput.style.minHeight = '120px';
    }

    if (step.freeformPlaceholder) {
      freeformInput.placeholder = step.freeformPlaceholder;
    }

    if (currentValue && currentValue.freeformText) {
      freeformInput.value = currentValue.freeformText;
    }

    freeformInput.addEventListener('input', () => {
      freeformInput.style.height = 'auto';
      freeformInput.style.height = Math.min(freeformInput.scrollHeight, 160) + 'px';
      refreshContinueState();
    });

    attachVoiceInput(freeformInput, micBtn);

    // ---- nav ----
    backBtn.style.visibility = callbacks.canGoBack ? 'visible' : 'hidden';
    backBtn.addEventListener('click', () => callbacks.onBack && callbacks.onBack());

    if (step.skippable) {
      skipBtn.style.display = 'inline-block';
      skipBtn.addEventListener('click', () => callbacks.onSkip && callbacks.onSkip());
    }

    continueBtn.addEventListener('click', () => {
      const payload = {
        value: localSelection,
        structured: localStructured,
        freeformText: freeformInput.value.trim(),
      };
      callbacks.onContinue(payload);
    });

    refreshContinueState();
    return node;
  }

  // ---- voice input (Web Speech API -- Chrome/Edge only, gracefully hidden elsewhere) ----
  function attachVoiceInput(textarea, micBtn) {
    if (!micBtn) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      micBtn.style.display = 'none';
      return;
    }
    let recognizing = false;
    let recognition = null;

    micBtn.addEventListener('click', () => {
      if (recognizing && recognition) {
        recognition.stop();
        return;
      }
      recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        recognizing = true;
        micBtn.classList.add('mic-active');
      };
      recognition.onend = () => {
        recognizing = false;
        micBtn.classList.remove('mic-active');
      };
      recognition.onerror = () => {
        recognizing = false;
        micBtn.classList.remove('mic-active');
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textarea.value = (textarea.value ? textarea.value.trim() + ' ' : '') + transcript;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      };
      try {
        recognition.start();
      } catch {
        /* already running or blocked by permissions -- ignore */
      }
    });
  }

  // ---- field builders ----
  function buildSlider(cfg, initialValue, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-wrap';

    const track = document.createElement('div');
    track.className = 'slider-track';

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'slider-input';
    input.min = cfg.min;
    input.max = cfg.max;
    input.step = cfg.step;
    input.value = initialValue;

    const display = document.createElement('div');
    display.className = 'slider-value-display';
    display.innerHTML = `Current: <strong>${initialValue}</strong>`;

    input.addEventListener('input', () => {
      display.innerHTML = `Current: <strong>${input.value}</strong>`;
      onChange(parseFloat(input.value));
    });

    track.appendChild(input);
    wrap.appendChild(track);
    wrap.appendChild(display);
    return wrap;
  }

  function buildCardStack(fields, entries, onChangeCb) {
    const wrap = document.createElement('div');

    const list = document.createElement('div');
    list.className = 'entries-list';

    function renderList() {
      list.innerHTML = '';
      entries.forEach((entry, idx) => {
        const pill = document.createElement('div');
        pill.className = 'entry-pill';
        const text = fields.map((f) => entry[f.key]).filter(Boolean).join(' \u2014 ');
        const span = document.createElement('span');
        span.textContent = text || '(empty)';
        pill.appendChild(span);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-entry';
        removeBtn.type = 'button';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', () => {
          entries.splice(idx, 1);
          renderList();
          updatePeek();
          onChangeCb();
        });
        pill.appendChild(removeBtn);
        list.appendChild(pill);
      });
    }
    renderList();

    const stackWrap = document.createElement('div');
    stackWrap.className = 'card-stack';

    const peek2 = document.createElement('div');
    peek2.className = 'entry-card-peek entry-card-peek-2';
    const peek1 = document.createElement('div');
    peek1.className = 'entry-card-peek entry-card-peek-1';

    function updatePeek() {
      peek1.style.display = entries.length >= 1 ? 'block' : 'none';
      peek2.style.display = entries.length >= 2 ? 'block' : 'none';
    }

    const card = document.createElement('div');
    card.className = 'entry-card';
    const draft = {};
    const fieldRefs = [];

    fields.forEach((f) => {
      const label = document.createElement('label');
      label.textContent = f.label;
      card.appendChild(label);

      if (f.type === 'select') {
        const select = document.createElement('select');
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = f.placeholder || 'Select...';
        select.appendChild(blank);
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        });
        select.addEventListener('change', () => {
          draft[f.key] = select.value;
        });
        card.appendChild(select);
        fieldRefs.push(select);
      } else if (f.type === 'autocomplete') {
        const acWrap = document.createElement('div');
        acWrap.className = 'autocomplete-wrap';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = f.placeholder || '';
        input.autocomplete = 'off';
        const listEl = document.createElement('div');
        listEl.className = 'autocomplete-list';

        function renderSuggestions() {
          const q = (input.value || '').toLowerCase();
          const matches = f.suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 7);
          listEl.innerHTML = '';
          matches.forEach((m) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = m;
            item.addEventListener('mousedown', (e) => {
              e.preventDefault();
              input.value = m;
              draft[f.key] = m;
              listEl.classList.remove('open');
            });
            listEl.appendChild(item);
          });
          listEl.classList.toggle('open', matches.length > 0);
        }

        input.addEventListener('focus', renderSuggestions);
        input.addEventListener('input', () => {
          draft[f.key] = input.value;
          renderSuggestions();
        });
        input.addEventListener('blur', () => setTimeout(() => listEl.classList.remove('open'), 120));
        acWrap.appendChild(input);
        acWrap.appendChild(listEl);
        card.appendChild(acWrap);
        fieldRefs.push(input);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = f.placeholder || '';
        input.addEventListener('input', () => {
          draft[f.key] = input.value;
        });
        card.appendChild(input);
        fieldRefs.push(input);
      }
    });

    const cardFooter = document.createElement('div');
    cardFooter.className = 'entry-card-footer';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-entry-btn';
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', 'Add course');
    addBtn.addEventListener('click', () => {
      if (Object.values(draft).some((v) => v && String(v).trim())) {
        entries.push({ ...draft });
        card.classList.add('entry-card--added');
        setTimeout(() => card.classList.remove('entry-card--added'), 420);
        fieldRefs.forEach((el) => {
          el.value = '';
        });
        Object.keys(draft).forEach((k) => {
          draft[k] = '';
        });
        renderList();
        updatePeek();
        onChangeCb();
      }
    });
    cardFooter.appendChild(addBtn);
    card.appendChild(cardFooter);

    stackWrap.appendChild(peek2);
    stackWrap.appendChild(peek1);
    stackWrap.appendChild(card);
    updatePeek();

    wrap.appendChild(list);
    wrap.appendChild(stackWrap);
    return wrap;
  }

  function buildDropdown(step, structured, onChangeCb) {
    const wrap = document.createElement('div');
    wrap.className = 'dropdown-wrap';

    function buildStateSelect(onStateChange) {
      const select = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Select your state...';
      select.appendChild(blank);
      US_STATES.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        if (structured.state === s) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', () => onStateChange(select.value));
      return select;
    }

    if (step.stateOnly) {
      const row = document.createElement('div');
      row.className = 'dropdown-row dropdown-row--single';
      const select = buildStateSelect((val) => {
        structured.state = val;
        structured.name = '';
        onChangeCb();
      });
      row.appendChild(select);
      wrap.appendChild(row);
      return wrap;
    }

    // cascadeCollege mode: state first, then a filtered college list or manual entry.
    const stateRow = document.createElement('div');
    stateRow.className = 'dropdown-row dropdown-row--single';
    const collegeZone = document.createElement('div');
    collegeZone.className = 'college-zone';

    function renderCollegeZone() {
      collegeZone.innerHTML = '';
      if (!structured.state) return;
      const colleges = COMMUNITY_COLLEGES_BY_STATE[structured.state];

      if (colleges && colleges.length && !structured.manualEntry) {
        const row = document.createElement('div');
        row.className = 'dropdown-row dropdown-row--single';
        const select = document.createElement('select');
        select.className = 'college-select';
        const b = document.createElement('option');
        b.value = '';
        b.textContent = `Select your community college (${colleges.length})`;
        select.appendChild(b);
        colleges.forEach((c) => {
          const o = document.createElement('option');
          o.value = c;
          o.textContent = c;
          if (structured.name === c) o.selected = true;
          select.appendChild(o);
        });
        select.addEventListener('change', () => {
          structured.name = select.value;
          onChangeCb();
        });
        row.appendChild(select);
        collegeZone.appendChild(row);

        const manualLink = document.createElement('button');
        manualLink.type = 'button';
        manualLink.className = 'manual-entry-link';
        manualLink.textContent = "Don't see your college? Enter manually";
        manualLink.addEventListener('click', () => {
          structured.manualEntry = true;
          structured.name = '';
          renderCollegeZone();
          onChangeCb();
        });
        collegeZone.appendChild(manualLink);
      } else {
        const row = document.createElement('div');
        row.className = 'dropdown-row dropdown-row--single';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter your community college';
        input.value = structured.name || '';
        input.addEventListener('input', () => {
          structured.name = input.value;
          onChangeCb();
        });
        row.appendChild(input);
        collegeZone.appendChild(row);

        if (colleges && colleges.length) {
          const backLink = document.createElement('button');
          backLink.type = 'button';
          backLink.className = 'manual-entry-link';
          backLink.textContent = '\u2190 Back to the list';
          backLink.addEventListener('click', () => {
            structured.manualEntry = false;
            structured.name = '';
            renderCollegeZone();
            onChangeCb();
          });
          collegeZone.appendChild(backLink);
        } else {
          const note = document.createElement('p');
          note.className = 'manual-entry-note';
          note.textContent = "We don't have a preset list for this state yet -- just type your college's name above.";
          collegeZone.appendChild(note);
        }
      }
    }

    const stateSelect = buildStateSelect((val) => {
      structured.state = val;
      structured.name = '';
      structured.manualEntry = false;
      renderCollegeZone();
      onChangeCb();
    });
    stateRow.appendChild(stateSelect);
    wrap.appendChild(stateRow);
    wrap.appendChild(collegeZone);
    renderCollegeZone();

    return wrap;
  }

  function buildScoreCard(fields, structured) {
    const wrap = document.createElement('div');
    const stackWrap = document.createElement('div');
    stackWrap.className = 'card-stack card-stack--single';
    const card = document.createElement('div');
    card.className = 'entry-card';
    fields.forEach((f) => {
      const label = document.createElement('label');
      label.textContent = f.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = f.placeholder;
      input.value = structured[f.key] || '';
      input.addEventListener('input', () => {
        structured[f.key] = input.value;
      });
      card.appendChild(label);
      card.appendChild(input);
    });
    stackWrap.appendChild(card);
    wrap.appendChild(stackWrap);
    return wrap;
  }

  // ---- RESULTS SCREEN ----
  function renderResults(data, onSendFollowup) {
    const node = mountTemplate('tpl-results');
    const body = node.querySelector('.results-body');
    const messagesEl = node.querySelector('.results-chat-messages');

    function paintRecommendation(d) {
      body.innerHTML = '';

      if (d.summary) {
        const summary = document.createElement('p');
        summary.className = 'results-summary';
        summary.textContent = d.summary;
        body.appendChild(summary);
      }

      if (d.schools && d.schools.length) {
        const grid = document.createElement('div');
        grid.className = 'school-grid';
        d.schools.forEach((s, i) => {
          const meta = TIER_META[s.tier] || TIER_META.match;
          const card = document.createElement('div');
          card.className = 'school-card';
          card.style.animationDelay = i * 0.06 + 's';

          const top = document.createElement('div');
          top.className = 'school-card-top';
          const name = document.createElement('span');
          name.className = 'school-name';
          name.textContent = s.name || '';
          const badge = document.createElement('span');
          badge.className = 'tier-badge ' + meta.cls;
          badge.textContent = meta.icon + ' ' + meta.label;
          top.appendChild(name);
          top.appendChild(badge);
          card.appendChild(top);

          if (s.program) {
            const prog = document.createElement('div');
            prog.className = 'school-program';
            prog.textContent = s.program;
            card.appendChild(prog);
          }
          if (s.note) {
            const note = document.createElement('div');
            note.className = 'school-note';
            note.textContent = s.note;
            card.appendChild(note);
          }
          grid.appendChild(card);
        });
        body.appendChild(grid);
      }

      if (d.top_pick && d.top_pick.name) {
        const pick = document.createElement('div');
        pick.className = 'top-pick-card';
        const label = document.createElement('div');
        label.className = 'top-pick-label';
        label.textContent = '\u2B50 Top Pick';
        const name = document.createElement('div');
        name.className = 'top-pick-name';
        name.textContent = d.top_pick.name;
        const reason = document.createElement('div');
        reason.className = 'top-pick-reason';
        reason.textContent = d.top_pick.reasoning || '';
        pick.appendChild(label);
        pick.appendChild(name);
        pick.appendChild(reason);
        body.appendChild(pick);
      }

      if (d.gaps && d.gaps.length) {
        body.appendChild(buildInfoCard('Gaps to address', d.gaps, 'gaps-card'));
      }
      if (d.next_steps && d.next_steps.length) {
        body.appendChild(buildInfoCard('Next steps', d.next_steps, 'next-steps-card'));
      }

      if (!(d.schools && d.schools.length) && !d.summary) {
        const empty = document.createElement('p');
        empty.className = 'results-summary';
        empty.textContent = "Let's chat a bit more below so I can put together your list.";
        body.appendChild(empty);
      }
    }

    function buildInfoCard(title, items, extraClass) {
      const card = document.createElement('div');
      card.className = 'info-card ' + extraClass;
      const h = document.createElement('div');
      h.className = 'info-card-title';
      h.textContent = title;
      card.appendChild(h);
      const ul = document.createElement('ul');
      items.forEach((it) => {
        const li = document.createElement('li');
        li.textContent = it;
        ul.appendChild(li);
      });
      card.appendChild(ul);
      return card;
    }

    if (data.mode === 'recommendation') {
      paintRecommendation(data);
    } else {
      const prompt = document.createElement('p');
      prompt.className = 'results-summary';
      prompt.textContent = 'I need a bit more information to give you my best advice -- see my question below.';
      body.appendChild(prompt);
    }

    if (data.message) {
      appendChatMsg(messagesEl, 'ai', data.message);
    }

    const input = node.querySelector('.results-chat-input');
    const sendBtn = node.querySelector('.send-btn');

    function send() {
      const text = input.value.trim();
      if (!text) return;
      appendChatMsg(messagesEl, 'user', text);
      input.value = '';
      input.style.height = 'auto';
      onSendFollowup(text, (replyData) => {
        if (replyData.mode === 'recommendation') {
          paintRecommendation(replyData);
        }
        if (replyData.message) appendChatMsg(messagesEl, 'ai', replyData.message);
      });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    return node;
  }

  function appendChatMsg(container, role, text) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  return {
    init,
    renderHome,
    renderThinking,
    renderQuestion,
    renderResults,
    renderLimitReached,
  };
})();
