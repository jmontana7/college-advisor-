
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

// ============================================================================
//  i18n -- English lives inline in index.html/steps.js/engine.js and is the
//  fallback; TRANSLATIONS (i18n.js) holds the other languages. Nothing here
//  is destructive: translateStep() returns a shallow-merged copy, and tr()
//  always falls back to the literal English string already in the caller.
// ============================================================================
let currentLang = 'en';
try {
  currentLang = localStorage.getItem('obee_lang') || 'en';
} catch {
  /* storage unavailable -- default to English */
}

function getLang() {
  return currentLang;
}

function setLang(lang) {
  currentLang = lang;
  try {
    localStorage.setItem('obee_lang', lang);
  } catch {
    /* not fatal -- just won't persist across reloads */
  }
}

// Dotted-path lookup into TRANSLATIONS[currentLang], e.g. tr('ui.navBack', 'Back').
function tr(path, fallback) {
  if (currentLang === 'en') return fallback;
  const dict = TRANSLATIONS[currentLang];
  if (!dict) return fallback;
  const value = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
  return value !== undefined ? value : fallback;
}

// Overlays the current language's copy for one step onto a shallow clone --
// title/subtitle/helperText/placeholders plus nested option labels, card
// field labels/placeholders (and any college-choice sub-labels), slider
// labels, and score field labels. Anything not translated keeps the
// original English value.
function translateStep(step) {
  if (currentLang === 'en') return step;
  const dict = TRANSLATIONS[currentLang];
  const t = dict && dict.steps && dict.steps[step.id];
  if (!t) return step;

  const translated = { ...step };
  if (t.title) translated.title = t.title;
  if (t.subtitle) translated.subtitle = t.subtitle;
  if (t.helperText) translated.helperText = t.helperText;
  if (t.freeformPlaceholder) translated.freeformPlaceholder = t.freeformPlaceholder;
  if (t.schoolFieldLabel) translated.schoolFieldLabel = t.schoolFieldLabel;
  if (t.optionalToggle) translated.optionalToggle = t.optionalToggle;

  if (t.options && Array.isArray(step.options)) {
    translated.options = step.options.map((opt) => (t.options[opt.value] ? { ...opt, label: t.options[opt.value] } : opt));
  }
  if (t.cardFields && Array.isArray(step.cardFields)) {
    translated.cardFields = step.cardFields.map((f) => (t.cardFields[f.key] ? { ...f, ...t.cardFields[f.key] } : f));
  }
  if (t.sliders && Array.isArray(step.sliders)) {
    translated.sliders = step.sliders.map((s) => (t.sliders[s.key] ? { ...s, label: t.sliders[s.key] } : s));
  }
  if (t.scoreFields && Array.isArray(step.scoreFields)) {
    translated.scoreFields = step.scoreFields.map((f) => (t.scoreFields[f.key] ? { ...f, ...t.scoreFields[f.key] } : f));
  }
  return translated;
}

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

  // ---- Shareable results links: pack/unpack results JSON into a URL param ----
  function encodeShareData(data) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    } catch {
      return null;
    }
  }

  function decodeShareData(str) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(str))));
    } catch {
      return null;
    }
  }

  // ---- HOME ----
  function renderHome(onFindPath) {
    const node = mountTemplate('tpl-home');
    node.querySelectorAll('.js-start').forEach((btn) => btn.addEventListener('click', onFindPath));
    const logoBtn = document.getElementById('logo-home-btn');
    if (logoBtn) logoBtn.onclick = () => {}; // already home; no-op, avoids double-binding surprises
    applyHomeTranslations(node);
    splitLongCard1ParagraphForMobile(node);
    typewriterHeroQuote(node);
    wireFaqAccordion(node);
    wireScrollReveal(node);
    buildDotField(node);
    syncVideoCardHeight(node);
    buildFlowCarousel(node);
    ensurePromoVideoPlays(node);
    return node;
  }

  // Mobile-only (desktop's single dense paragraph is intentional there,
  // this never runs above the phone breakpoint): breaks card 1's longer
  // paragraph into two at the sentence boundary closest to its midpoint,
  // language-agnostic since it runs after translations are applied. A
  // wall of unbroken text reads worse stacked full-width on a narrow
  // screen than the same content does in two shorter paragraphs.
  function splitLongCard1ParagraphForMobile(node) {
    if (window.innerWidth > 720) return;
    const bodies = node.querySelectorAll('.app-card--video .card-body');
    const target = bodies[bodies.length - 1];
    if (!target) return;
    const text = target.textContent;
    const mid = Math.floor(text.length / 2);
    const boundaries = [...text.matchAll(/[.!?]\s+/g)].map((m) => m.index + m[0].length);
    if (!boundaries.length) return;
    const splitAt = boundaries.reduce((best, b) => (Math.abs(b - mid) < Math.abs(best - mid) ? b : best));
    const firstHalf = text.slice(0, splitAt).trim();
    const secondHalf = text.slice(splitAt).trim();
    if (!firstHalf || !secondHalf) return;
    target.textContent = firstHalf;
    const newP = document.createElement('p');
    newP.className = 'card-body';
    newP.textContent = secondHalf;
    target.insertAdjacentElement('afterend', newP);
  }

  // The video's real src sits in data-src instead of src so it never
  // competes for bandwidth with fonts/CSS/JS on a slow connection -- it's
  // a 3MB decorative clip, not core content. We only attach src (and start
  // playback) once the rest of the page has already finished loading; if
  // the page is already fully loaded by the time this runs (e.g. the user
  // navigated back to home), it starts right away.
  function ensurePromoVideoPlays(node) {
    const video = node.querySelector('.promo-video');
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    function startVideo() {
      if (!video.src) video.src = video.dataset.src;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay can still be blocked outright (e.g. low-power mode) --
          // nothing to do here, the poster frame is a fine fallback.
        });
      }
    }
    if (document.readyState === 'complete') {
      startVideo();
    } else {
      window.addEventListener('load', startVideo, { once: true });
    }
  }

  // Types the hero quote out character by character, like a typewriter, on
  // first paint -- runs after applyHomeTranslations so it always animates
  // whatever text actually ended up on screen (English or a translation).
  // Splits on the existing bold/regular text nodes so the two-weight
  // styling stays correct as characters appear, instead of just typing
  // into a single plain-text node. Once the quote finishes, the citation
  // ("Nelson Mandela") types out the same way right after it.
  function typewriterHeroQuote(node) {
    const heroQuote = node.querySelector('.hero-quote');
    const quoteRegular = heroQuote && heroQuote.querySelector('.quote-regular');
    const heroCite = node.querySelector('.hero-cite');
    if (!heroQuote || !quoteRegular) return;

    const regularText = quoteRegular.textContent;
    const boldText = heroQuote.textContent.slice(0, heroQuote.textContent.length - regularText.length);

    const boldNode = document.createTextNode('');
    const regularSpan = document.createElement('span');
    regularSpan.className = 'quote-regular';
    heroQuote.innerHTML = '';
    heroQuote.appendChild(boldNode);
    heroQuote.appendChild(regularSpan);
    heroQuote.classList.add('typing');

    const speed = 41;
    // Cleared immediately (not inside typeCite) so "Nelson Mandela" stays
    // invisible for the whole quote animation instead of flashing on
    // screen at full length before typeCite finally clears it.
    const citeText = heroCite ? heroCite.textContent : '';
    if (heroCite) heroCite.textContent = '';

    function typeCite() {
      if (!heroCite) return;
      heroCite.classList.add('typing');
      let j = 0;
      (function citeTick() {
        j++;
        heroCite.textContent = citeText.slice(0, j);
        if (j < citeText.length) {
          setTimeout(citeTick, speed);
        } else {
          heroCite.classList.remove('typing');
        }
      })();
    }

    const total = boldText.length + regularText.length;
    let i = 0;
    (function tick() {
      i++;
      if (i <= boldText.length) {
        boldNode.textContent = boldText.slice(0, i);
      } else {
        regularSpan.textContent = regularText.slice(0, i - boldText.length);
      }
      if (i < total) {
        setTimeout(tick, speed);
      } else {
        heroQuote.classList.remove('typing');
        typeCite();
      }
    })();
  }

  // Overlays the current language's copy onto every static string on the
  // home screen. No-op (returns immediately) in English, since that's
  // already what the template contains.
  function applyHomeTranslations(node) {
    if (currentLang === 'en') return;
    const ui = tr('ui', null);
    if (!ui) return;

    const heroQuote = node.querySelector('.hero-quote');
    const quoteRegular = heroQuote && heroQuote.querySelector('.quote-regular');
    if (heroQuote && quoteRegular && ui.heroQuoteBold) {
      heroQuote.innerHTML =
        '“' + ui.heroQuoteBold + ' <span class="quote-regular">' + (ui.heroQuoteRegular || '') + '”</span>';
    }
    setText(node, '.hero-cite', ui.heroCite);
    setText(node, '.hero-sub', ui.heroSub);
    setText(node, '.hero .cta-pill--soft', ui.heroCta);

    setText(node, '.app-card--video .card-title', ui.card1Title);
    const card1Bodies = node.querySelectorAll('.app-card--video .card-body');
    if (card1Bodies[0] && ui.card1Body1) card1Bodies[0].textContent = ui.card1Body1;
    if (card1Bodies[1] && ui.card1Body2) card1Bodies[1].textContent = ui.card1Body2;
    setText(node, '.app-card--video .cta-pill--dark', ui.card1Cta);
    setText(node, '.app-card:not(.app-card--video) .app-card-panel .cta-pill', ui.card2Cta);

    if (ui.features) {
      const featureLabels = { integrated: 'Integrated', secure: 'Secure', open: 'Open', reliable: 'Reliable', affordable: 'Affordable', honest: 'Honest' };
      node.querySelectorAll('.feature-item').forEach((item) => {
        const original = item.textContent.trim();
        const key = Object.keys(featureLabels).find((k) => featureLabels[k] === original);
        if (key && ui.features[key]) {
          // The emoji/icon is a separate <img>; only the trailing text node changes.
          const textNode = Array.from(item.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
          if (textNode) textNode.textContent = ' ' + ui.features[key];
        }
      });
    }

    if (ui.flow) {
      const flowKeys = ['tellObee', 'explore', 'doubleCheck', 'refine', 'launch'];
      node.querySelectorAll('.flow-carousel-label').forEach((label, i) => {
        const key = flowKeys[i];
        if (key && ui.flow[key]) label.innerHTML = ui.flow[key];
      });
    }

    setText(node, '.faq-title', ui.faqTitle, true);
    if (Array.isArray(ui.faq)) {
      node.querySelectorAll('.faq-row').forEach((row, i) => {
        const t = ui.faq[i];
        if (!t) return;
        const qEl = row.querySelector('.faq-row-head span:first-child');
        const aEl = row.querySelector('.faq-answer-inner');
        if (qEl && t.q) qEl.textContent = t.q;
        if (aEl && t.a) aEl.innerHTML = t.a;
      });
    }

    setText(node, '.final-card h2', ui.finalCtaTitle);
    setText(node, '.final-card .cta-pill--dark', ui.finalCtaBtn);
    setText(node, '.footer-copy', ui.footerCopy);
  }

  // Small helper for the home-screen translation pass above: sets
  // textContent (or innerHTML when a string may contain a <br>) on the
  // first match, no-op if the selector doesn't resolve or there's no value.
  function setText(root, selector, value, isHTML) {
    if (!value) return;
    const el = root.querySelector(selector);
    if (!el) return;
    if (isHTML) el.innerHTML = value;
    else el.textContent = value;
  }

  // ---- Twinkling dot field behind the flow carousel, with a fixed
  // dot-matrix "OBEE" plotted among the randomly-timed dots so it pulses
  // into sync every so often instead of just being background noise. ----
  // Size card 1 (and card 2, to match) so the video panel's height exactly
  // fits the video's own 4:3 aspect ratio at its rendered width -- no
  // letterbox bars, no cropping. Recomputed on resize.
  function syncVideoCardHeight(root) {
    const panel = root.querySelector('.app-card-panel--video');
    if (!panel) return;
    const card = panel.closest('.app-card');
    const cards = root.querySelectorAll('.app-card');
    const secondCard = cards[1];
    if (!card) return;

    function apply() {
      if (window.innerWidth <= 900) {
        card.style.height = '';
        card.style.minHeight = '';
        if (secondCard) { secondCard.style.height = ''; secondCard.style.minHeight = ''; }
        return;
      }
      const width = panel.getBoundingClientRect().width;
      if (!width) return;
      // The base .app-card rule sets min-height: 540px, which would otherwise
      // clamp this shorter, video-driven height right back up to 540.
      // +18px over the video's exact 4:3 ratio gives the text column (card 1)
      // and features grid (card 2) genuine breathing room at the bottom --
      // the video absorbs it invisibly via object-fit: cover, a tiny crop.
      const height = Math.round(width * (3 / 4)) + 18;
      card.style.minHeight = '0';
      card.style.height = height + 'px';
      if (secondCard) {
        secondCard.style.minHeight = '0';
        secondCard.style.height = height + 'px';
      }
    }

    apply();
    window.addEventListener('resize', apply);
  }

  function buildDotField(root) {
    const field = root.querySelector('.flow-dot-field');
    if (!field) return;

    const SPACING = 24;
    const rect = field.getBoundingClientRect();
    const cols = Math.max(1, Math.floor(rect.width / SPACING));
    const rows = Math.max(1, Math.floor(rect.height / SPACING));

    const LETTERS = {
      O: ['0110', '1001', '1001', '1001', '0110'],
      B: ['1110', '1001', '1110', '1001', '1110'],
      E: ['1111', '1000', '1110', '1000', '1111'],
    };
    const WORD = ['O', 'B', 'E', 'E'];
    const letterWidth = 4;
    const gap = 1;
    const wordWidth = WORD.length * letterWidth + (WORD.length - 1) * gap;
    const wordHeight = 5;
    const startCol = Math.floor((cols - wordWidth) / 2);
    // Only plot the word if the top padding band is tall enough to hold it
    // clear of the carousel row -- with a tightly cropped board there may
    // not be room, in which case it's skipped rather than risk it landing
    // behind the (now much bigger) images.
    const topBandRows = Math.floor(parseFloat(getComputedStyle(root.querySelector('.flow-cascade')).paddingTop) / SPACING);
    const startRow = topBandRows >= wordHeight + 1 ? 1 : -1;

    function isObeeDot(col, row) {
      if (startCol < 0 || startRow < 0) return false;
      const relCol = col - startCol;
      const relRow = row - startRow;
      if (relRow < 0 || relRow >= wordHeight || relCol < 0 || relCol >= wordWidth) return false;
      let cursor = 0;
      for (const letter of WORD) {
        if (relCol >= cursor && relCol < cursor + letterWidth) {
          return LETTERS[letter][relRow][relCol - cursor] === '1';
        }
        cursor += letterWidth + gap;
      }
      return false;
    }

    field.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    field.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dot = document.createElement('span');
        const isObee = isObeeDot(c, r);
        dot.className = isObee ? 'flow-twinkle-dot flow-twinkle-dot--obee' : 'flow-twinkle-dot';
        if (isObee) {
          dot.style.animationDuration = '2.6s';
          dot.style.animationDelay = '0s';
        } else {
          dot.style.animationDuration = (2 + Math.random() * 2.5).toFixed(2) + 's';
          dot.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
        }
        frag.appendChild(dot);
      }
    }
    field.appendChild(frag);
  }

  // Cycles the flow-carousel cards, typing each label letter by letter,
  // left to right (at a fixed per-character pace, so a slot's length
  // matches its own text length) and keeping the progress dots in sync
  // with whichever card is currently active.
  function buildFlowCarousel(root) {
    const cards = Array.from(root.querySelectorAll('.flow-carousel-card'));
    if (!cards.length) return;
    const dots = Array.from(root.querySelectorAll('.flow-dot'));

    const PACE_MS = 70;
    // Extra hold after a label finishes typing, so there's time to actually
    // read it before the next card starts.
    const GAP_MS = 1300;
    let timer = null;

    function playCard(index) {
      cards.forEach((c, i) => c.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));

      const card = cards[index];
      const label = card.querySelector('.flow-carousel-label');
      if (label._flowAnim) label._flowAnim.cancel();

      const steps = Math.max(label.textContent.trim().replace(/\s+/g, '').length, 1);
      let duration;

      // Below 720px there's no single line wide enough for the longest
      // label at a readable size -- the clip reveal needs nowrap, so on
      // narrow screens skip it and just let the full (wrapped) label fade
      // in with the card instead.
      if (window.innerWidth <= 720) {
        label.style.width = 'auto';
        duration = Math.min(steps * PACE_MS, 1300);
      } else {
        label.style.width = 'auto';
        const fullWidth = label.getBoundingClientRect().width;
        label.style.width = '0px';
        duration = steps * PACE_MS;
        label._flowAnim = label.animate(
          [{ width: '0px' }, { width: fullWidth + 'px' }],
          { duration, easing: `steps(${steps}, end)`, fill: 'forwards' }
        );
      }

      clearTimeout(timer);
      timer = setTimeout(() => playCard((index + 1) % cards.length), duration + GAP_MS);
    }

    playCard(0);
  }

  function wireFaqAccordion(node) {
    const rows = node.querySelectorAll('.faq-row');
    rows.forEach((row) => {
      const head = row.querySelector('.faq-row-head');
      if (!head) return;
      // Was a plain, unfocusable <div> -- keyboard users couldn't reach or
      // open these at all. role="button" + tabindex makes it a real
      // keyboard-operable control without touching how it looks.
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', 'false');

      function toggle() {
        const wasOpen = row.classList.contains('open');
        rows.forEach((r) => {
          r.classList.remove('open');
          const h = r.querySelector('.faq-row-head');
          if (h) h.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          row.classList.add('open');
          head.setAttribute('aria-expanded', 'true');
        }
      }

      head.addEventListener('click', toggle);
      head.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function wireScrollReveal(node) {
    const targets = node.querySelectorAll('.app-card, .flow-cascade');
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
    'Reading your profile...',
    'Scanning thousands of schools...',
    'Finding your right path...',
    'Weighing your odds...',
    'Cross-checking admission trends...',
    'Separating the reach from the reality...',
    'Assembling your college list...',
    'Almost there...',
  ];

  function renderThinking() {
    const node = mountTemplate('tpl-thinking');
    const label = node.querySelector('.thinking-label');
    label.textContent = tr('ui.thinkingLabel', label.textContent);
    const messages = tr('dynamic.thinkingMessages', THINKING_MESSAGES);
    let i = 0;

    function paint(idx) {
      label.textContent = messages[idx];
    }
    paint(0);

    const timer = setInterval(() => {
      i = (i + 1) % messages.length;
      label.classList.remove('thinking-fade');
      // eslint-disable-next-line no-unused-expressions
      void label.offsetWidth; // restart CSS animation
      label.classList.add('thinking-fade');
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
    const titleEl = node.querySelector('h2');
    if (titleEl) titleEl.textContent = tr('ui.limitTitle', titleEl.textContent);
    node.querySelector('.limit-message').textContent =
      message || 'We\u2019ve reached our usage limit for now. Please check back soon.';
    return node;
  }

  // ---- QUESTION SCREEN ----
  function renderQuestion(rawStep, currentValue, callbacks) {
    const step = translateStep(rawStep);
    const node = mountTemplate('tpl-question-screen');
    // Every step gets its own hook class, independent of field type or
    // splitImage -- lets any single screen's CSS be tuned without touching
    // the rest (same pattern as question-split--step-<id> for split steps).
    node.classList.add('question-screen--step-' + step.id);
    // The card-stack + image combo needs more than the screen's normal
    // 920px cap to fit a 720px-wide card next to the illustration. The GPA
    // dual-slider page needs the same room -- its nowrap labels otherwise
    // squeeze the illustration column down to a sliver.
    if ((step.field === 'card-stack' || step.field === 'dual-slider') && step.splitImage) {
      node.classList.add('question-screen--wide');
    }

    node.querySelector('.question-title').textContent = step.title;
    const subEl = node.querySelector('.question-sub');
    subEl.textContent = step.subtitle || '';
    if (step.skippable) {
      const optionalNote = document.createElement('p');
      optionalNote.className = 'question-optional-note';
      optionalNote.textContent = '(' + tr('ui.optionalLabel', 'optional') + ')';
      subEl.insertAdjacentElement('afterend', optionalNote);
    }

    const progressWrap = node.querySelector('.question-progress');
    const flowSteps = step.flow && FLOW_ORDER[step.flow];
    if (flowSteps && step.order) {
      const total = flowSteps.length;
      const current = Math.min(step.order, total);
      node.querySelector('.question-progress-label').textContent = `Step ${current} of ${total}`;
      node.querySelector('.question-progress-fill').style.width = (current / total) * 100 + '%';
    } else {
      progressWrap.style.display = 'none';
    }

    const body = node.querySelector('.question-body');
    // Whatever the field renders below goes in here rather than straight into
    // `body` -- if the step has a splitImage, this whole block gets dropped
    // into the right-hand column of a two-up layout instead (see the
    // splitImage handling after the field-type blocks); otherwise it's
    // appended to `body` as-is, unchanged from the old direct-append shape.
    const fieldContent = document.createElement('div');
    fieldContent.className = 'question-field-content';
    let localSelection = currentValue && currentValue.value !== undefined ? currentValue.value : null;
    let localStructured = currentValue && currentValue.structured ? currentValue.structured : null;
    // Set by the card-stack branch below when step.transcriptUpload is on --
    // the splitImage block (further down) tucks it under Obee's image
    // instead of inside the card itself.
    let transcriptUploadBox = null;

    if (step.helperText) {
      const helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = step.helperText;
      fieldContent.appendChild(helper);
    }

    const continueBtn = node.querySelector('.continue-btn');
    const backBtn = node.querySelector('.back-btn');
    const skipBtn = node.querySelector('.skip-link');
    const freeformInput = node.querySelector('.freeform-input');
    const micBtn = node.querySelector('.mic-btn');

    backBtn.textContent = tr('ui.navBack', backBtn.textContent);
    skipBtn.textContent = tr('ui.navSkip', skipBtn.textContent);
    continueBtn.textContent = tr('ui.navContinue', continueBtn.textContent);
    freeformInput.placeholder = tr('ui.freeformPlaceholder', freeformInput.placeholder);

    function refreshContinueState() {
      const hasFreeform = freeformInput.value.trim().length > 0;
      let hasSelection = localSelection !== null;

      if (step.field === 'dropdown') {
        if (step.stateOnly) {
          hasSelection = step.includeSchoolField
            ? Boolean(localStructured && localStructured.state && localStructured.school)
            : Boolean(localStructured && localStructured.state);
        } else {
          hasSelection = Boolean(localStructured && localStructured.state && localStructured.name);
        }
      } else if (Array.isArray(localStructured)) {
        hasSelection = hasSelection || localStructured.length > 0;
      } else if (localStructured && typeof localStructured === 'object') {
        hasSelection =
          hasSelection ||
          Object.entries(localStructured).some(
            ([k, v]) => k !== 'manualEntry' && v !== '' && v !== null && v !== undefined
          );
      }

      // Some options (e.g. "I have my schools") require the student to
      // actually type them in the chat box before continuing -- picking the
      // option alone isn't enough, unlike every other options step.
      if (step.field === 'options' && step.optionsRequireFreeform && step.optionsRequireFreeform.includes(localSelection)) {
        hasSelection = hasSelection && hasFreeform;
      }

      const alwaysContinuable = ['slider', 'dual-slider', 'score-card'].includes(step.field);
      continueBtn.disabled = !(hasSelection || hasFreeform || alwaysContinuable);
    }

    // ---- field renderers ----
    function buildOptButton(opt, container, extraClass) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = extraClass ? `opt-btn ${extraClass}` : 'opt-btn';
      if (opt.image) {
        btn.classList.add('opt-btn--image');
        const img = document.createElement('img');
        img.src = opt.image;
        img.alt = opt.label;
        img.loading = 'lazy';
        img.decoding = 'async';
        btn.appendChild(img);
      } else {
        btn.textContent = opt.label;
      }
      if (localSelection === opt.value) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        if (opt.isInfo) {
          callbacks.onInfoRequest && callbacks.onInfoRequest(opt.value);
          return;
        }
        localSelection = opt.value;
        container.querySelectorAll('.opt-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        refreshContinueState();
      });
      return btn;
    }

    if (step.field === 'options') {
      // stackedImage sits above the options row, inline in the normal
      // top-to-bottom flow -- unlike splitImage, which puts the image in
      // its own left/right column next to the field.
      if (step.stackedImage) {
        const stacked = document.createElement('img');
        stacked.className = 'question-stacked-image';
        stacked.src = step.stackedImage;
        stacked.alt = '';
        stacked.loading = 'lazy';
        stacked.decoding = 'async';
        fieldContent.appendChild(stacked);
      }
      const container = document.createElement('div');
      container.className = (step.splitImage || step.imageOptions) ? 'opt-stack' : 'opt-row';
      step.options.forEach((opt, i) => {
        const optBtn = buildOptButton(opt, container, (step.splitImage || step.imageOptions) ? 'opt-btn--stacked' : undefined);
        // Same staggered-reveal feel as the home page's cards, just per
        // button instead of per whole card.
        optBtn.style.animationDelay = i * 0.06 + 's';
        container.appendChild(optBtn);
      });
      fieldContent.appendChild(container);
    }

    if (step.field === 'slider') {
      localStructured = localStructured || { value: step.slider.default };
      fieldContent.appendChild(
        buildSlider(step.slider, localStructured.value, (v) => {
          localStructured.value = v;
        }, step.id)
      );
    }

    if (step.field === 'dual-slider') {
      localStructured = localStructured || {};
      const group = document.createElement('div');
      group.className = 'slider-group';
      step.sliders.forEach((s) => {
        const wrap = document.createElement('div');
        const labelRow = document.createElement('div');
        labelRow.className = 'slider-row-head';
        if (!s.optional) labelRow.classList.add('slider-row-head--solo');
        const label = document.createElement('p');
        label.className = 'slider-row-label';
        label.textContent = s.label;
        labelRow.appendChild(label);
        wrap.appendChild(labelRow);

        // A stored `null` means the student already opted out via the
        // toggle below -- show the default on the dial itself (never the
        // literal value "null") while the toggle's own selected/disabled
        // state is what actually remembers the opt-out.
        const storedValue = localStructured[s.key];
        const optedOut = storedValue === null;
        const initial = storedValue !== undefined && storedValue !== null ? storedValue : s.default;
        localStructured[s.key] = optedOut ? null : initial;
        const sliderEl = buildSlider(s, initial, (v) => {
          localStructured[s.key] = v;
        }, step.id + '-' + s.key);
        wrap.appendChild(sliderEl);

        // Optional sliders (e.g. transferable GPA) get a toggle so the
        // student can explicitly opt out instead of just leaving the
        // default value in place, which would otherwise look like a
        // deliberate answer rather than "not applicable".
        if (s.optional) {
          const toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.className = 'slider-optional-toggle';
          toggleBtn.textContent = step.optionalToggle || 'Doesn’t apply to me';
          let isDisabled = optedOut;
          if (isDisabled) {
            toggleBtn.classList.add('selected');
            sliderEl.classList.add('slider-wrap--disabled');
            sliderEl.querySelector('input').disabled = true;
          }
          toggleBtn.addEventListener('click', () => {
            isDisabled = !isDisabled;
            toggleBtn.classList.toggle('selected', isDisabled);
            sliderEl.classList.toggle('slider-wrap--disabled', isDisabled);
            const input = sliderEl.querySelector('input');
            input.disabled = isDisabled;
            localStructured[s.key] = isDisabled ? null : parseFloat(input.value);
          });
          labelRow.appendChild(toggleBtn);
        }

        group.appendChild(wrap);
      });
      fieldContent.appendChild(group);
    }

    if (step.field === 'card-stack') {
      localStructured = Array.isArray(localStructured) ? localStructured : [];
      const cardStack = buildCardStack(step.cardFields, localStructured, refreshContinueState, callbacks.profile, {
        enableTranscriptUpload: Boolean(step.transcriptUpload),
        onTranscriptUpload: callbacks.onTranscriptUpload,
      });
      fieldContent.appendChild(cardStack.wrap);
      transcriptUploadBox = cardStack.uploadBox;
    }

    if (step.field === 'dropdown') {
      localStructured = localStructured || { state: '', name: '', manualEntry: false, school: '' };
      fieldContent.appendChild(buildDropdown(step, localStructured, refreshContinueState));
    }

    if (step.field === 'score-card') {
      localStructured = localStructured || {};
      fieldContent.appendChild(buildScoreCard(step.scoreFields, localStructured));
    }

    // A single splitImage handler for every field type: image on one side,
    // whatever the field rendered above on the other. splitImagePosition
    // controls which side the image lands on ('left' by default, or
    // 'right' to put the field content first via CSS order).
    if (step.splitImage) {
      const split = document.createElement('div');
      split.className = 'question-split';
      if (step.splitImagePosition === 'right') split.classList.add('question-split--reverse');
      if (step.splitWide) split.classList.add('question-split--wide');
      // card-stack needs a fixed 720px column (see .entry-card) that a plain
      // 1fr/1fr grid can't guarantee -- this switches that combo to flex
      // with an explicit basis instead, without touching the grid layout
      // every other splitImage step still relies on.
      if (step.field === 'card-stack') split.classList.add('question-split--card');
      split.classList.add('question-split--step-' + step.id);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'question-split-image';
      const img = document.createElement('img');
      img.src = step.splitImage;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (transcriptUploadBox) {
        // A single wrapped child (stacked column: image, then upload box)
        // keeps imgWrap's own row/anchor sizing (used to grow/position the
        // image on some steps) untouched -- it still only ever sees one item.
        const stack = document.createElement('div');
        stack.className = 'split-image-stack';
        stack.appendChild(img);
        stack.appendChild(transcriptUploadBox);
        imgWrap.appendChild(stack);
      } else {
        imgWrap.appendChild(img);
      }

      split.appendChild(imgWrap);
      split.appendChild(fieldContent);
      body.appendChild(split);
    } else {
      body.appendChild(fieldContent);
    }

    // NOTE: freeform box no longer forces a tall initial height -- it starts
    // compact and grows naturally as the student types (see the 'input'
    // listener below), which keeps short placeholders vertically centered.

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

    const continueIdleLabel = continueBtn.textContent;

    continueBtn.addEventListener('click', async () => {
      const payload = {
        value: localSelection,
        structured: localStructured,
        freeformText: freeformInput.value.trim(),
      };
      // Typed freeform text means onContinue awaits a real /api/chat call
      // before it can decide the next step -- with nothing shown in the
      // meantime this just looks frozen, so show the same "thinking" cue
      // used in the results chat. Skipped entirely when there's no
      // freeform text, since then onContinue resolves synchronously (no
      // network call) and the whole node gets replaced by the next step
      // before this would ever be visible.
      const isLoading = Boolean(payload.freeformText);
      if (isLoading) {
        continueBtn.disabled = true;
        continueBtn.classList.add('is-loading');
        backBtn.disabled = true;
        continueBtn.innerHTML = '';
        const dots = document.createElement('span');
        dots.className = 'chat-typing-dots';
        dots.appendChild(document.createElement('span'));
        dots.appendChild(document.createElement('span'));
        dots.appendChild(document.createElement('span'));
        continueBtn.appendChild(dots);
      }
      await callbacks.onContinue(payload);
      // If onContinue advanced to the next step, this node (and this
      // button) is already detached -- these are then no-ops on a node
      // nobody sees. If it returned early instead (e.g. a blocked/
      // moderated message), this restores the button on the same screen.
      if (isLoading) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('is-loading');
        backBtn.disabled = false;
        continueBtn.textContent = continueIdleLabel;
        refreshContinueState();
      }
    });

    refreshContinueState();
    return node;
  }

  // ---- INFO MODAL (replaces native alert() for in-flow explanations) ----
  function renderInfoModal(title, text) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const icon = document.createElement('img');
    icon.className = 'modal-icon';
    icon.src = 'assets/obee-obelisk-transparent.png';
    icon.alt = '';

    const h = document.createElement('h3');
    h.className = 'modal-title';
    h.textContent = title;

    const p = document.createElement('p');
    p.className = 'modal-text';
    p.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close cta-pill cta-pill--dark';
    closeBtn.textContent = tr('ui.modalGotIt', 'Got it');

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', onKeydown);

    card.appendChild(icon);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return overlay;
  }

  // ---- EMAIL GATE MODAL -- shown every time a results screen finishes
  // loading (whether Claude has a real list or still needs a clarifying
  // answer) and again whenever a follow-up produces a brand new list --
  // each is worth capturing as a lead, so this never remembers a prior
  // submission to skip itself, it only accepts an optional prefill so a
  // student who already typed their email once this session doesn't have
  // to retype it. Unlike renderInfoModal this one has no close button,
  // overlay-click, or Escape dismissal -- it's a required step, not an
  // aside. onSubmit(email) must return a promise; the modal closes once
  // it resolves. ----
  function renderEmailGateModal(onSubmit, prefillEmail) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const icon = document.createElement('img');
    icon.className = 'modal-icon';
    icon.src = 'assets/obee-obelisk-transparent.png';
    icon.alt = '';

    const h = document.createElement('h3');
    h.className = 'modal-title';
    h.textContent = tr('dynamic.emailGateTitle', 'Your results are ready! 🎉');

    const p = document.createElement('p');
    p.className = 'modal-text';
    p.textContent = tr(
      'dynamic.emailGateText',
      'Enter your email to unlock your personalized college list. We’ll send you a copy too, so you never lose it.'
    );

    const form = document.createElement('form');
    form.className = 'modal-email-form';
    form.noValidate = true;

    const inputWrap = document.createElement('div');
    inputWrap.className = 'modal-email-input-wrap';
    const input = document.createElement('input');
    input.type = 'email';
    input.className = 'modal-email-input';
    input.placeholder = tr('dynamic.emailGatePlaceholder', 'you@email.com');
    input.autocomplete = 'email';
    if (prefillEmail) input.value = prefillEmail;
    inputWrap.appendChild(input);

    const error = document.createElement('p');
    error.className = 'modal-email-error';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'modal-email-submit cta-pill cta-pill--dark';
    const idleLabel = tr('dynamic.emailGateButton', 'Unlock my results');
    const loadingLabel = tr('dynamic.emailGateButtonLoading', 'Sending…');
    submitBtn.textContent = idleLabel;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!EMAIL_RE.test(email)) {
        error.textContent = tr('dynamic.emailGateInvalid', 'Please enter a valid email address.');
        return;
      }
      error.textContent = '';
      input.disabled = true;
      submitBtn.disabled = true;
      submitBtn.textContent = loadingLabel;
      Promise.resolve(onSubmit(email)).then(() => {
        overlay.remove();
      });
    });

    form.appendChild(inputWrap);
    form.appendChild(error);
    form.appendChild(submitBtn);

    card.appendChild(icon);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(form);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 50);
    return overlay;
  }


  const VOICE_ERROR_MESSAGES = {
    'not-allowed': 'Microphone access blocked. Check your browser’s site permissions.',
    'service-not-allowed': 'Voice input isn’t available on this connection (needs https).',
    'no-speech': 'Didn’t catch that, try again.',
    'audio-capture': 'No microphone found.',
    network: 'Voice input needs an internet connection.',
    'start-failed': 'Voice input is unavailable right now.',
  };

  function showVoiceError(textarea, errorCode) {
    const original = textarea.placeholder;
    const messages = tr('dynamic.voiceErrors', VOICE_ERROR_MESSAGES);
    const fallback = tr('dynamic.voiceErrorFallback', 'Voice input failed, try again.');
    textarea.placeholder = messages[errorCode] || fallback;
    setTimeout(() => { textarea.placeholder = original; }, 3500);
  }

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
      recognition.lang = navigator.language || 'en-US';
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
      recognition.onerror = (event) => {
        recognizing = false;
        micBtn.classList.remove('mic-active');
        showVoiceError(textarea, event.error);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textarea.value = (textarea.value ? textarea.value.trim() + ' ' : '') + transcript;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      };
      try {
        recognition.start();
      } catch {
        showVoiceError(textarea, 'start-failed');
      }
    });
  }

  // ---- field builders ----
  function buildSlider(cfg, initialValue, onChange, variantKey) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-wrap';
    if (variantKey) wrap.classList.add('slider-wrap--' + variantKey);

    const track = document.createElement('div');
    track.className = 'slider-track';

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'slider-input';
    input.min = cfg.min;
    input.max = cfg.max;
    // The DOM step stays fully continuous ('any') so the thumb tracks the
    // pointer pixel-for-pixel while dragging -- a real step here (e.g. 0.1)
    // makes the browser itself quantize the thumb's position as you drag,
    // which is what reads as choppy/notchy instead of smooth. We snap the
    // reported value to cfg.step ourselves, after the fact, for display and
    // storage only.
    input.step = 'any';
    input.value = initialValue;

    const decimals = (String(cfg.step).split('.')[1] || '').length;
    const snapToStep = (raw) => parseFloat((Math.round(raw / cfg.step) * cfg.step).toFixed(decimals));

    const display = document.createElement('div');
    display.className = 'slider-value-display';
    display.append('Current: ');
    const displayValue = document.createElement('strong');
    displayValue.textContent = initialValue;
    display.appendChild(displayValue);

    // Updating only the <strong>'s textContent (rather than re-parsing the
    // whole row's innerHTML on every 'input' tick) keeps dragging smooth --
    // 'input' fires continuously while the thumb moves, and innerHTML churn
    // on that many events per drag is what made it feel choppy.
    input.addEventListener('input', () => {
      const snapped = snapToStep(parseFloat(input.value));
      displayValue.textContent = snapped;
      onChange(snapped);
    });

    track.appendChild(input);
    wrap.appendChild(track);
    wrap.appendChild(display);
    return wrap;
  }

  // Splits a pasted transcript block into { name, grade } pairs -- one per
  // line, matching a trailing/embedded grade token (A+, B-, C, ... F) and
  // treating the rest of the line as the class name.
  function parseTranscriptBlock(text) {
    // Longest-first: regex alternation picks the first alternative that
    // matches, not the longest, so "A" (bare) must not precede "A-"/"A+".
    const gradeAlternatives = GRADE_OPTIONS.slice()
      .sort((a, b) => b.length - a.length)
      .map((g) => g.replace('+', '\\+'))
      .join('|');
    // Trailing boundary can't be \b: grades ending in +/- are followed by a
    // non-word char (space/EOL), and \b never fires between two non-word
    // positions, so it would silently fall back to matching the bare letter.
    // No 'i' flag: grades are always written uppercase on a transcript, and
    // matching case-insensitively would mistake a stray word like "a" or "b"
    // in free text for a letter grade.
    const gradePattern = new RegExp('\\b(' + gradeAlternatives + ')(?![a-zA-Z0-9])');
    return text
      .split(/\r?\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(gradePattern);
        if (!match) return { name: line, grade: '' };
        const grade = GRADE_OPTIONS.find((g) => g === match[1]) || '';
        const name = (line.slice(0, match.index) + line.slice(match.index + match[0].length))
          .replace(/[\s\-:,–—|]+$/, '')
          .replace(/^[\s\-:,–—|]+/, '')
          .trim();
        return { name: name || line, grade };
      })
      .filter((entry) => entry.name);
  }

  function buildCardStack(fields, entries, onChangeCb, profile, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'card-stack-wrap';

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
    const fieldsRow = document.createElement('div');
    fieldsRow.className = 'entry-fields-row';
    const draft = {};
    const fieldRefs = [];
    // Autocomplete fields (e.g. Class Name) register a refresh function
    // here so a Subject select elsewhere on the same card can re-filter
    // their suggestion list the moment it changes, not just next time the
    // student focuses/types in the autocomplete field.
    const autocompleteRefreshFns = [];
    // The add button always lands inline with whichever field is LAST in
    // the array, instead of a separate footer row below -- keeps the card
    // shorter. collegeChoiceToggleRow is that same idea specialized for
    // college-choice's two-button row; lastFieldAddHost covers every other
    // field type generically.
    let collegeChoiceToggleRow = null;
    let lastFieldAddHost = null;
    const isLastField = (f) => fields[fields.length - 1] === f;

    fields.forEach((f) => {
      // Each field's label + control live in their own column so the card
      // can lay the fields out side by side instead of stacked.
      const fieldWrap = document.createElement('div');
      fieldWrap.className = 'entry-field';

      if (f.label) {
        const label = document.createElement('label');
        label.textContent = f.label;
        fieldWrap.appendChild(label);
      }

      if (f.type === 'select') {
        const select = document.createElement('select');
        if (!f.label) select.setAttribute('aria-label', f.placeholder || f.key);
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = f.placeholder || 'Select...';
        select.appendChild(blank);
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          const isObjectOption = opt && typeof opt === 'object';
          o.value = isObjectOption ? opt.value : opt;
          o.textContent = isObjectOption ? opt.label : opt;
          select.appendChild(o);
        });
        select.addEventListener('change', () => {
          draft[f.key] = select.value;
          if (f.key === 'subject') autocompleteRefreshFns.forEach((refresh) => refresh());
        });
        if (isLastField(f)) {
          const row = document.createElement('div');
          row.className = 'entry-field-inline-row';
          row.appendChild(select);
          fieldWrap.appendChild(row);
          lastFieldAddHost = row;
        } else {
          fieldWrap.appendChild(select);
        }
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

        const subjectFieldIndex = fields.findIndex((ff) => ff.key === 'subject');

        // If a Subject field exists on this card and has a value picked,
        // narrow suggestions down to that subject's courses instead of just
        // reordering by the student's stated major -- picking "Math" should
        // mean the list is actually math courses, not everything with math
        // ones merely bumped to the top.
        function getSuggestionPool() {
          const subjectSelect = subjectFieldIndex !== -1 ? fieldRefs[subjectFieldIndex] : null;
          const subjectCat = subjectSelect && subjectSelect.value ? subjectSelect.value : null;
          if (subjectCat) {
            return f.suggestions.filter((s) => s.cat === subjectCat);
          }
          const majorCat = profile ? guessCategoryFromMajorText(profile.major) : null;
          return majorCat
            ? [...f.suggestions].sort((a, b) => (b.cat === majorCat) - (a.cat === majorCat))
            : f.suggestions;
        }

        function renderSuggestions() {
          const q = (input.value || '').toLowerCase();
          const matches = getSuggestionPool().filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
          listEl.innerHTML = '';
          matches.forEach((m) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = m.name;
            item.addEventListener('mousedown', (e) => {
              e.preventDefault();
              input.value = m.name;
              draft[f.key] = m.name;
              listEl.classList.remove('open');
            });
            listEl.appendChild(item);
          });
          listEl.classList.toggle('open', matches.length > 0);
        }
        autocompleteRefreshFns.push(renderSuggestions);

        input.addEventListener('focus', renderSuggestions);
        input.addEventListener('input', () => {
          draft[f.key] = input.value;
          renderSuggestions();
        });
        input.addEventListener('blur', () => setTimeout(() => listEl.classList.remove('open'), 120));

        // Pasting a whole transcript (multiple lines, or one long block) into
        // the class-name field adds one entry per class instead of dumping
        // it all into a single field -- each line's grade is matched and
        // carried over so nothing has to be re-typed by hand.
        if (f.key === 'name' && fields.some((ff) => ff.key === 'grade')) {
          input.addEventListener('paste', (e) => {
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!text) return;
            const looksLikeBulkPaste = /\n/.test(text) || text.trim().length > 60;
            if (!looksLikeBulkPaste) return;
            e.preventDefault();
            const parsed = parseTranscriptBlock(text);
            if (!parsed.length) return;
            parsed.forEach((p) => {
              const entry = {};
              fields.forEach((ff) => { entry[ff.key] = ''; });
              entry.name = p.name;
              if (p.grade) entry.grade = p.grade;
              entries.push(entry);
            });
            renderList();
            updatePeek();
            onChangeCb();
            input.value = '';
            draft[f.key] = '';
            listEl.classList.remove('open');
          });
        }

        acWrap.appendChild(input);
        acWrap.appendChild(listEl);
        if (isLastField(f)) {
          const row = document.createElement('div');
          row.className = 'entry-field-inline-row';
          row.appendChild(acWrap);
          fieldWrap.appendChild(row);
          lastFieldAddHost = row;
        } else {
          fieldWrap.appendChild(acWrap);
        }
        fieldRefs.push(input);
      } else if (f.type === 'college-choice') {
        const wrap = document.createElement('div');
        wrap.className = 'college-choice-wrap';
        const toggleRow = document.createElement('div');
        toggleRow.className = 'college-choice-toggle';
        collegeChoiceToggleRow = toggleRow;
        const currentBtn = document.createElement('button');
        currentBtn.type = 'button';
        currentBtn.className = 'college-choice-btn';
        currentBtn.textContent = f.currentBtn || 'Current college';
        const previousBtn = document.createElement('button');
        previousBtn.type = 'button';
        previousBtn.className = 'college-choice-btn';
        previousBtn.textContent = f.previousBtn || 'Previous college';

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = f.manualPlaceholder || 'Please write your college here';
        valueInput.style.display = 'none';

        const currentCollegeName =
          profile && profile.community_college && profile.community_college.name
            ? profile.community_college.name
            : '';

        currentBtn.addEventListener('click', () => {
          toggleRow.querySelectorAll('.college-choice-btn').forEach((b) => b.classList.remove('selected'));
          currentBtn.classList.add('selected');
          valueInput.style.display = 'none';
          draft[f.key] = currentCollegeName || '(current college)';
        });
        previousBtn.addEventListener('click', () => {
          toggleRow.querySelectorAll('.college-choice-btn').forEach((b) => b.classList.remove('selected'));
          previousBtn.classList.add('selected');
          valueInput.style.display = 'block';
          valueInput.value = '';
          draft[f.key] = '';
          valueInput.focus();
        });
        valueInput.addEventListener('input', () => {
          draft[f.key] = valueInput.value;
        });

        toggleRow.appendChild(currentBtn);
        toggleRow.appendChild(previousBtn);
        wrap.appendChild(toggleRow);
        wrap.appendChild(valueInput);
        fieldWrap.appendChild(wrap);
        fieldRefs.push({
          get value() {
            return draft[f.key] || '';
          },
          set value(v) {
            draft[f.key] = v;
            valueInput.value = '';
            toggleRow.querySelectorAll('.college-choice-btn').forEach((b) => b.classList.remove('selected'));
          },
        });
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = f.placeholder || '';
        input.addEventListener('input', () => {
          draft[f.key] = input.value;
        });
        if (isLastField(f)) {
          const row = document.createElement('div');
          row.className = 'entry-field-inline-row';
          row.appendChild(input);
          fieldWrap.appendChild(row);
          lastFieldAddHost = row;
        } else {
          fieldWrap.appendChild(input);
        }
        fieldRefs.push(input);
      }

      fieldsRow.appendChild(fieldWrap);
    });
    card.appendChild(fieldsRow);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-entry-btn';
    addBtn.type = 'button';
    addBtn.textContent = 'Click here to add class';
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

    const lastField = fields[fields.length - 1];
    if (lastField && lastField.type === 'college-choice' && collegeChoiceToggleRow) {
      collegeChoiceToggleRow.appendChild(addBtn);
    } else if (lastFieldAddHost) {
      lastFieldAddHost.appendChild(addBtn);
    } else {
      const cardFooter = document.createElement('div');
      cardFooter.className = 'entry-card-footer';
      cardFooter.appendChild(addBtn);
      card.appendChild(cardFooter);
    }

    stackWrap.appendChild(peek2);
    stackWrap.appendChild(peek1);
    stackWrap.appendChild(card);
    updatePeek();

    wrap.appendChild(list);
    wrap.appendChild(stackWrap);

    let uploadBox = null;
    if (opts.enableTranscriptUpload && opts.onTranscriptUpload) {
      uploadBox = buildTranscriptUploadBox(fields, entries, { renderList, updatePeek, onChangeCb }, opts.onTranscriptUpload);
    }

    return { wrap, uploadBox };
  }

  const TRANSCRIPT_MAX_BYTES = 8 * 1024 * 1024; // 8MB raw file, matches the server-side cap

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  // The "Upload your transcript" box that sits under Obee on cc_courses:
  // reads the file client-side, sends it to the backend for Claude to read,
  // then feeds whatever courses it finds back into this same card-stack's
  // entries array -- same renderList/updatePeek/onChangeCb the "+" button uses.
  function buildTranscriptUploadBox(fields, entries, { renderList, updatePeek, onChangeCb }, onTranscriptUpload) {
    const box = document.createElement('div');
    box.className = 'transcript-upload-box';

    const caption = document.createElement('p');
    caption.className = 'transcript-upload-caption';
    caption.textContent = tr('ui.transcriptUploadCaption', 'To make it faster, you can upload your transcript here');
    box.appendChild(caption);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,application/pdf';
    input.className = 'transcript-upload-input';
    input.setAttribute('aria-label', 'Upload transcript file');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'transcript-upload-btn';
    btn.textContent = tr('ui.transcriptUploadBtn', 'Upload');
    btn.addEventListener('click', () => input.click());

    const status = document.createElement('p');
    status.className = 'transcript-upload-status';

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = 'transcript-upload-status' + (kind ? ' transcript-upload-status--' + kind : '');
    }

    function normalizeGrade(raw) {
      if (!raw) return '';
      const match = (typeof GRADE_OPTIONS !== 'undefined' ? GRADE_OPTIONS : []).find(
        (g) => g.toLowerCase() === String(raw).trim().toLowerCase()
      );
      return match || '';
    }

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (file.size > TRANSCRIPT_MAX_BYTES) {
        setStatus(tr('ui.transcriptUploadTooBig', "That file is too large, please upload something under 8MB."), 'error');
        input.value = '';
        return;
      }

      btn.disabled = true;
      setStatus(tr('ui.transcriptUploadAnalyzing', 'Reading your transcript…'), 'loading');

      try {
        const base64 = await fileToBase64(file);
        const result = await onTranscriptUpload(base64, file.type || 'application/octet-stream');

        if (!result || result.error || result.readable === false) {
          setStatus(
            tr('ui.transcriptUploadUnreadable', "Obee couldn't read that file clearly, try a clearer photo or add courses manually."),
            'error'
          );
          return;
        }

        const courses = Array.isArray(result.courses) ? result.courses : [];
        if (!courses.length) {
          setStatus(
            tr('ui.transcriptUploadEmpty', "Obee couldn't find any courses in that file, try a clearer photo or add them manually."),
            'error'
          );
          return;
        }

        courses.forEach((c) => {
          const entry = {};
          fields.forEach((f) => { entry[f.key] = ''; });
          entry.name = (c.name || '').toString().trim();
          if ('grade' in entry) entry.grade = normalizeGrade(c.grade);
          if ('units' in entry && c.units) entry.units = String(c.units).trim();
          if (entry.name) entries.push(entry);
        });

        renderList();
        updatePeek();
        onChangeCb();
        setStatus(tr('ui.transcriptUploadSuccess', 'Added {n} course(s) from your transcript.').replace('{n}', courses.length), 'success');
      } catch (err) {
        console.error('Transcript upload failed', err);
        setStatus(tr('ui.transcriptUploadError', 'Something went wrong reading that file. Please try again.'), 'error');
      } finally {
        btn.disabled = false;
        input.value = '';
      }
    });

    box.appendChild(btn);
    box.appendChild(input);
    box.appendChild(status);
    return box;
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
      const districtZone = document.createElement('div');
      districtZone.className = 'district-zone';

      // Optional, unlike the college cascade below -- most states have no
      // district in a top-129-by-enrollment list, so this can't gate
      // Continue the way state/school do. Re-rendered on every state change.
      function renderDistrictZone() {
        districtZone.innerHTML = '';
        if (!step.includeDistrictField || !structured.state) return;
        const districts = HIGH_SCHOOL_DISTRICTS_BY_STATE[structured.state];

        if (districts && districts.length && !structured.districtManualEntry) {
          const row = document.createElement('div');
          row.className = 'dropdown-row dropdown-row--single';
          const select = document.createElement('select');
          select.className = 'district-select';
          const blank = document.createElement('option');
          blank.value = '';
          blank.textContent = step.districtFieldLabel || 'Select your district';
          select.appendChild(blank);
          districts.forEach((d) => {
            const o = document.createElement('option');
            o.value = d;
            o.textContent = d;
            if (structured.district === d) o.selected = true;
            select.appendChild(o);
          });
          select.addEventListener('change', () => {
            structured.district = select.value;
            onChangeCb();
          });
          row.appendChild(select);
          districtZone.appendChild(row);

          const manualLink = document.createElement('button');
          manualLink.type = 'button';
          manualLink.className = 'manual-entry-link';
          manualLink.innerHTML = 'Don’t see your district? <span class="manual-entry-underline">Enter manually</span>';
          manualLink.addEventListener('click', () => {
            structured.districtManualEntry = true;
            structured.district = '';
            renderDistrictZone();
            onChangeCb();
          });
          districtZone.appendChild(manualLink);
        } else {
          const row = document.createElement('div');
          row.className = 'dropdown-row dropdown-row--single';
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Your school district (optional)';
          input.value = structured.district || '';
          input.addEventListener('input', () => {
            structured.district = input.value;
            onChangeCb();
          });
          row.appendChild(input);
          districtZone.appendChild(row);

          if (districts && districts.length) {
            const backLink = document.createElement('button');
            backLink.type = 'button';
            backLink.className = 'manual-entry-link';
            backLink.textContent = 'Back to the list';
            backLink.addEventListener('click', () => {
              structured.districtManualEntry = false;
              structured.district = '';
              renderDistrictZone();
              onChangeCb();
            });
            districtZone.appendChild(backLink);
          }
        }
      }

      const row = document.createElement('div');
      row.className = 'dropdown-row dropdown-row--single';
      const select = buildStateSelect((val) => {
        structured.state = val;
        structured.name = '';
        structured.district = '';
        structured.districtManualEntry = false;
        renderDistrictZone();
        onChangeCb();
      });
      row.appendChild(select);
      wrap.appendChild(row);
      wrap.appendChild(districtZone);
      renderDistrictZone();

      if (step.includeSchoolField) {
        const schoolRow = document.createElement('div');
        schoolRow.className = 'dropdown-row dropdown-row--single';
        const schoolInput = document.createElement('input');
        schoolInput.type = 'text';
        schoolInput.placeholder = step.schoolFieldLabel || 'Your school name';
        schoolInput.value = structured.school || '';
        schoolInput.addEventListener('input', () => {
          structured.school = schoolInput.value;
          onChangeCb();
        });
        schoolRow.appendChild(schoolInput);
        wrap.appendChild(schoolRow);
      }
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
        manualLink.innerHTML = 'Don’t see your college? <span class="manual-entry-underline">Enter manually</span>';
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
          backLink.textContent = 'Back to the list';
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
          note.textContent = "We don't have a preset list for this state yet, just type your college's name above.";
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

  // Types plain text out character by character with a blinking cursor,
  // the same effect used for the home page's hero quote (see
  // typewriterHeroQuote) -- factored out since this one has no bold/regular
  // split to worry about, just a single text node.
  function typewriterText(el, speed = 41) {
    if (!el) return;
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    (function tick() {
      i++;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        setTimeout(tick, speed);
      } else {
        el.classList.remove('typing');
      }
    })();
  }

  // ---- RESULTS SCREEN ----
  function renderResults(data, onSendFollowup, onResendEmail) {
    const node = mountTemplate('tpl-results');
    const body = node.querySelector('.results-body');
    const messagesEl = node.querySelector('.results-chat-messages');
    let currentData = data;

    // Chrome only -- the recommendation content itself comes from the API,
    // which always answers in English regardless of the UI language.
    const resultsTitleEl = node.querySelector('.results-header h2');
    if (resultsTitleEl) {
      resultsTitleEl.textContent = tr('ui.resultsHeader', resultsTitleEl.textContent);
      typewriterText(resultsTitleEl);
    }
    setText(node, '.js-copy-link', tr('ui.copyLink', null));
    setText(node, '.js-resend-email', tr('ui.resendEmail', null));
    setText(node, '.js-download-pdf', tr('ui.downloadPdf', null));
    const disclaimerEl = node.querySelector('.results-disclaimer');
    if (disclaimerEl) disclaimerEl.textContent = tr('ui.resultsDisclaimer', disclaimerEl.textContent);
    const followupInput = node.querySelector('.results-chat-input');
    if (followupInput) followupInput.placeholder = tr('ui.followupPlaceholder', followupInput.placeholder);

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
          if (s.basis) {
            const source = document.createElement('div');
            const isVerified = s.basis === 'verified';
            source.className = 'school-source ' + (isVerified ? 'school-source--verified' : 'school-source--general');
            const label = isVerified ? '✓ Verified' : 'ⓘ General estimate';
            source.textContent = s.source ? `${label} — ${s.source}` : label;
            card.appendChild(source);
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
      prompt.textContent = 'I need a bit more information to give you my best advice, see my question below.';
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
      input.disabled = true;
      sendBtn.disabled = true;
      const typing = appendTypingIndicator(messagesEl);
      onSendFollowup(text, (replyData) => {
        typing.remove();
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
        if (replyData.mode === 'recommendation') {
          currentData = replyData;
          paintRecommendation(replyData);
        }
        if (replyData.message) appendChatMsg(messagesEl, 'ai', replyData.message);
      });
    }

    sendBtn.addEventListener('click', send);

    const copyLinkBtn = node.querySelector('.js-copy-link');
    const downloadPdfBtn = node.querySelector('.js-download-pdf');

    copyLinkBtn.addEventListener('click', async () => {
      const encoded = encodeShareData(currentData);
      if (!encoded) return;
      const url = `${location.origin}${location.pathname}?r=${encoded}`;
      const originalLabel = copyLinkBtn.textContent;
      try {
        await navigator.clipboard.writeText(url);
        copyLinkBtn.textContent = '✅ Copied!';
      } catch {
        window.prompt('Copy this link:', url);
      }
      setTimeout(() => { copyLinkBtn.textContent = originalLabel; }, 1800);
    });

    downloadPdfBtn.addEventListener('click', () => window.print());

    const resendEmailBtn = node.querySelector('.js-resend-email');
    if (resendEmailBtn && onResendEmail) {
      resendEmailBtn.addEventListener('click', async () => {
        const originalLabel = resendEmailBtn.textContent;
        resendEmailBtn.disabled = true;
        resendEmailBtn.textContent = tr('ui.resendEmailSending', 'Sending…');
        try {
          const result = await onResendEmail(currentData);
          resendEmailBtn.textContent = result && result.ok
            ? tr('ui.resendEmailSent', '✅ Sent!')
            : tr('ui.resendEmailNoAddress', 'No email on file yet');
        } catch {
          resendEmailBtn.textContent = tr('ui.resendEmailFailed', '⚠️ Failed, try again');
        }
        setTimeout(() => {
          resendEmailBtn.textContent = originalLabel;
          resendEmailBtn.disabled = false;
        }, 2200);
      });
    }

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
    // Always scrolling to the bottom meant the very first message in a
    // fresh chat (often the longest -- a full clarifying paragraph) opened
    // showing its own END instead of its start whenever it was taller than
    // the container, which is common once it wraps into more lines on a
    // narrow screen. Only auto-scroll-to-bottom from the second message on;
    // the first should open readable from the top like any other message.
    container.scrollTop = container.children.length === 1 ? 0 : container.scrollHeight;
  }

  // ---- Follow-up chat message cap -- app.js owns the actual count (it
  // persists in state.turnCount), this just locks the input once told to,
  // whether that's right after the reply that hit the cap or immediately
  // on mount if a reloaded session was already there. ----
  function disableFollowupChat(message) {
    const messagesEl = document.querySelector('.results-chat-messages');
    const input = document.querySelector('.results-chat-input');
    const sendBtn = document.querySelector('.send-btn');
    if (!input || !sendBtn) return;
    if (messagesEl) appendChatMsg(messagesEl, 'ai', message);
    input.disabled = true;
    input.value = '';
    input.placeholder = message;
    sendBtn.disabled = true;
  }

  function appendTypingIndicator(container) {
    const div = document.createElement('div');
    div.className = 'chat-msg ai chat-typing';
    const label = document.createElement('span');
    label.textContent = tr('ui.thinkingLabel', 'Thinking...').replace(/\.\.\.$/, '');
    const dots = document.createElement('span');
    dots.className = 'chat-typing-dots';
    dots.appendChild(document.createElement('span'));
    dots.appendChild(document.createElement('span'));
    dots.appendChild(document.createElement('span'));
    div.appendChild(label);
    div.appendChild(dots);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  return {
    init,
    renderHome,
    renderThinking,
    renderQuestion,
    renderResults,
    renderLimitReached,
    renderInfoModal,
    renderEmailGateModal,
    disableFollowupChat,
    encodeShareData,
    decodeShareData,
    getLang,
  };
})();
