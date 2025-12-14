/***********************
 * CAMBIO DE ESCENAS
 ***********************/
function showScene(id) {
  const target = document.getElementById(id);

  // Si no existe la escena, NO apagamos todo
  if (!target) {
    console.error("showScene: no existe la escena con id =", id);
    return;
  }

  document.querySelectorAll(".scene").forEach(s => s.classList.remove("scene--active"));
  target.classList.add("scene--active");

  // debug útil
  console.log("Escena activa:", id);
}


/***********************
 * AUDIO
 ***********************/
const bgMusic = document.getElementById("bgMusic");
const tapSfx = document.getElementById("tapSfx");

// Ajuste suave de volumen del tap
if (tapSfx) tapSfx.volume = 0.35;

let musicStarted = false;

async function startMusicSafe() {
  if (musicStarted || !bgMusic) return;
  try {
    await bgMusic.play();
    musicStarted = true;
    startLightBeat();
  } catch (e) {
    // En algunos navegadores puede requerir un segundo gesto del usuario.
    console.log("Audio bloqueado hasta interacción:", e);
  }
}

function playTap() {
  if (!tapSfx) return;
  try {
    tapSfx.currentTime = 0;
    tapSfx.play();
  } catch (e) {}
}

/***********************
 * ESCENA 1: REGALO FULLSCREEN (WOW)
 ***********************/
const giftTopDown = document.getElementById("giftTopDown");
const giftFX = document.getElementById("giftFX");
const sparks = document.getElementById("sparks");

function spawnSparks(count = 28) {
  if (!sparks) return;
  sparks.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");

    const size = 4 + Math.random() * 10;
    const x = Math.random() * 100;
    const y = 42 + Math.random() * 34;

    const dx = (Math.random() - 0.5) * 260;
    const dy = -90 - Math.random() * 240;
    const rot = (Math.random() - 0.5) * 360;
    const dur = 650 + Math.random() * 500;

    s.style.cssText = `
      position:absolute;
      left:${x}%;
      top:${y}%;
      width:${size}px;height:${size}px;
      border-radius:999px;
      background: rgba(255,255,255,0.85);
      box-shadow: 0 0 18px rgba(110,231,255,0.45), 0 0 18px rgba(255,77,141,0.35);
      transform: translate(0,0) rotate(0deg);
      opacity:0.95;
      transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
    `;

    sparks.appendChild(s);

    requestAnimationFrame(() => {
      s.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      s.style.opacity = "0";
    });

    setTimeout(() => s.remove(), dur + 80);
  }
}

function triggerGiftFX() {
  if (!giftFX) return;
  giftFX.style.opacity = "1";

  const flash = giftFX.querySelector(".giftFX__flash");
  const glow = giftFX.querySelector(".giftFX__glow");

  if (!flash || !glow) return;

  flash.style.transition = "opacity 160ms ease, transform 240ms ease";
  glow.style.transition = "opacity 350ms ease, transform 500ms ease";

  // Encender
  flash.style.opacity = "1";
  flash.style.transform = "scale(1)";
  glow.style.opacity = "1";
  glow.style.transform = "scale(1.02)";

  spawnSparks(30);

  // Apagar
  setTimeout(() => {
    flash.style.opacity = "0";
    glow.style.opacity = "0";
    setTimeout(() => (giftFX.style.opacity = "0"), 300);
  }, 220);
}

function openGift() {
  if (!giftTopDown) return;
  if (giftTopDown.classList.contains("giftTopDown--opened")) return;

  giftTopDown.classList.add("giftTopDown--opened");
  triggerGiftFX();

  // Tras click, intentamos arrancar música
  startMusicSafe();

  // Vibración en móvil (si existe)
  try { navigator.vibrate?.(18); } catch (e) {}

  // Pasamos al puzzle tras la animación
  setTimeout(() => {
    showScene("scenePuzzle");
    initPuzzle();
    shufflePuzzle(60);
    setStatus("Mezclado. ¡Ahora resuélvelo!");
    locked = false;
    startTimer();
  }, 1100);
}

if (giftTopDown) {
  giftTopDown.addEventListener("click", openGift);
  giftTopDown.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openGift();
  });
}

/***********************
 * ESCENA 2: PUZZLE 3x3 (8 piezas + hueco)
 * - Imagen cortada
 * - Animación de deslizamiento (position absolute + transform)
 * - Números en esquina
 * - Tap SFX al mover
 * - Temporizador 40s
 * - Bloqueo al terminar tiempo hasta "Mezclar"
 ***********************/
