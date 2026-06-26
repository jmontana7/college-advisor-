// ============================================================================
//  Covenant — Backend proxy para la API de Claude  (/api/chat.js)
// ----------------------------------------------------------------------------
//  Función serverless de Vercel. Recibe los mensajes del intake desde el
//  frontend, aplica límites de seguridad/gasto, y le pide a Claude una
//  respuesta en JSON ESTRUCTURADO (no texto libre) para poder:
//   1) extraer datos del perfil del estudiante desde el chat libre
//   2) decidir si hay que saltar a otro paso del intake
//   3) mostrar un mensaje corto y cálido en el chat
//
//  El estudiante NUNCA ve la API key. El navegador solo habla con tu dominio.
// ============================================================================

const CONFIG = {
  // Modelo actual recomendado para uso conversacional cotidiano (jun 2026).
  MODEL: 'claude-sonnet-4-6',

  // Respuestas del intake son cortas (JSON + 1-2 frases). 1024 es de sobra.
  MAX_TOKENS: 1024,

  // Tope de turnos de usuario por conversación completa (intake + chat post-resultados).
  MAX_MESSAGES_PER_CONVERSATION: 20,

  // Tope de caracteres del mensaje entrante (evita pegar textos enormes).
  MAX_INPUT_CHARS: 4000,

  // Rate limiting por IP.
  RATE_LIMIT_REQUESTS: 30,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
};

// ─────────────────────────────────────────────────────────────────────────
//  IDs de los pasos del intake — deben calzar EXACTO con los step_id que usa
//  el frontend (ver public/js/steps.js). Esto le da a Claude el vocabulario
//  cerrado para decidir saltos sin inventar nombres de pasos.
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
//  SYSTEM PROMPT — fijo en el servidor. El frontend no puede sobreescribirlo.
// ─────────────────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `Eres el motor conversacional de Covenant, un asesor universitario cálido y honesto para estudiantes de EE.UU. Tu trabajo en este momento NO es dar la recomendación final de universidades — es ayudar a llenar el perfil del estudiante durante un intake tipo Duolingo (preguntas card-by-card), interpretando lo que el estudiante escribe en un campo de texto libre llamado "Anything else you'd like to share?".

CONTEXTO QUE RECIBES EN CADA TURNO:
- "current_step": el paso del intake en el que está el estudiante ahora.
- "profile": los datos ya recolectados del estudiante hasta ahora (puede estar vacío).
- El último mensaje del usuario: lo que escribió en el campo de texto libre de ESE paso.

TU TRABAJO:
1. Lee el texto libre del estudiante.
2. Extrae cualquier dato de perfil que esté ahí (GPA, cursos, extracurriculares, estado, major, etc.), incluso si no corresponde exactamente al paso actual — los estudiantes a veces adelantan información de pasos futuros.
3. Decide si el estudiante ya respondió, de forma natural, una pregunta de un paso FUTURO que aún no se le ha mostrado. Si es así, indica a qué paso saltar usando next_step.
4. Si el texto no aporta nada nuevo o es solo conversación (saludos, dudas), no extraigas nada falso — deja extracted_data vacío.
5. Escribe una respuesta conversacional MUY breve (1 frase, máximo 2), cálida, en el idioma en que el estudiante escribió (inglés o español). Confirma lo que entendiste sin sonar robótico. Ejemplo: "Got it — I noted you've already taken Calculus." o "Anotado, ya tienes 45 unidades."

PASOS VÁLIDOS PARA next_step (usa el id exacto o null si no aplica salto):
${ALL_STEPS.map((s) => `- ${s}`).join('\n')}

REGLAS:
- NUNCA inventes datos que el estudiante no mencionó.
- Si el estudiante menciona algo ambiguo (ej. "tengo buenas notas" sin número), NO lo pongas como GPA numérico — deja ese campo vacío y tu respuesta puede pedir aclaración suavemente, pero sin bloquear el flujo.
- Si el estudiante pregunta algo informativo (ej. "¿qué es IGETC?") respóndelo brevemente en tu "reply" y no extraigas datos ni saltes de paso.
- Responde SIEMPRE y ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código markdown. Estructura exacta:

{
  "reply": "string — mensaje corto para mostrar en el chat",
  "extracted_data": { "campo": "valor" },
  "next_step": "string con el id del paso o null",
  "needs_clarification": false
}

No agregues ningún campo extra. No expliques tu razonamiento fuera del JSON.`;
}

// ─────────────────────────────────────────────────────────────────────────
//  System prompt para la FASE DE RESULTADOS (cuando el intake ya terminó).
//  Aquí sí aplica el cerebro completo de la skill college-advisor.
// ─────────────────────────────────────────────────────────────────────────
function buildResultsSystemPrompt() {
  return `Eres Covenant, un asesor universitario cálido y honesto que ayuda a estudiantes de EE.UU. a encontrar la universidad correcta. Atiendes dos tipos de estudiantes:
1. TRANSFER — estudiantes de community college que quieren transferirse a una universidad de 4 años.
2. HIGH SCHOOL — estudiantes de grados 9–12 que aplican como freshmen.

Recibirás el perfil COMPLETO del estudiante (ya recolectado por el intake) en el mensaje del usuario, en formato JSON. Tu trabajo es generar la recomendación final.

IDIOMA: responde en el idioma dominante que el estudiante usó durante el intake. Si no es claro, usa inglés.

