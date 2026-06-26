<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Covenant — Find Your Path</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montaga&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/main.css">
</head>
<body>

<!-- ============ HEADER (persistente en todas las pantallas del intake) ============ -->
<header id="app-header">
  <div class="logo">
    <span class="logo-mark">🪐</span>
  </div>
  <button class="tools-btn" id="tools-btn" type="button">
    Tools <span class="caret">▾</span>
  </button>
  <button class="cta-pill" id="header-cta" type="button">Find your path</button>
</header>

<!-- ============ MAIN APP ROOT — todo se renderiza aquí vía JS ============ -->
<main id="app-root"></main>

<!-- ============ TEMPLATES (clonados por el motor de pasos) ============ -->

<template id="tpl-home">
  <section class="screen home-screen">
    <p class="eyebrow">✦ Powered by Claude AI</p>
    <h1>Find your <em>perfect</em><br>college match</h1>
    <p class="hero-sub">Helping high school and community college students find their perfect university match.</p>
    <blockquote class="mandela-quote">
      "Education is the most powerful weapon which you can use to change the world"
      <cite>— Nelson Mandela</cite>
    </blockquote>
    <button class="cta-pill cta-pill--lg" id="home-find-path" type="button">Find your path</button>
  </section>
</template>

<template id="tpl-question-screen">
  <section class="screen question-screen">
    <div class="question-header">
      <h2 class="question-title"></h2>
      <p class="question-sub"></p>
    </div>
    <div class="question-body"></div>
    <div class="freeform-dock">
      <div class="freeform-box">
        <textarea class="freeform-input" rows="1" placeholder="Anything else you'd like to share?"></textarea>
        <button class="mic-btn" type="button" aria-label="Voice input">🎙️</button>
      </div>
    </div>
    <div class="nav-row">
      <button class="back-btn" type="button">← Back</button>
      <button class="skip-link" type="button" style="display:none;">Skip</button>
      <button class="continue-btn" type="button" disabled>Continue →</button>
    </div>
  </section>
</template>

<template id="tpl-thinking">
  <section class="screen thinking-screen">
    <div class="thinking-ring"></div>
    <p class="thinking-label">Thinking...</p>
  </section>
</template>

<template id="tpl-results">
  <section class="screen results-screen">
    <div class="results-header">
      <p class="eyebrow">✦ Your matches</p>
      <h2>Here's your college list</h2>
    </div>
    <div class="results-body"></div>
    <div class="results-disclaimer">
      Always verify on <strong>assist.org</strong> and each school's official site. Talk to your counselor before making final decisions.
    </div>
    <div class="results-chat-dock">
      <div class="results-chat-messages"></div>
      <div class="freeform-box">
        <textarea class="results-chat-input" rows="1" placeholder="Ask a follow-up question..."></textarea>
        <button class="send-btn" type="button" aria-label="Send">➤</button>
      </div>
    </div>
  </section>
</template>

<template id="tpl-limit-reached">
  <section class="screen limit-screen">
    <p class="limit-icon">🌙</p>
    <h2>Covenant reached its limit</h2>
    <p class="limit-message"></p>
  </section>
</template>

<!-- Card option button template (used inside question screens) -->
<template id="tpl-option-btn">
  <button class="opt-btn" type="button"></button>
</template>

<script src="js/steps.js"></script>
<script src="js/engine.js"></script>
<script src="js/app.js"></script>
</body>
</html>