const puzzleEl = document.getElementById("puzzle");
const shuffleBtn = document.getElementById("shuffleBtn");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const openingLineEl = document.getElementById("openingLine");

const timeTextEl = document.getElementById("timeText");
const timeFillEl = document.getElementById("timeFill");

const IMG_URL = "assets/puzzle.jpg";
const TIME_LIMIT = 40;

let state = [];
let ready = false;

// 🔒 Bloquea movimientos cuando se acaba el tiempo
let locked = false;

// Layout piezas
let tileSize = 0;
let gap = 10;

// Timer
let timerInterval = null;
let timeLeft = TIME_LIMIT;

const solvedState = [1,2,3,4,5,6,7,8,0];

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

function computeLayout() {
  if (!puzzleEl) return;
  const rect = puzzleEl.getBoundingClientRect();
  const w = rect.width;
  gap = 10;
  tileSize = (w - gap * 2) / 3;
}

/* TIMER */
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimerUI() {
  timeLeft = TIME_LIMIT;
  if (timeTextEl) timeTextEl.textContent = `${timeLeft}s`;
  if (timeFillEl) timeFillEl.style.transform = "scaleX(1)";
}

function startTimer() {
  stopTimer();
  resetTimerUI();
  if (!timeFillEl) return;

  const startedAt = Date.now();
  const totalMs = TIME_LIMIT * 1000;

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const remainingMs = Math.max(0, totalMs - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);

    if (remainingSec !== timeLeft) {
      timeLeft = remainingSec;
      if (timeTextEl) timeTextEl.textContent = `${timeLeft}s`;
    }

    const ratio = remainingMs / totalMs;
    timeFillEl.style.transform = `scaleX(${ratio})`;

    if (remainingMs <= 0) {
      stopTimer();
      onTimeUp();
    }
  }, 100);
}

function onTimeUp() {
  if (isSolved()) return;

  locked = true;
  if (startBtn) startBtn.disabled = true;
  setStatus("Se acabó el tiempo 😭 Pulsa “Mezclar” para intentarlo otra vez.");
}

/* INIT */
function initPuzzle() {
  if (ready) return;
  if (!puzzleEl || !shuffleBtn || !startBtn || !statusEl || !openingLineEl) return;
  ready = true;

  state = [...solvedState];
  renderPuzzle();

  // Frase inicial (puedes cambiarla)
  openingLineEl.textContent = "Cuando estés listo… empieza la aventura ❤️";

  shuffleBtn.addEventListener("click", async () => {
    await startMusicSafe();
    locked = false;      // 🔓 desbloquea al reintentar
    shufflePuzzle(80);
    setStatus("Mezclado. ¡Vamos!");
    startTimer();
  });

  startBtn.addEventListener("click", async () => {
    await startMusicSafe();
    showScene("sceneStart");
  });

  // Recalcular tamaño en resize
  window.addEventListener("resize", () => {
    if (document.getElementById("scenePuzzle")?.classList.contains("scene--active")) {
      renderPuzzle();
    }
  });
}

/* RENDER */
function renderPuzzle() {
  if (!puzzleEl) return;
  computeLayout();
  puzzleEl.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    const val = state[i];

    const r = Math.floor(i / 3);
    const c = i % 3;

    const x = c * (tileSize + gap);
    const y = r * (tileSize + gap);

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.style.width = `${tileSize}px`;
    tile.style.height = `${tileSize}px`;
    tile.style.transform = `translate(${x}px, ${y}px)`;

    if (val === 0) {
      tile.classList.add("tile--empty");
      tile.setAttribute("aria-label", "Hueco");
    } else {
      // Recorte de imagen
      const correctIndex = val - 1;
      const row = Math.floor(correctIndex / 3);
      const col = correctIndex % 3;

      const posX = col === 0 ? "0%" : (col === 1 ? "50%" : "100%");
      const posY = row === 0 ? "0%" : (row === 1 ? "50%" : "100%");

      tile.style.setProperty("--img", `url('${IMG_URL}')`);
      tile.style.setProperty("--pos", `${posX} ${posY}`);

      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      tile.setAttribute("aria-label", `Pieza ${val}`);

      tile.addEventListener("click", () => tryMove(i));
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") tryMove(i);
      });

      // Número en esquina
      const num = document.createElement("span");
      num.className = "tileNum";
      num.textContent = String(val);
      tile.appendChild(num);
    }

    puzzleEl.appendChild(tile);
  }

  // Control resuelto
  if (isSolved()) {
    stopTimer();
    locked = false;
    if (startBtn) startBtn.disabled = false;
    setStatus("¡Perfecto! Ya puedes pulsar “Empezar”.");
  } else if (startBtn) {
    startBtn.disabled = true;
  }
}

