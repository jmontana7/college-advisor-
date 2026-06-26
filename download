// ============================================================================
//  Covenant — Rendering engine for the intake flow
// ----------------------------------------------------------------------------
//  Reads STEPS (steps.js) and renders the right screen. Talks to engine
//  state (profile, currentStepId) which app.js owns and persists.
// ============================================================================

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

  // ── HOME ──
  function renderHome(onFindPath) {
    const node = mountTemplate('tpl-home');
    node.querySelector('#home-find-path').addEventListener('click', onFindPath);
    document.getElementById('header-cta').onclick = onFindPath;
  }

  // ── THINKING ──
  function renderThinking() {
    mountTemplate('tpl-thinking');
  }

  // ── LIMIT REACHED ──
  function renderLimitReached(message) {
    const node = mountTemplate('tpl-limit-reached');
    node.querySelector('.limit-message').textContent =
      message || "We've reached our usage limit for now. Please check back soon.";
  }

  // ── QUESTION SCREEN (the workhorse) ──
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
      helper.style.cssText = 'font-size:18px;color:rgba(0,0,0,0.6);max-width:680px;margin-bottom:24px;text-align:center;';
      helper.textContent = step.helperText;
      body.appendChild(helper);
    }

    const continueBtn = node.querySelector('.continue-btn');
    const backBtn = node.querySelector('.back-btn');
    const skipBtn = node.querySelector('.skip-link');
    const freeformInput = node.querySelector('.freeform-input');

    function refreshContinueState() {
      const hasFreeform = freeformInput.value.trim().length > 0;
      let structuredHasContent = false;
      if (Array.isArray(localStructured)) {
        structuredHasContent = localStructured.length > 0;
      } else if (localStructured && typeof localStructured === 'object') {
        structuredHasContent = Object.values(localStructured).some(
          (v) => v !== '' && v !== null && v !== undefined
        );
      }
      const hasSelection = localSelection !== null || structuredHasContent;
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
      body.appendChild(buildSlider(step.slider, localStructured.value, (v) => { localStructured.value = v; }));
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
        wrap.appendChild(buildSlider(s, initial, (v) => { localStructured[s.key] = v; }));
        group.appendChild(wrap);
      });
      body.appendChild(group);
    }

    if (step.field === 'card-stack') {
      localStructured = Array.isArray(localStructured) ? localStructured : [];
      body.appendChild(buildCardStack(step.cardFields, localStructured, refreshContinueState));
    }

    if (step.field === 'dropdown') {
      localStructured = localStructured || { name: '', state: '' };
      body.appendChild(buildDropdown(step, localStructured, refreshContinueState));
    }

    if (step.field === 'score-card') {
      localStructured = localStructured || {};
      body.appendChild(buildScoreCard(step.scoreFields, localStructured));
    }

    if (step.freeformPlaceholder) {
      freeformInput.placeholder = step.freeformPlaceholder;
    }
    if (step.field === 'freeform-only') {
      freeformInput.style.minHeight = '120px';
    }

    if (currentValue && currentValue.freeformText) {
      freeformInput.value = currentValue.freeformText;
    }

    freeformInput.addEventListener('input', () => {
      freeformInput.style.height = 'auto';
      freeformInput.style.height = Math.min(freeformInput.scrollHeight, 160) + 'px';
      refreshContinueState();
    });

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
        pill.innerHTML = `<span>${text || '(empty)'}</span>`;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-entry';
        removeBtn.type = 'button';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', () => {
          entries.splice(idx, 1);
          renderList();
          onChangeCb();
        });
        pill.appendChild(removeBtn);
        list.appendChild(pill);
      });
    }
    renderList();

    const card = document.createElement('div');
    card.className = 'entry-card';
    const draft = {};
    fields.forEach((f) => {
      const label = document.createElement('label');
      label.textContent = f.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = f.placeholder || '';
      input.addEventListener('input', () => { draft[f.key] = input.value; });
      card.appendChild(label);
      card.appendChild(input);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-entry-btn';
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      if (Object.values(draft).some((v) => v && v.trim())) {
        entries.push({ ...draft });
        card.querySelectorAll('input').forEach((i) => { i.value = ''; });
        Object.keys(draft).forEach((k) => { draft[k] = ''; });
        renderList();
        onChangeCb();
      }
    });
    card.appendChild(addBtn);

    const stackWrap = document.createElement('div');
    stackWrap.className = 'card-stack';
    stackWrap.appendChild(card);

    wrap.appendChild(list);
    wrap.appendChild(stackWrap);
    return wrap;
  }

  function buildDropdown(step, structured, onChangeCb) {
    const row = document.createElement('div');
    row.className = 'dropdown-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = step.dropdownLabel || 'Enter your community college';
    nameInput.value = structured.name || '';
    nameInput.addEventListener('input', () => { structured.name = nameInput.value; onChangeCb(); });
    row.appendChild(nameInput);

    const stateLabel = document.createElement('span');
    stateLabel.textContent = 'State';
    row.appendChild(stateLabel);

    const select = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Select...';
    select.appendChild(blank);
    US_STATES.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (structured.state === s) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => { structured.state = select.value; onChangeCb(); });
    row.appendChild(select);

    return row;
  }

  function buildScoreCard(fields, structured) {
    const wrap = document.createElement('div');
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.style.position = 'relative';
    fields.forEach((f) => {
      const label = document.createElement('label');
      label.textContent = f.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = f.placeholder;
      input.value = structured[f.key] || '';
      input.addEventListener('input', () => { structured[f.key] = input.value; });
      card.appendChild(label);
      card.appendChild(input);
    });
    const stackWrap = document.createElement('div');
    stackWrap.className = 'card-stack';
    stackWrap.style.minHeight = 'auto';
    stackWrap.appendChild(card);
    wrap.appendChild(stackWrap);
    return wrap;
  }

  // ── RESULTS SCREEN ──
  function renderResults(markdownText, onSendFollowup) {
    const node = mountTemplate('tpl-results');
    node.querySelector('.results-body').innerHTML = simpleMarkdownToHtml(markdownText);

    const input = node.querySelector('.results-chat-input');
    const sendBtn = node.querySelector('.send-btn');
    const messagesEl = node.querySelector('.results-chat-messages');

    function send() {
      const text = input.value.trim();
      if (!text) return;
      appendChatMsg(messagesEl, 'user', text);
      input.value = '';
      onSendFollowup(text, (replyText) => appendChatMsg(messagesEl, 'ai', replyText));
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
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

  function simpleMarkdownToHtml(text) {
    if (!text) return '';
    // Minimal markdown: tables, bold, headers, line breaks. Good enough for
    // the recommendation output format defined in the skill.
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Tables
    html = html.replace(/((?:^\|.*\|\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').filter((r) => r.trim());
      if (rows.length < 2) return block;
      const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
      const header = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      let t = '<table><thead><tr>' + header.map((h) => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
      bodyRows.forEach((r) => { t += '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>'; });
      t += '</tbody></table>';
      return t;
    });

    html = html
      .replace(/^### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^## (.*)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
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
