const PROGRESS_KEY = "loveGift_progress";

const bgMusic = document.getElementById("bgMusic");
const diaryText2El = document.getElementById("diaryText2");
const btnFinish2 = document.getElementById("btnFinish2");

const diary2 = [
  "A veces las cosas más importantes empiezan como algo pequeño, casi invisible. Nos conocimos a través de NoPixel, sí… pero no por el rol en sí, sino por ese nexo en medio que lo cambió todo: Iván. Él roleaba conmigo, y sin darnos cuenta eso nos fue empujando a coincidir más, a jugar más juntos… hasta que Discord dejó de ser un sitio donde “entrar” y se convirtió en un lugar donde estar.",
  "Y justo cuando todo ocurrió, yo estaba en un momento complicado. No estaba siendo honesta conmigo misma y, de alguna forma, esas horas contigo me ayudaron a entender qué quería… y qué no. No tenía certezas, solo una sensación insistente, una intuición pidiendo una oportunidad aunque me diera miedo.",
  "Y entonces pasó lo más absurdo y precioso: lo decidió una moneda. Literalmente. Un “sí o no” en una aplicación de Google… y salió que sí. El 14 de octubre, sobre las 4 de la tarde, casi las 5, te di la respuesta para que vinieras a Talavera y nos conociéramos en persona. Sin saber que ahí empezaba todo esto: más de dos años entre complicados e increíbles. Gracias, de verdad. ❤️"
];

function startMusicOnce(){
  const go = async () => {
    try { await bgMusic.play(); } catch(e){}
    window.removeEventListener("pointerdown", go);
    window.removeEventListener("keydown", go);
  };
  window.addEventListener("pointerdown", go, { once: true });
  window.addEventListener("keydown", go, { once: true });
}

function clearDiary(el){
  el.innerHTML = "";
}

function typeParagraph(el, text, speed = 40){
  return new Promise((resolve) => {
    const p = document.createElement("p");
    el.appendChild(p);

    const cursor = document.createElement("span");
    cursor.className = "diaryCursor";
    cursor.textContent = "▍";
    p.appendChild(cursor);

    let i = 0;
    const tick = () => {
      cursor.remove();
      p.textContent = text.slice(0, i);
      p.appendChild(cursor);

      i++;
      if (i > text.length) {
        cursor.remove();
        resolve();
        return;
      }
      setTimeout(tick, speed);
    };
    tick();
  });
}

async function typeDiary(el, paragraphs){
  clearDiary(el);
  for (let k = 0; k < paragraphs.length; k++){
    await typeParagraph(el, paragraphs[k], 120);
    await new Promise(r => setTimeout(r, 340));
  }
}

function getUnlocked(){
  return Number(localStorage.getItem(PROGRESS_KEY) || "2");
}
function setUnlocked(n){
  localStorage.setItem(PROGRESS_KEY, String(n));
}
// ===== Lyrics (mínimo para scene2) =====
const lyricsLineEl = document.getElementById("lyricsLine");
let lyrics = [];
let nextIdx = 0;
let lyricsRAF = null;

async function loadLRC(url) {
  const res = await fetch(url);
  const text = await res.text();
  return parseLRC(text);
}

function parseLRC(lrcText) {
  const out = [];
  const lines = lrcText.split(/\r?\n/);

  for (const line of lines) {
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
  if (!lyricsLineEl || lyrics.length === 0) return;

  const t = bgMusic.currentTime;

  while (nextIdx < lyrics.length && t >= lyrics[nextIdx].t) {
    lyricsLineEl.textContent = lyrics[nextIdx].text || "";
    nextIdx++;
  }
}

function startLyricsLoop() {
  if (lyricsRAF) cancelAnimationFrame(lyricsRAF);
  const loop = () => {
    updateLyrics();
    lyricsRAF = requestAnimationFrame(loop);
  };
  loop();
}

async function initLyrics() {
  try {
    lyrics = await loadLRC("../assets/music2.lrc"); // 🔥 ruta correcta
    resetLyrics();

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

// ===== Botón Comenzar (gate real) =====
const btnStartDiary = document.getElementById("btnStartDiary");
const scene2Intro = document.getElementById("scene2Intro");
const scene2Diary = document.getElementById("scene2Diary");

async function startScene2() {
  btnFinish2.disabled = true;

  // Música
  try { await bgMusic.play(); } catch(e) {}

  // Lyrics
  await initLyrics();

  // Quitar overlay + mostrar diario
  scene2Intro.style.opacity = "0";
  setTimeout(() => {
    scene2Intro.remove();
    scene2Diary.classList.remove("hidden");
  }, 350);

  // Escribir diario
  await typeDiary(diaryText2El, diary2);
  btnFinish2.disabled = false;
}

btnStartDiary.addEventListener("click", startScene2);