/* MOVIMIENTO */
function indexOfEmpty() {
  return state.indexOf(0);
}

async function tryMove(tileIndex) {
  await startMusicSafe();

  if (locked) return;

  const emptyIndex = indexOfEmpty();
  if (!isAdjacent(tileIndex, emptyIndex)) return;

  playTap();

  // swap
  [state[tileIndex], state[emptyIndex]] = [state[emptyIndex], state[tileIndex]];
  renderPuzzle();
}

function isAdjacent(a, b) {
  const ar = Math.floor(a / 3), ac = a % 3;
  const br = Math.floor(b / 3), bc = b % 3;
  return (Math.abs(ar - br) + Math.abs(ac - bc)) === 1;
}

function isSolved() {
  return state.every((v, i) => v === solvedState[i]);
}

/* MEZCLA (SIEMPRE RESOLUBLE) */
function shufflePuzzle(moves = 60) {
  state = [...solvedState];
  let empty = indexOfEmpty();

  for (let m = 0; m < moves; m++) {
    const neighbors = getNeighbors(empty);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [state[empty], state[pick]] = [state[pick], state[empty]];
    empty = pick;
  }

  renderPuzzle();
}

function getNeighbors(index) {
  const r = Math.floor(index / 3), c = index % 3;
  const out = [];
  if (r > 0) out.push(index - 3);
  if (r < 2) out.push(index + 3);
  if (c > 0) out.push(index - 1);
  if (c < 2) out.push(index + 1);
  return out;
}
/***********************
 * LUCES REACTIVAS AL AUDIO
 ***********************/
let audioCtx = null;
let analyser = null;
let dataArray = null;
let sourceNode = null;
let rafId = null;

let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let timeData = null;

// Auto-gain (se adapta a canciones suaves)
let gain = 1.0;


function ensureAudioAnalysis() {
  if (audioCtx || !bgMusic) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048; // potencia de 2
analyser.smoothingTimeConstant = 0.85;
  timeData = new Uint8Array(analyser.fftSize);

  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  sourceNode = audioCtx.createMediaElementSource(bgMusic);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function energyInRange(fromHz, toHz) {
  const nyquist = audioCtx.sampleRate / 2;
  const fromIndex = Math.floor((fromHz / nyquist) * analyser.frequencyBinCount);
  const toIndex = Math.floor((toHz / nyquist) * analyser.frequencyBinCount);

  let sum = 0;
  let count = 0;
  for (let i = fromIndex; i <= toIndex; i++) {
    sum += dataArray[i];
    count++;
  }
  return count ? (sum / count) / 255 : 0; // 0..1
}

// Variables globales para suavizado pro
let envSmooth = 0;
let lastTime = performance.now();

function animateLightsToAudio() {
  if (!analyser || !dataArray || !timeData) return;
  analyser.getByteFrequencyData(dataArray);
  analyser.getByteTimeDomainData(timeData);

  // RMS
  let sumSq = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = (timeData[i] - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / timeData.length);

  // Auto-gain para música suave
  const targetGain = Math.min(14.0, Math.max(1.0, 0.22 / Math.max(0.01, rms)));
  gain += (targetGain - gain) * 0.05;

  // Envelope 0..1 + curva para que se note lo suave
  let env = rms * gain;
  env = Math.min(1, env);
  env = Math.pow(env, 0.42);

  // Attack/Release (esto es lo que hace que sea ultra fluido)
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000); // segundos (cap)
  lastTime = now;

  const attack = 0.18;   // sube rápido
  const release = 0.06;  // baja lento (más suave)
  const k = (env > envSmooth) ? (1 - Math.exp(-attack / Math.max(0.001, dt)))
                              : (1 - Math.exp(-release / Math.max(0.001, dt)));
  envSmooth = envSmooth + (env - envSmooth) * k;

  // “Carácter” por medios (solo para mover en X)
  const mid = energyInRange(180, 1600);

  // Intensidad (YA notable)
  const pulse  = 0.92 + envSmooth * 0.75;
  const shiftX = (mid - 0.5) * 240;         // movimiento lateral suave
  const shiftY = (envSmooth - 0.5) * 200;   // latido vertical

  // Glow para opacidad (no filter)
  const glow = 0.25 + envSmooth * 1.2;

  document.documentElement.style.setProperty("--pulse", pulse.toFixed(3));
  document.documentElement.style.setProperty("--shiftX", `${shiftX.toFixed(1)}px`);
  document.documentElement.style.setProperty("--shiftY", `${shiftY.toFixed(1)}px`);
  document.documentElement.style.setProperty("--glow", glow.toFixed(3));

  rafId = requestAnimationFrame(animateLightsToAudio);
}