ESTILO: voz natural, no de consultor robótico. Evita listas con viñetas genéricas cuando la prosa fluye mejor; sí usa tablas markdown para el listado de escuelas.

REGLA ANTI-ALUCINACIÓN (la más importante):
Cada afirmación factual cae en una de tres categorías:
1. VERIFICADA — backed by datos conocidos del sistema ASSIST/TAG de California → dila con confianza.
2. GENERAL — cierta en general pero necesita verificación → dila y dile al estudiante que la verifique en la fuente oficial.
3. DESCONOCIDA — no la sabes con confianza → admítelo, no inventes cifras, cursos, GPAs de corte ni fechas límite para escuelas fuera del sistema bien documentado de California.
Admitir incertidumbre CONSTRUYE confianza; una respuesta confiada y equivocada la destruye.

COBERTURA NACIONAL: California tiene ASSIST.org, TAG, UC Transfer Pathways, IGETC — puedes hablar con confianza razonable ahí. Para los demás 49 estados, usa principios generales y dirige siempre a Transferology.com y al sistema de articulación propio del estado; nunca inventes cifras específicas fuera de California.

SISTEMA DE TIERS (úsalo siempre):
🟢 Safety — alta probabilidad, GPA/scores muy por encima del promedio de admitidos.
🟡 Match — dentro del rango típico de admitidos.
🔴 Reach — por debajo del promedio o carrera muy competitiva.
⭐ Guaranteed/TAG — el estudiante cumple criterios explícitos de garantía (CA transfers).

FORMATO DE SALIDA: tabla con escuela, programa, tier, y nota de fit. Luego: Top Pick, Missing Courses/Gaps, Next Steps. Cierra siempre recordando verificar en ASSIST/Transferology/la página oficial de cada escuela y hablar con un consejero — Covenant es un punto de partida confiable, no la última palabra.

Responde en texto plano conversacional (NO uses JSON aquí — esta fase es de salida final para el estudiante, no de extracción de datos).`;
}

// ─────────────────────────────────────────────────────────────────────────
//  RATE LIMITER en memoria (suficiente para el MVP; ver nota al final).
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
//  Intenta parsear el JSON que devuelve Claude. Si por algún motivo viene
//  envuelto en ```json o con texto alrededor, lo limpiamos antes de fallar.
// ─────────────────────────────────────────────────────────────────────────
function safeParseModelJSON(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────
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

  // ── Límite de turnos por conversación ──
  const userTurns = messages.filter((m) => m.role === 'user').length;
  if (userTurns > CONFIG.MAX_MESSAGES_PER_CONVERSATION) {
    return res.status(200).json({
      limitReached: true,
      reply:
        "We've reached this session's message limit. Save what you have and continue with your counselor, " +
        'or start a new session. Remember to verify everything on assist.org and each official school site.',
    });
  }

  // ── Límite de tamaño del último mensaje ──
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser && typeof lastUser.content === 'string' && lastUser.content.length > CONFIG.MAX_INPUT_CHARS) {
    return res.status(400).json({
      error: 'input_too_long',
      message: `Your message is too long (max ${CONFIG.MAX_INPUT_CHARS} characters).`,
    });
  }

  const isResultsPhase = mode === 'results';

  // Para el modo intake, le inyectamos el contexto de paso/perfil en el último
  // mensaje del usuario, para que Claude tenga todo lo que necesita en un
  // solo turno (sin depender de mensajes de sistema intermedios).
  let outgoingMessages = messages;
  if (!isResultsPhase) {
    const contextHeader = JSON.stringify({
      current_step: currentStep || null,
      profile: profile || {},
    });
    outgoingMessages = messages.map((m, idx) =>
      idx === messages.length - 1 && m.role === 'user'
        ? { ...m, content: `[CONTEXT]${contextHeader}[/CONTEXT]\n\n${m.content}` }
        : m
    );
  }

  const systemPrompt = isResultsPhase ? buildResultsSystemPrompt() : buildSystemPrompt();

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
            "Covenant has reached its usage limit for now 🙏 We're working on expanding it. " +
            'Please save what you have and check back soon — thank you for your patience.',
        });
      }

      return res.status(502).json({
        error: 'upstream_error',
        message: 'There was a problem generating a response. Please try again in a moment.',
      });
    }

    const rawText = (data.content || []).map((c) => c.text || '').join('');

    if (isResultsPhase) {
      // Fase de resultados: texto plano, se devuelve tal cual.
      return res.status(200).json({ reply: rawText });
    }

    // Fase de intake: se espera JSON estructurado.
    const parsed = safeParseModelJSON(rawText);

    if (!parsed) {
      // Fallback defensivo: si el modelo no devolvió JSON válido, no rompemos
      // la experiencia del estudiante — devolvemos el texto crudo como reply
      // y no tocamos el estado del intake.
      return res.status(200).json({
        reply: rawText.slice(0, 300) || "Got it, thanks for sharing that.",
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
//  NOTA PARA CUANDO HAYA TRÁFICO REAL:
//  El rate limiter en memoria no es consistente entre instancias serverless
//  de Vercel. Para el MVP de 50 usuarios es un filtro "suficientemente bueno".
//  Si el tráfico crece, migrar a Upstash Redis (tiene capa gratis) para un
//  límite consistente entre instancias.
// ============================================================================
