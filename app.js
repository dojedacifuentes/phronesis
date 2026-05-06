(() => {
  const D = window.PHRONESIS_DATA;
  const STORAGE_KEY = "phronesis-pucv-state-v1";
  const app = document.getElementById("app");
  const toast = document.getElementById("toast");

  let deferredInstallPrompt = null;
  let toastTimer = null;

  const defaultState = {
    visited: ["dashboard"],
    learned: [],
    flashIndex: 0,
    flashFlipped: false,
    flashFilter: "Todas",
    quiz: { index: 0, score: 0, answered: false, selected: null, completed: false, best: 0 },
    lawStatement: "",
    lawAnalysis: null,
    classicAuthor: "platon",
    radbruchLevel: 42,
    dworkinCase: "elmer",
    dworkinPrinciples: [],
    rawlsChoice: "",
    rawlsRisk: 50,
    rawlsInequality: 50,
    tutorMessages: [],
    glossarySearch: "",
    oralIndex: 0,
    oralPracticed: []
  };

  let state = loadState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return mergeState(defaultState, saved || {});
    } catch (error) {
      return clone(defaultState);
    }
  }

  function mergeState(base, saved) {
    const merged = clone(base);
    Object.keys(saved).forEach((key) => {
      if (saved[key] && typeof saved[key] === "object" && !Array.isArray(saved[key]) && merged[key]) {
        merged[key] = { ...merged[key], ...saved[key] };
      } else {
        merged[key] = saved[key];
      }
    });
    return merged;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("No se pudo guardar progreso local en este navegador.");
    }
  }

  function icon(name) {
    return `<i data-lucide="${name}" aria-hidden="true"></i>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentView() {
    const requested = window.location.hash.replace("#", "") || "dashboard";
    return D.nav.some((item) => item.id === requested) ? requested : "dashboard";
  }

  function setRoute(id) {
    window.location.hash = id;
  }

  function markVisited(id) {
    if (!state.visited.includes(id)) {
      state.visited.push(id);
      saveState();
    }
  }

  function progressStats() {
    const learned = state.learned.length;
    const cardPct = D.flashcards.length ? learned / D.flashcards.length : 0;
    const quizBest = Math.max(state.quiz.best || 0, state.quiz.score || 0);
    const quizPct = D.quiz.length ? quizBest / D.quiz.length : 0;
    const required = D.nav.map((item) => item.id);
    const visitedPct = required.filter((id) => state.visited.includes(id)).length / required.length;
    const oralPct = D.oralExam.length ? state.oralPracticed.length / D.oralExam.length : 0;
    const total = Math.round((cardPct * 0.35 + quizPct * 0.3 + visitedPct * 0.25 + oralPct * 0.1) * 100);

    return {
      total,
      learned,
      cards: D.flashcards.length,
      quizBest,
      quizTotal: D.quiz.length,
      visited: state.visited.length,
      required: required.length,
      oral: state.oralPracticed.length
    };
  }

  function createNav() {
    const top = document.querySelector(".top-nav");
    const bottom = document.querySelector(".bottom-nav");
    const active = currentView();
    top.innerHTML = D.nav.map((item) => navButton(item, active)).join("");
    bottom.innerHTML = D.nav
      .filter((item) => ["dashboard", "mapa", "flashcards", "quiz", "oral"].includes(item.id))
      .map((item) => navButton(item, active))
      .join("");
  }

  function navButton(item, active) {
    return `
      <button class="nav-button ${item.id === active ? "active" : ""}" type="button" data-route="${item.id}">
        ${icon(item.icon)}
        <span>${escapeHtml(item.label)}</span>
      </button>
    `;
  }

  function render() {
    const view = currentView();
    markVisited(view);
    createNav();

    const views = {
      dashboard: renderDashboard,
      mapa: renderCourseMap,
      "filosofia-ciencia": renderPhilosophyScience,
      "justicia-clasica": renderClassicalJustice,
      radbruch: renderRadbruch,
      "positivismo-principios": renderPositivism,
      "tribunal-dworkin": renderDworkinCourt,
      rawls: renderRawlsLab,
      flashcards: renderFlashcards,
      quiz: renderQuiz,
      tutor: renderTutor,
      glosario: renderGlossary,
      oral: renderOralExam
    };

    app.innerHTML = views[view]();
    app.focus({ preventScroll: true });
    bindView(view);
    refreshIcons();
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
    }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function pageTitle(title, text, eyebrow = "Phronesis PUCV") {
    return `
      <section class="page-title">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(text)}</p>
      </section>
    `;
  }

  function renderDashboard() {
    const p = progressStats();
    const ring = Math.round(p.total * 3.6);

    return `
      <section class="view">
        <div class="hero">
          <div class="hero-grid">
            <div>
              <div class="eyebrow">Curso de Filosofía del Derecho y Teorías de la Justicia</div>
              <h1>Phronesis <span>-</span> Filosofía del Derecho PUCV</h1>
              <p class="hero-copy">Plataforma de estudio exhaustivo para preparar examen oral y examen de grado: autores clásicos, positivismo, principios, justicia contemporánea, flashcards, quiz y entrenamiento socrático local.</p>
              <div class="hero-actions">
                <button class="button primary" type="button" data-route="oral">${icon("mic")}Modo examen oral</button>
                <button class="button" type="button" data-route="flashcards">${icon("copy")}Repasar flashcards</button>
                <button class="button teal" type="button" id="installApp">${icon("download")}Instalar app</button>
              </div>
            </div>
            <aside class="hero-panel" aria-label="Progreso general">
              <div class="progress-ring" style="--value:${ring}deg">
                <div class="progress-ring-inner">
                  <div>
                    <strong>${p.total}%</strong>
                    <small>avance global</small>
                  </div>
                </div>
              </div>
              <div class="stats-grid">
                <div class="stat"><strong>${p.learned}</strong><span>tarjetas</span></div>
                <div class="stat"><strong>${p.quizBest}</strong><span>mejor quiz</span></div>
                <div class="stat"><strong>${p.visited}</strong><span>vistas</span></div>
              </div>
            </aside>
          </div>
        </div>

        <div class="quick-grid">
          ${quickLink("filosofia-ciencia", "microscope", "Analizador", "Ciencia positiva vs pregunta filosófica")}
          ${quickLink("radbruch", "scale", "Balanza", "Seguridad, justicia y utilidad")}
          ${quickLink("tribunal-dworkin", "landmark", "Tribunal", "Casos difíciles por principios")}
          ${quickLink("quiz", "badge-check", "Quiz de grado", "Preguntas cruzadas con feedback")}
        </div>

        <div class="section-head">
          <div>
            <h2>Módulos de estudio</h2>
            <p>Una ruta compacta para dominar el curso: de la distinción filosofía-ciencia a Rawls, Dworkin y el examen oral.</p>
          </div>
          <button class="button danger" type="button" data-action="reset-progress">${icon("rotate-ccw")}Reiniciar progreso</button>
        </div>

        <div class="module-grid">
          ${D.modules.map((module) => moduleCard(module)).join("")}
        </div>
      </section>
    `;
  }

  function quickLink(route, iconName, title, text) {
    return `
      <a class="quick-link" href="#${route}">
        <span class="icon-tile teal">${icon(iconName)}</span>
        <span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></span>
      </a>
    `;
  }

  function moduleCard(module) {
    const done = state.visited.includes(module.id);
    return `
      <article class="card">
        <div class="pill-row">
          <span class="badge ${done ? "teal" : "gold"}">${done ? "Visitado" : module.level}</span>
          <span class="badge">${module.minutes} min</span>
        </div>
        <h3>${escapeHtml(module.title)}</h3>
        <p>${module.tags.map(escapeHtml).join(" · ")}</p>
        <button class="button" type="button" data-route="${module.id}">${icon("arrow-right")}Entrar</button>
      </article>
    `;
  }

  function renderCourseMap() {
    return `
      <section class="view">
        ${pageTitle("Mapa del curso", "Bloques temáticos, autores, conceptos clave y preguntas de examen. Úsalo como índice de estudio y como pauta para detectar puntos débiles.")}
        <div class="timeline">
          ${D.courseBlocks.map((block, index) => `
            <article class="timeline-item">
              <span class="timeline-dot"></span>
              <div class="card">
                <div class="pill-row">
                  <span class="badge gold">Bloque ${index + 1}</span>
                  ${block.authors.slice(0, 4).map((author) => `<span class="badge">${escapeHtml(author)}</span>`).join("")}
                </div>
                <h3>${escapeHtml(block.title)}</h3>
                <div class="three-grid">
                  <div>
                    <strong>Conceptos clave</strong>
                    <ul class="list">${block.concepts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                  </div>
                  <div>
                    <strong>Objetivos</strong>
                    <ul class="list">${block.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                  </div>
                  <div>
                    <strong>Preguntas de examen</strong>
                    <ul class="list">${block.examQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                  </div>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderPhilosophyScience() {
    const analysis = state.lawAnalysis;
    return `
      <section class="view">
        ${pageTitle("Filosofía vs ciencia", "Escribe un enunciado jurídico y la app separará el análisis positivo-científico del análisis filosófico. La gracia del ejercicio es aprender a cambiar de objeto formal.")}
        <div class="two-grid">
          <div class="card gold">
            <h3>Enunciado jurídico</h3>
            <textarea class="textarea" id="lawStatement" placeholder="Ejemplo: Una ley permite sancionar administrativamente sin audiencia previa cuando existe urgencia pública.">${escapeHtml(state.lawStatement)}</textarea>
            <div class="row-actions" style="margin-top:12px">
              <button class="button primary" type="button" data-action="analyze-law">${icon("sparkles")}Analizar</button>
              <button class="button" type="button" data-action="example-law">${icon("wand-2")}Usar ejemplo</button>
            </div>
          </div>
          <div class="card">
            <h3>Guía conceptual</h3>
            <ul class="list">
              <li><strong>Objeto material:</strong> la misma realidad jurídica que aparece en el enunciado.</li>
              <li><strong>Objeto formal científico:</strong> fuente, competencia, vigencia, interpretación y efectos.</li>
              <li><strong>Objeto formal filosófico:</strong> justicia, legitimidad, racionalidad, valores y límites del derecho positivo.</li>
              <li><strong>Método:</strong> dogmática y criterios de validez frente a reflexión crítica y argumentación normativa.</li>
            </ul>
          </div>
        </div>
        <div class="section-head">
          <div>
            <h2>Resultado</h2>
            <p>La salida no usa IA externa: aplica reglas locales para entrenar el modo de respuesta esperado en examen.</p>
          </div>
        </div>
        ${analysis ? renderLawAnalysis(analysis) : `<div class="card empty-state">Escribe un enunciado y presiona analizar para activar la comparación.</div>`}
      </section>
    `;
  }

  function renderLawAnalysis(analysis) {
    return `
      <div class="two-grid">
        <article class="card teal">
          <div class="badge teal">Análisis positivo / científico</div>
          <h3>${escapeHtml(analysis.positive.title)}</h3>
          <ul class="list">${analysis.positive.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </article>
        <article class="card gold">
          <div class="badge gold">Análisis filosófico</div>
          <h3>${escapeHtml(analysis.philosophical.title)}</h3>
          <ul class="list">${analysis.philosophical.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </article>
        <article class="card">
          <h3>Preguntas filosóficas que se abren</h3>
          <ul class="list">${analysis.questions.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        </article>
        <article class="card red">
          <h3>Respuesta oral sugerida</h3>
          <p>${escapeHtml(analysis.oral)}</p>
        </article>
      </div>
    `;
  }

  function analyzeLaw(text) {
    const lower = text.toLowerCase();
    const isPenalty = /sanci|pena|castig|delito|administrativa/.test(lower);
    const isRights = /derecho|libertad|igualdad|dignidad|vida|debido|audiencia/.test(lower);
    const isEmergency = /urgencia|emergencia|seguridad|orden público|salud/.test(lower);
    const isDiscrimination = /discrimin|origen|raza|sexo|relig|grupo/.test(lower);
    const isJudge = /juez|tribunal|sentencia|fallo/.test(lower);

    const positive = [
      "Identificar la fuente positiva: Constitución, ley, reglamento, contrato o sentencia que regula el supuesto.",
      "Revisar competencia del órgano, procedimiento de creación y vigencia temporal de la norma.",
      isPenalty ? "Precisar tipicidad, legalidad, debido proceso y estándar sancionatorio aplicable." : "Determinar supuesto de hecho, consecuencia jurídica y reglas de interpretación aplicables.",
      isJudge ? "Distinguir ratio decidendi, competencia del tribunal y efectos del precedente o sentencia." : "Aplicar métodos dogmáticos: literal, sistemático, histórico y teleológico según corresponda.",
      "El criterio central es la validez y correcta aplicación del derecho positivo, no todavía su justicia final."
    ];

    const philosophical = [
      "Preguntar si la norma trata a las personas como iguales y si respeta una justificación pública aceptable.",
      isRights ? "Examinar la relación entre autoridad, derechos fundamentales y límites de la decisión estatal." : "Determinar qué valores jurídicos están en juego: seguridad, justicia, utilidad, libertad o igualdad.",
      isEmergency ? "Evaluar si la urgencia justifica sacrificar garantías o si exige una medida menos gravosa." : "Preguntar qué concepción de justicia justifica la solución: clásica, positivista, rawlsiana o dworkiniana.",
      isDiscrimination ? "Activar el umbral radbruchiano: una negación deliberada de igualdad puede erosionar la pretensión jurídica de la ley." : "Distinguir injusticia ordinaria de injusticia extrema para evitar respuestas maximalistas.",
      "El criterio central es la legitimidad racional de la norma y de la decisión, no solo su pertenencia al sistema."
    ];

    return {
      positive: { title: "Objeto formal: derecho positivo como sistema aplicable", points: positive },
      philosophical: { title: "Objeto formal: derecho como práctica que reclama justificación", points: philosophical },
      questions: [
        "¿La regla es válida por su fuente o además necesita una justificación material?",
        "¿Qué valor debe prevalecer: seguridad jurídica, justicia material o utilidad institucional?",
        "¿Un juez debe aplicar literalmente la regla o integrarla con principios?",
        "¿El caso exige respuesta positivista, radbruchiana, rawlsiana o dworkiniana?"
      ],
      oral: "En examen conviene decir: el objeto material es el mismo enunciado jurídico; cambia el objeto formal. La ciencia jurídica pregunta por fuente, validez y aplicación. La filosofía del derecho pregunta si esa aplicación es justa, legítima y racionalmente justificable ante ciudadanos libres e iguales."
    };
  }

  function renderClassicalJustice() {
    const author = D.classicalJustice.authors.find((item) => item.id === state.classicAuthor) || D.classicalJustice.authors[0];
    return `
      <section class="view">
        ${pageTitle("Justicia clásica", "Comparador entre Platón, Aristóteles y Tomás de Aquino. La vista está pensada para respuestas orales con tesis, distinción y contraste.")}
        <div class="switcher">
          ${D.classicalJustice.authors.map((item) => `<button type="button" class="${item.id === author.id ? "active" : ""}" data-classic="${item.id}">${escapeHtml(item.name)}</button>`).join("")}
        </div>
        <div class="two-grid">
          <article class="card gold">
            <div class="badge gold">${escapeHtml(author.name)}</div>
            <h3>${escapeHtml(author.title)}</h3>
            <p>${escapeHtml(author.thesis)}</p>
          </article>
          <article class="card teal">
            <h3>Ángulo de examen</h3>
            <p>${escapeHtml(author.examAngle)}</p>
            <div class="pill-row">${author.keyIdeas.map((idea) => `<span class="pill">${escapeHtml(idea)}</span>`).join("")}</div>
          </article>
        </div>
        <div class="section-head"><div><h2>Tabla comparativa</h2><p>Diferencias que suelen activar contra-preguntas en examen oral.</p></div></div>
        <div class="table-wrap">
          <table class="compare-table">
            <thead><tr><th>Eje</th><th>Platón</th><th>Aristóteles</th><th>Tomás de Aquino</th></tr></thead>
            <tbody>
              ${D.classicalJustice.table.map((row) => `
                <tr><td><strong>${escapeHtml(row.axis)}</strong></td><td>${escapeHtml(row.platon)}</td><td>${escapeHtml(row.aristoteles)}</td><td>${escapeHtml(row.aquinio)}</td></tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderRadbruch() {
    const level = Number(state.radbruchLevel || 0);
    const security = Math.max(8, Math.round(96 - level * 0.82));
    const justice = Math.min(100, Math.round(level * 1.05));
    const utility = Math.max(18, Math.round(78 - Math.abs(level - 48) * 0.65));
    const alert = level >= 72;
    const verdict = alert
      ? "Umbral crítico: la seguridad jurídica deja de bastar. La injusticia extrema o la negación deliberada de igualdad activa la fórmula de Radbruch."
      : level >= 48
        ? "Zona de tensión: la ley puede ser injusta, pero aún debes justificar por qué la seguridad jurídica no debe prevalecer."
        : "Zona ordinaria: la seguridad jurídica conserva peso fuerte, aunque la crítica moral siga siendo posible.";

    return `
      <section class="view">
        ${pageTitle("Balanza de Radbruch", "Simula la tensión entre seguridad jurídica, justicia material y utilidad. El punto clave es no afirmar que cualquier injusticia invalida la ley.")}
        <div class="card radbruch-panel ${alert ? "alert" : ""}">
          <div class="section-head" style="margin-top:0">
            <div>
              <h2>Nivel de injusticia de la ley: ${level}%</h2>
              <p>${escapeHtml(verdict)}</p>
            </div>
            <span class="badge ${alert ? "red" : "gold"}">${alert ? "Fórmula activada" : "Tensión ordinaria"}</span>
          </div>
          <input class="range" id="radbruchSlider" type="range" min="0" max="100" value="${level}" aria-label="Nivel de injusticia de la ley">
          <div class="balance-bars">
            ${balanceRow("Seguridad jurídica", security, false)}
            ${balanceRow("Justicia material", justice, alert)}
            ${balanceRow("Utilidad social", utility, false)}
          </div>
        </div>
        <div class="three-grid" style="margin-top:16px">
          <article class="card"><h3>Seguridad</h3><p>El derecho debe orientar conductas con estabilidad. Por eso Radbruch no descarta la ley positiva ante cualquier defecto moral.</p></article>
          <article class="card gold"><h3>Justicia</h3><p>La justicia es el valor propio del derecho y su contenido formal es la igualdad. La negación extrema de igualdad rompe la pretensión jurídica.</p></article>
          <article class="card red"><h3>Fórmula</h3><p>Cuando la contradicción entre ley positiva y justicia alcanza un grado intolerable, la ley injusta debe ceder frente a la justicia.</p></article>
        </div>
      </section>
    `;
  }

  function balanceRow(label, value, danger) {
    return `
      <div class="balance-row">
        <strong>${escapeHtml(label)}</strong>
        <div class="meter ${danger ? "danger" : ""}"><span style="width:${value}%"></span></div>
        <span>${value}%</span>
      </div>
    `;
  }

  function renderPositivism() {
    return `
      <section class="view">
        ${pageTitle("Positivismo vs principios", "Comparador entre Kelsen, Hart y Dworkin: norma básica, regla de reconocimiento, textura abierta, principios, discrecionalidad y juez Hércules.")}
        <div class="table-wrap">
          <table class="compare-table">
            <thead><tr><th>Eje</th><th>Kelsen</th><th>Hart</th><th>Dworkin</th></tr></thead>
            <tbody>
              ${D.positivism.table.map((row) => `
                <tr><td><strong>${escapeHtml(row.axis)}</strong></td><td>${escapeHtml(row.kelsen)}</td><td>${escapeHtml(row.hart)}</td><td>${escapeHtml(row.dworkin)}</td></tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="section-head"><div><h2>Conceptos de cruce</h2><p>Úsalos para responder preguntas comparativas sin caer en caricaturas.</p></div></div>
        <div class="module-grid">
          ${D.positivism.concepts.map((item) => `<article class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`).join("")}
        </div>
      </section>
    `;
  }

  function renderDworkinCourt() {
    const current = D.dworkinCases.find((item) => item.id === state.dworkinCase) || D.dworkinCases[0];
    const selected = state.dworkinPrinciples.length ? state.dworkinPrinciples : current.principles.slice(0, 2);
    return `
      <section class="view">
        ${pageTitle("Tribunal de Dworkin", "Simulador de casos difíciles: elige principios y compara una solución positivista con una respuesta fundada en principios.")}
        <div class="exam-grid">
          <aside class="card gold">
            <h3>Selecciona caso</h3>
            <select class="select" id="dworkinCase">
              ${D.dworkinCases.map((item) => `<option value="${item.id}" ${item.id === current.id ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
            </select>
            <p style="margin-top:14px">${escapeHtml(current.facts)}</p>
            <strong>Principios disponibles</strong>
            <div class="principle-list" style="margin-top:10px">
              ${current.principles.map((principle) => `
                <label class="check-row">
                  <input type="checkbox" value="${escapeHtml(principle)}" ${selected.includes(principle) ? "checked" : ""} data-principle>
                  <span><strong>${escapeHtml(principle)}</strong><span>Razón jurídica con dimensión de peso para este caso.</span></span>
                </label>
              `).join("")}
            </div>
          </aside>
          <div class="two-grid">
            <article class="card">
              <div class="badge">Solución positivista</div>
              <h3>Reglas y fuentes</h3>
              <p>${escapeHtml(current.positivist)}</p>
            </article>
            <article class="card teal">
              <div class="badge teal">Solución por principios</div>
              <h3>Integridad</h3>
              <p>${escapeHtml(current.principled)}</p>
            </article>
            <article class="card gold" style="grid-column:1 / -1">
              <h3>Principios elegidos</h3>
              <div class="pill-row">${selected.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>
              <p style="margin-top:12px">${escapeHtml(current.examKey)}</p>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function renderRawlsLab() {
    const choice = D.rawls.choices.find((item) => item.id === state.rawlsChoice);
    const recommended = D.rawls.choices
      .slice()
      .sort((a, b) => (b.fairness - b.risk * 0.35) - (a.fairness - a.risk * 0.35))[0];

    return `
      <section class="view">
        ${pageTitle("Rawls Lab", "Experimenta con el velo de ignorancia, bienes primarios, posición original y elección de principios.")}
        <div class="two-grid">
          <article class="card gold">
            <h3>Velo de ignorancia</h3>
            <p>No sabes tu clase social, talentos, religión, género, salud ni proyecto de vida. Solo sabes que querrás bienes primarios y que podrías estar en la peor posición.</p>
            <label for="rawlsRisk"><strong>Aversión al riesgo</strong></label>
            <input class="range" id="rawlsRisk" type="range" min="0" max="100" value="${state.rawlsRisk}">
            <label for="rawlsInequality"><strong>Tolerancia a desigualdad</strong></label>
            <input class="range" id="rawlsInequality" type="range" min="0" max="100" value="${state.rawlsInequality}">
          </article>
          <article class="card">
            <h3>Principios rawlsianos</h3>
            <ul class="list">${D.rawls.principles.map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.body)}</li>`).join("")}</ul>
          </article>
        </div>
        <div class="section-head"><div><h2>Elige desde la posición original</h2><p>La app evalúa el riesgo de quedar mal situado y la consistencia con justicia como equidad.</p></div></div>
        <div class="module-grid">
          ${D.rawls.choices.map((item) => `
            <button class="choice-card card ${item.id === state.rawlsChoice ? "gold" : ""}" type="button" data-rawls-choice="${item.id}">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.note)}</p>
              <div class="meter danger"><span style="width:${item.risk}%"></span></div>
              <small class="muted">Riesgo para el peor situado: ${item.risk}%</small>
            </button>
          `).join("")}
        </div>
        <div class="card teal" style="margin-top:16px">
          <h3>${choice ? "Evaluación de tu elección" : "Recomendación del laboratorio"}</h3>
          <p>${choice ? rawlsFeedback(choice) : `La opción más consistente con Rawls suele ser: ${recommended.title}. Protege libertades y evalúa desigualdades desde la posición del menos aventajado.`}</p>
        </div>
      </section>
    `;
  }

  function rawlsFeedback(choice) {
    const risk = Number(state.rawlsRisk);
    const inequality = Number(state.rawlsInequality);
    if (choice.id === "diferencia" || choice.id === "libertad") {
      return `Buena elección rawlsiana. Con aversión al riesgo ${risk}% y tolerancia a desigualdad ${inequality}%, tu respuesta protege bienes primarios y evita sacrificar libertades por utilidad agregada. ${choice.note}`;
    }
    return `Elección problemática desde Rawls. Con el velo de ignorancia no conviene aceptar un principio que podría dejarte sin libertades o sin base social del autorrespeto. ${choice.note}`;
  }

  function renderFlashcards() {
    const categories = ["Todas", ...new Set(D.flashcards.map((card) => card.category))];
    const cards = filteredFlashcards();
    const index = Math.min(state.flashIndex, Math.max(cards.length - 1, 0));
    state.flashIndex = index;
    const card = cards[index] || D.flashcards[0];
    const learned = state.learned.includes(card.id);
    const p = progressStats();

    return `
      <section class="view">
        ${pageTitle("Flashcards", "Más de 60 tarjetas reales para memoria activa. Gira la tarjeta, avanza y marca aprendidas; el progreso queda guardado en localStorage.")}
        <div class="toolbar">
          <select class="select" id="flashFilter" style="max-width:280px">
            ${categories.map((cat) => `<option value="${escapeHtml(cat)}" ${cat === state.flashFilter ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}
          </select>
          <span class="badge gold">${p.learned}/${p.cards} aprendidas</span>
          <span class="badge">${index + 1}/${cards.length}</span>
        </div>
        <div class="flashcard-stage" style="margin-top:16px">
          <button class="flashcard ${state.flashFlipped ? "flipped" : ""}" type="button" data-action="flip-card" aria-label="Girar flashcard">
            <span class="flash-face front">
              <span class="pill-row">
                <span class="badge gold">${escapeHtml(card.author)}</span>
                <span class="badge">${escapeHtml(card.difficulty)}</span>
                <span class="badge teal">${escapeHtml(card.category)}</span>
              </span>
              <span class="flash-question">${escapeHtml(card.question)}</span>
              <span class="muted">Toca para ver respuesta.</span>
            </span>
            <span class="flash-face back">
              <span class="badge teal">Respuesta</span>
              <span class="flash-answer">${escapeHtml(card.answer)}</span>
              <span class="muted">Toca para volver a la pregunta.</span>
            </span>
          </button>
        </div>
        <div class="card-actions" style="margin-top:16px">
          <button class="button" type="button" data-action="prev-card">${icon("chevron-left")}Anterior</button>
          <button class="button primary" type="button" data-action="learn-card">${icon(learned ? "check-check" : "check")} ${learned ? "Aprendida" : "Marcar aprendida"}</button>
          <button class="button" type="button" data-action="next-card">Siguiente${icon("chevron-right")}</button>
        </div>
      </section>
    `;
  }

  function filteredFlashcards() {
    if (state.flashFilter === "Todas") return D.flashcards;
    return D.flashcards.filter((card) => card.category === state.flashFilter);
  }

  function renderQuiz() {
    if (state.quiz.completed) return renderQuizResult();
    const q = D.quiz[state.quiz.index] || D.quiz[0];
    const progress = Math.round((state.quiz.index / D.quiz.length) * 100);

    return `
      <section class="view">
        ${pageTitle("Quiz de grado", "40+ preguntas complejas con alternativas, feedback y explicación. El resultado se guarda como mejor marca.")}
        <div class="card gold">
          <div class="pill-row">
            <span class="badge gold">Pregunta ${state.quiz.index + 1}/${D.quiz.length}</span>
            <span class="badge">${escapeHtml(q.category)}</span>
            <span class="badge">${escapeHtml(q.difficulty)}</span>
          </div>
          <div class="meter" style="margin:14px 0 18px"><span style="width:${progress}%"></span></div>
          <h3>${escapeHtml(q.question)}</h3>
          <div class="quiz-options">
            ${q.options.map((option, idx) => quizOption(option, idx, q.answer)).join("")}
          </div>
          ${state.quiz.answered ? `
            <div class="feedback" style="margin-top:14px">
              <strong>${state.quiz.selected === q.answer ? "Correcta." : "Incorrecta."}</strong>
              ${escapeHtml(q.explanation)}
            </div>
            <div class="row-actions" style="margin-top:14px">
              <button class="button primary" type="button" data-action="next-question">${state.quiz.index === D.quiz.length - 1 ? "Ver resultado" : "Siguiente pregunta"}${icon("arrow-right")}</button>
            </div>
          ` : ""}
        </div>
      </section>
    `;
  }

  function quizOption(option, idx, answer) {
    let klass = "";
    if (state.quiz.answered) {
      if (idx === answer) klass = "correct";
      if (idx === state.quiz.selected && idx !== answer) klass = "wrong";
    }
    return `<button class="quiz-option ${klass}" type="button" data-quiz-option="${idx}" ${state.quiz.answered ? "disabled" : ""}>${escapeHtml(option)}</button>`;
  }

  function renderQuizResult() {
    const score = state.quiz.score;
    const pct = Math.round((score / D.quiz.length) * 100);
    const message = pct >= 85
      ? "Nivel examen oral sólido. Ahora conviene practicar respuestas comparativas sin mirar."
      : pct >= 65
        ? "Buen avance. Revisa explicaciones fallidas y vuelve a intentar en modo cronometrado."
        : "Base por consolidar. Vuelve a mapa, flashcards y módulos comparativos antes del siguiente intento.";

    return `
      <section class="view">
        ${pageTitle("Resultado del quiz", "Cierre del intento y recomendación de estudio.")}
        <div class="card gold">
          <div class="progress-ring" style="--value:${pct * 3.6}deg">
            <div class="progress-ring-inner"><div><strong>${pct}%</strong><small>${score}/${D.quiz.length}</small></div></div>
          </div>
          <h3>${escapeHtml(message)}</h3>
          <p class="muted">Mejor marca guardada: ${Math.max(state.quiz.best, score)}/${D.quiz.length}</p>
          <div class="row-actions">
            <button class="button primary" type="button" data-action="reset-quiz">${icon("rotate-ccw")}Nuevo intento</button>
            <button class="button" type="button" data-route="oral">${icon("mic")}Practicar oral</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderTutor() {
    const messages = state.tutorMessages.length ? state.tutorMessages : [
      { role: "tutor", text: "Propón una definición o tesis. Yo responderé como tutor socrático: contra-pregunta, autor relevante y corrección conceptual." }
    ];
    return `
      <section class="view">
        ${pageTitle("Tutor socrático", "Chat local sin IA externa. Usa patrones doctrinales para corregir definiciones, pedir distinciones y sugerir mejoras argumentativas.")}
        <div class="card">
          <div class="chat-box" id="chatBox">
            ${messages.map((msg) => `<div class="message ${msg.role}">${escapeHtml(msg.text)}</div>`).join("")}
          </div>
          <div class="row-actions" style="margin-top:14px">
            <input class="input" id="tutorInput" placeholder="Ejemplo: Creo que Hart dice que el juez siempre crea derecho..." autocomplete="off">
            <button class="button primary" type="button" data-action="send-tutor">${icon("send")}Enviar</button>
            <button class="button" type="button" data-action="clear-tutor">${icon("trash-2")}Limpiar</button>
          </div>
        </div>
      </section>
    `;
  }

  function socraticReply(text) {
    const lower = text.toLowerCase();
    const hint = D.socraticHints.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
    const corrections = [];

    if (/siempre|nunca|todo|nada/.test(lower)) {
      corrections.push("Cuidado con absolutos: en examen suelen pedir umbrales, distinciones o casos límite.");
    }
    if (/justicia.*ley|ley.*justicia/.test(lower)) {
      corrections.push("Distingue validez positiva de justicia material; esa separación es clave entre legalismo, positivismo y Radbruch.");
    }
    if (/moral/.test(lower) && !/derecho/.test(lower)) {
      corrections.push("Conecta moral y derecho: ¿hablas de moral social, moral crítica o moral política institucional?");
    }

    const base = hint
      ? `${hint.author}: ${hint.reply}`
      : "Primero define el concepto y ubica al autor. Después formula una distinción: validez/justicia, regla/principio, ciencia/filosofía o seguridad/justicia.";
    const follow = "Contra-pregunta: ¿qué ejemplo jurídico mostraría que tu definición funciona y qué caso la pondría en crisis?";
    const improve = "Mejora sugerida: responde en cuatro pasos: tesis breve, distinción conceptual, autor, aplicación a un caso.";

    return [base, ...corrections, follow, improve].join(" ");
  }

  function renderGlossary() {
    const query = state.glossarySearch.trim().toLowerCase();
    const terms = D.glossary.filter((item) => {
      if (!query) return true;
      return [item.term, item.definition, item.explanation, item.author, item.example].some((value) => value.toLowerCase().includes(query));
    });

    return `
      <section class="view">
        ${pageTitle("Glosario", "80+ términos con definición breve, explicación, autor relacionado y ejemplo jurídico.")}
        <div class="toolbar">
          <div class="search-wrap" style="flex:1; min-width:240px">
            ${icon("search")}
            <input class="input" id="glossarySearch" value="${escapeHtml(state.glossarySearch)}" placeholder="Buscar término, autor o ejemplo...">
          </div>
          <span class="badge gold">${terms.length}/${D.glossary.length} términos</span>
        </div>
        <div class="glossary-grid" id="glossaryResults" style="margin-top:16px">
          ${terms.map((item) => renderTerm(item, query)).join("") || `<div class="card empty-state">No hay resultados para esa búsqueda.</div>`}
        </div>
      </section>
    `;
  }

  function renderTerm(item, query) {
    return `
      <article class="card term-card">
        <div class="pill-row">
          <span class="badge gold">${highlight(item.term, query)}</span>
          <span class="badge">${escapeHtml(item.author)}</span>
        </div>
        <h3>${highlight(item.definition, query)}</h3>
        <p>${highlight(item.explanation, query)}</p>
        <p><strong>Ejemplo:</strong> ${highlight(item.example, query)}</p>
      </article>
    `;
  }

  function highlight(value, query) {
    const text = escapeHtml(value);
    if (!query) return text;
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${safe})`, "ig"), "<mark>$1</mark>");
  }

  function renderOralExam() {
    const current = D.oralExam[state.oralIndex] || D.oralExam[0];
    const practiced = state.oralPracticed.includes(current.id);
    return `
      <section class="view">
        ${pageTitle("Modo examen oral", "Preguntas aleatorias con estructura sugerida, errores comunes y respuesta modelo. Practica respondiendo en voz alta antes de revelar el modelo completo.")}
        <div class="exam-grid">
          <aside class="card gold">
            <div class="pill-row">
              <span class="badge gold">Pregunta ${state.oralIndex + 1}/${D.oralExam.length}</span>
              <span class="badge ${practiced ? "teal" : ""}">${practiced ? "Practicada" : "Pendiente"}</span>
            </div>
            <h3>${escapeHtml(current.question)}</h3>
            <div class="row-actions">
              <button class="button" type="button" data-action="random-oral">${icon("shuffle")}Aleatoria</button>
              <button class="button" type="button" data-action="next-oral">${icon("arrow-right")}Siguiente</button>
              <button class="button primary" type="button" data-action="practice-oral">${icon("check")}Marcar practicada</button>
            </div>
          </aside>
          <div class="two-grid">
            <article class="card">
              <h3>Estructura sugerida</h3>
              <ul class="list">${current.structure.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </article>
            <article class="card red">
              <h3>Errores comunes</h3>
              <ul class="list">${current.commonErrors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </article>
            <article class="card teal" style="grid-column:1 / -1">
              <h3>Respuesta modelo</h3>
              <p>${escapeHtml(current.model)}</p>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function bindView(view) {
    if (view === "radbruch") {
      document.getElementById("radbruchSlider")?.addEventListener("input", (event) => {
        state.radbruchLevel = Number(event.target.value);
        saveState();
        render();
      });
    }

    if (view === "rawls") {
      document.getElementById("rawlsRisk")?.addEventListener("input", (event) => {
        state.rawlsRisk = Number(event.target.value);
        saveState();
      });
      document.getElementById("rawlsInequality")?.addEventListener("input", (event) => {
        state.rawlsInequality = Number(event.target.value);
        saveState();
      });
    }

    if (view === "glosario") {
      document.getElementById("glossarySearch")?.addEventListener("input", (event) => {
        state.glossarySearch = event.target.value;
        saveState();
        renderGlossaryLive();
      });
    }

    if (view === "tutor") {
      const input = document.getElementById("tutorInput");
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") sendTutorMessage();
      });
      scrollChat();
    }

    if (view === "filosofia-ciencia") {
      document.getElementById("lawStatement")?.addEventListener("input", (event) => {
        state.lawStatement = event.target.value;
        saveState();
      });
    }
  }

  function renderGlossaryLive() {
    const query = state.glossarySearch.trim().toLowerCase();
    const terms = D.glossary.filter((item) => !query || [item.term, item.definition, item.explanation, item.author, item.example].some((value) => value.toLowerCase().includes(query)));
    const results = document.getElementById("glossaryResults");
    if (results) {
      results.innerHTML = terms.map((item) => renderTerm(item, query)).join("") || `<div class="card empty-state">No hay resultados para esa búsqueda.</div>`;
    }
    refreshIcons();
  }

  function scrollChat() {
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function sendTutorMessage() {
    const input = document.getElementById("tutorInput");
    const text = input?.value.trim();
    if (!text) return;
    state.tutorMessages.push({ role: "user", text });
    state.tutorMessages.push({ role: "tutor", text: socraticReply(text) });
    input.value = "";
    saveState();
    render();
  }

  document.addEventListener("click", async (event) => {
    const route = event.target.closest("[data-route]");
    if (route) {
      event.preventDefault();
      setRoute(route.dataset.route);
      return;
    }

    const classic = event.target.closest("[data-classic]");
    if (classic) {
      state.classicAuthor = classic.dataset.classic;
      saveState();
      render();
      return;
    }

    const rawlsChoice = event.target.closest("[data-rawls-choice]");
    if (rawlsChoice) {
      state.rawlsChoice = rawlsChoice.dataset.rawlsChoice;
      saveState();
      render();
      return;
    }

    const quizOptionButton = event.target.closest("[data-quiz-option]");
    if (quizOptionButton && !state.quiz.answered) {
      const selected = Number(quizOptionButton.dataset.quizOption);
      const q = D.quiz[state.quiz.index];
      state.quiz.selected = selected;
      state.quiz.answered = true;
      if (selected === q.answer) state.quiz.score += 1;
      saveState();
      render();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;

    const name = action.dataset.action;
    if (name === "reset-progress") resetProgress();
    if (name === "analyze-law") runLawAnalysis();
    if (name === "example-law") useLawExample();
    if (name === "flip-card") flipCard();
    if (name === "prev-card") moveCard(-1);
    if (name === "next-card") moveCard(1);
    if (name === "learn-card") toggleLearnedCard();
    if (name === "next-question") nextQuestion();
    if (name === "reset-quiz") resetQuiz();
    if (name === "send-tutor") sendTutorMessage();
    if (name === "clear-tutor") clearTutor();
    if (name === "random-oral") randomOral();
    if (name === "next-oral") nextOral();
    if (name === "practice-oral") practiceOral();
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "flashFilter") {
      state.flashFilter = event.target.value;
      state.flashIndex = 0;
      state.flashFlipped = false;
      saveState();
      render();
    }

    if (event.target.id === "dworkinCase") {
      state.dworkinCase = event.target.value;
      const current = D.dworkinCases.find((item) => item.id === state.dworkinCase);
      state.dworkinPrinciples = current ? current.principles.slice(0, 2) : [];
      saveState();
      render();
    }

    if (event.target.matches("[data-principle]")) {
      const checks = [...document.querySelectorAll("[data-principle]:checked")].map((item) => item.value);
      state.dworkinPrinciples = checks;
      saveState();
      render();
    }
  });

  async function tryInstall() {
    if (!deferredInstallPrompt) {
      showToast("La instalación aparece en navegador compatible desde Vercel o HTTPS. La app igual funciona abriendo index.html.");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  }

  function resetProgress() {
    if (!confirm("¿Reiniciar progreso local de Phronesis?")) return;
    state = clone(defaultState);
    saveState();
    render();
    showToast("Progreso reiniciado.");
  }

  function runLawAnalysis() {
    const textarea = document.getElementById("lawStatement");
    const text = textarea?.value.trim() || "";
    if (!text) {
      showToast("Escribe un enunciado jurídico para analizar.");
      return;
    }
    state.lawStatement = text;
    state.lawAnalysis = analyzeLaw(text);
    saveState();
    render();
  }

  function useLawExample() {
    state.lawStatement = "Una ley permite sancionar administrativamente sin audiencia previa cuando la autoridad invoca urgencia pública y seguridad de la comunidad.";
    state.lawAnalysis = analyzeLaw(state.lawStatement);
    saveState();
    render();
  }

  function flipCard() {
    state.flashFlipped = !state.flashFlipped;
    saveState();
    render();
  }

  function moveCard(delta) {
    const cards = filteredFlashcards();
    state.flashIndex = (state.flashIndex + delta + cards.length) % cards.length;
    state.flashFlipped = false;
    saveState();
    render();
  }

  function toggleLearnedCard() {
    const card = filteredFlashcards()[state.flashIndex];
    if (!card) return;
    if (state.learned.includes(card.id)) {
      state.learned = state.learned.filter((id) => id !== card.id);
      showToast("Tarjeta desmarcada.");
    } else {
      state.learned.push(card.id);
      showToast("Tarjeta marcada como aprendida.");
    }
    saveState();
    render();
  }

  function nextQuestion() {
    if (state.quiz.index >= D.quiz.length - 1) {
      state.quiz.completed = true;
      state.quiz.best = Math.max(state.quiz.best || 0, state.quiz.score);
    } else {
      state.quiz.index += 1;
      state.quiz.answered = false;
      state.quiz.selected = null;
    }
    saveState();
    render();
  }

  function resetQuiz() {
    const best = state.quiz.best || 0;
    state.quiz = { index: 0, score: 0, answered: false, selected: null, completed: false, best };
    saveState();
    render();
  }

  function clearTutor() {
    state.tutorMessages = [];
    saveState();
    render();
  }

  function randomOral() {
    state.oralIndex = Math.floor(Math.random() * D.oralExam.length);
    saveState();
    render();
  }

  function nextOral() {
    state.oralIndex = (state.oralIndex + 1) % D.oralExam.length;
    saveState();
    render();
  }

  function practiceOral() {
    const current = D.oralExam[state.oralIndex];
    if (!state.oralPracticed.includes(current.id)) {
      state.oralPracticed.push(current.id);
      showToast("Pregunta marcada como practicada.");
      saveState();
      render();
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#installApp")) tryInstall();
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  createNav();
  render();
})();