function startLightBeat() {
  ensureAudioAnalysis();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (rafId) cancelAnimationFrame(rafId);
  animateLightsToAudio();
}


/***********************
 * LYRICS (.LRC) SYNC
 ***********************/
const lyricsLineEl = document.getElementById("lyricsLine");
let lyrics = []; // {t: seconds, text: string}
let nextIdx = 0;

async function loadLRC(url) {
  const res = await fetch(url);
  const text = await res.text();
  return parseLRC(text);
}

function parseLRC(lrcText) {
  const out = [];
  const lines = lrcText.split(/\r?\n/);

  for (const line of lines) {
    // acepta múltiples timestamps en una línea
    const timeTags = [...line.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{1,2}))?\]/g)];
    const lyricText = line.replace(/\[(\d{2}):(\d{2})(?:\.(\d{1,2}))?\]/g, "").trim();

    for (const tag of timeTags) {
      const mm = Number(tag[1]);
      const ss = Number(tag[2]);
      const xx = Number(tag[3] || 0);
      const t = mm * 60 + ss + (xx / (tag[3]?.length === 1 ? 10 : 100));
      out.push({ t, text: lyricText });
    }
  }

  out.sort((a, b) => a.t - b.t);
  return out;
}

function resetLyrics() {
  nextIdx = 0;
  if (lyricsLineEl) lyricsLineEl.textContent = "";
}

function updateLyrics() {
  if (!lyricsLineEl || lyrics.length === 0 || !bgMusic) return;

  const t = bgMusic.currentTime;

  // avanza mientras toque
  while (nextIdx < lyrics.length && t >= lyrics[nextIdx].t) {
    const text = lyrics[nextIdx].text || "";

    lyricsLineEl.style.opacity = "0";
    lyricsLineEl.style.transform = "translateY(6px)";

    setTimeout(() => {
      lyricsLineEl.textContent = text;
      lyricsLineEl.style.opacity = "0.85";
      lyricsLineEl.style.transform = "translateY(0)";
    }, 120);

    nextIdx++;
  }
}

// Loop muy ligero (más estable que timeupdate)
let lyricsRAF = null;
function startLyricsLoop() {
  if (lyricsRAF) cancelAnimationFrame(lyricsRAF);
  const loop = () => {
    updateLyrics();
    lyricsRAF = requestAnimationFrame(loop);
  };
  loop();
}

async function initLyrics() {
  if (!bgMusic) return;
  try {
    lyrics = await loadLRC("assets/music.lrc");
    resetLyrics();

    // Si reinicias la canción o la vuelves atrás, recalculamos el índice
    bgMusic.addEventListener("seeked", () => {
      const t = bgMusic.currentTime;
      nextIdx = 0;
      while (nextIdx < lyrics.length && t >= lyrics[nextIdx].t) nextIdx++;
    });

    bgMusic.addEventListener("ended", resetLyrics);

    startLyricsLoop();
  } catch (e) {
    console.log("No pude cargar lyrics:", e);
  }
}

// Llama una vez al cargar
initLyrics();

/***********************
 * MAPA DEL TESORO (RUTA SVG)
 ***********************/
const PROGRESS_KEY = "loveGift_progress";
let unlocked = Number(localStorage.getItem(PROGRESS_KEY) || "2");

function completeThisScene(id){
  if (unlocked === id && id < 15) {
    localStorage.setItem(PROGRESS_KEY, String(id + 1));
  }
  window.location.href = "index.html#map";
}


const routePath = document.getElementById("routePath");
const routeProgress = document.getElementById("routeProgress");
const routeNodes = document.getElementById("routeNodes");
const treasureHint = document.getElementById("treasureHint");
const resetProgressBtn = document.getElementById("resetProgress");

// 15 escenas con títulos cortos (luego los personalizamos)
const scenes = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  title: `Escena ${i + 1}`,
  desc: i === 1 ? "Empezamos" : (i === 15 ? "Final ✨" : "Siguiente paso")
}));

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, String(unlocked));
}

// Para colocar los puntos “sobre” el camino, usamos posiciones manuales (queda precioso)
const nodePositions = [
  { x: 80,  y: 430 },
  { x: 150, y: 390 },
  { x: 230, y: 450 },
  { x: 330, y: 390 },
  { x: 410, y: 340 },
  { x: 480, y: 410 },
  { x: 560, y: 360 },
  { x: 640, y: 300 },
  { x: 705, y: 410 },
  { x: 790, y: 330 },
  { x: 845, y: 280 },
  { x: 900, y: 320 },
  { x: 940, y: 220 },
  { x: 930, y: 160 },
  { x: 940, y: 140 },
];

function centerOnNode(id) {
  if (!routeNodes) return;
  const nodes = routeNodes.querySelectorAll(".routeNode");
  const target = nodes[id - 1];
  if (!target) return;

  // Preferimos scroll suave si hay contenedor desplazable
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    return;
  }

  // Fallback para SVG puro ajustando viewBox
  const svg = routeNodes.closest("svg");
  if (!svg || !svg.viewBox) return;
  const bbox = target.getBBox();
  const vb = svg.viewBox.baseVal;
  const x = bbox.x + bbox.width / 2 - vb.width / 2;
  const y = bbox.y + bbox.height / 2 - vb.height / 2;
  svg.setAttribute("viewBox", `${x} ${y} ${vb.width} ${vb.height}`);
}

function setProgressStroke() {
  if (!routePath || !routeProgress) return;

  const len = routePath.getTotalLength();
  routeProgress.style.strokeDasharray = `${len}`;
  // progreso: si unlocked=1, aún no hay tramo completado (0). Si unlocked=2 → 1/14, etc.
  const completed = Math.max(0, Math.min(14, unlocked - 1));
  const ratio = completed / 14;

  routeProgress.style.strokeDashoffset = `${len * (1 - ratio)}`;
}

function renderTreasureNodes() {
  if (!routeNodes || !treasureHint) return;
  routeNodes.innerHTML = "";

  scenes.forEach((s, idx) => {
    const pos = nodePositions[idx];
    const isLocked = s.id > unlocked;
    const isActive = s.id === unlocked;
    const isDone = s.id < unlocked;

    // grupo
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("routeNode");
    if (isLocked) g.classList.add("routeNode--locked");
    if (isActive) g.classList.add("routeNode--active");
    if (isDone) g.classList.add("routeNode--done");

    g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
    g.setAttribute("tabindex", isLocked ? "-1" : "0");

    // círculo
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.classList.add("nodeCircle");
    c.setAttribute("r", isActive ? "18" : "14");
    c.setAttribute("cx", "0");
    c.setAttribute("cy", "0");
    c.setAttribute("fill", isLocked
      ? "rgba(255,255,255,0.18)"
      : isDone
        ? "rgba(255,77,141,0.55)"
        : "rgba(110,231,255,0.75)"
    );
    c.setAttribute("stroke", "rgba(255,255,255,0.28)");
    c.setAttribute("stroke-width", "2");

    // número dentro
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.classList.add("nodeLabel");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("y", "1");
    t.textContent = String(s.id);

    // etiqueta
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("nodeSub");
    label.setAttribute("x", "22");
    label.setAttribute("y", "-6");
    label.textContent = s.title;

    g.appendChild(c);
    g.appendChild(t);
    g.appendChild(label);

    // click solo si no está bloqueado y SOLO el activo (el siguiente)
    if (isActive) {
      g.addEventListener("click", () => openSceneFromMap(s.id));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") openSceneFromMap(s.id);
      });
    }

    routeNodes.appendChild(g);
  });

  treasureHint.textContent = `Progreso: ${unlocked}/15. Toca el punto brillante para continuar.`;
  centerOnNode(unlocked);
}

// A qué escena debe ir cada punto del mapa:
function openSceneFromMap(id) {
  // solo deja entrar al activo
  if (id !== unlocked) return;

  // cada escena en su página
  window.location.href = `scene${id}.html`;
}

if (resetProgressBtn) {
  resetProgressBtn.addEventListener("click", () => {
    unlocked = 2;
    saveProgress();
    setProgressStroke();
    renderTreasureNodes();
  });
}

setProgressStroke();
renderTreasureNodes();

// Si vienes de otra escena y la URL trae #map, abre el mapa
if (location.hash === "#map") {
  showScene("sceneStart");
}
