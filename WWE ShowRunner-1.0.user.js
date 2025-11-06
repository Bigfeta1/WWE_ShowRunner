// ==UserScript==
// @name         WWE ShowRunner
// @namespace    wwe-alt-cross-provider
// @version      1.0
// @description  Chronological cross-show autoplay for RAW, SmackDown, PPV, Heat on Netflix and Peacock. Includes list editor, Start, Resume, Export, Import. Guards against teaser/background animations by confirming main playback and requiring current page to match a listed item before advancing.
// @match        https://www.peacocktv.com/*
// @match        https://www.netflix.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // storage
  const GM_KEY = "wweAlt.state";
  const LS_KEY = "wweAlt.v231";

  function readGM() {
    try { return GM_getValue(GM_KEY); } catch { return null; }
  }
  function writeGM(obj) {
    try { GM_setValue(GM_KEY, JSON.stringify(obj)); } catch {}
  }
  function readLS() {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  }
  function clearLS() {
    try { localStorage.removeItem(LS_KEY); } catch {}
  }

  function loadState() {
    const gmRaw = readGM();
    if (gmRaw) {
      try { return JSON.parse(gmRaw); } catch {}
    }
    const lsRaw = readLS();
    if (lsRaw) {
      try {
        const migrated = JSON.parse(lsRaw);
        writeGM(migrated);
        clearLS();
        return migrated;
      } catch {}
    }
    const fresh = { raw: [], sd: [], ppv: [], heat: [], master: [], i: 0 };
    writeGM(fresh);
    return fresh;
  }

  function saveState() { writeGM(STATE); }

  // state
  const STATE = loadState();
  let USER_PAUSED = false;
  let AP_TIMER = null;
  let PAUSE_GUARD_UNTIL = 0;
  let ADVANCING = false;
  let END_WATCH = null;

  // main-video confirmation to ignore teasers
  const MIN_CONSIDERED_DURATION = 100; // seconds; shorter videos are likely teasers
  const MIN_ELAPSED_TO_CONFIRM   = 30;  // seconds watched to confirm main playback
  let MAIN_CONFIRMED = false;
  let PLAYED_ACCUM = 0;
  let LAST_T = 0;

  // helpers
  function cleanLines(t) { return t.split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
  function parse(lines, type) {
    const out = [];
    for (const l of lines) {
      const m = l.match(/^(\d{4}-\d{2}-\d{2})\s+(https?:\/\/\S+)/);
      if (m) out.push({ date: m[1], url: m[2], type });
    }
    return out;
  }

  function build() {
    const a = parse(STATE.raw, "RAW")
      .concat(parse(STATE.sd, "SD"), parse(STATE.ppv, "PPV"), parse(STATE.heat, "HEAT"));
    a.sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
    STATE.master = a;
    if (STATE.i >= a.length) STATE.i = 0;
    saveState();
  }

  function canon(h) {
    try {
      const u = new URL(h);
      u.search = "";
      const host = u.host.toLowerCase();
      const path = u.pathname.replace(/\/$/, "");
      if (host.includes("netflix.com")) {
        const id = path.match(/\/(title|watch)\/(\d{4,})/i)?.[2] || path.match(/(\d{4,})/)?.[1];
        return id ? host + "/id/" + id : host + path;
      }
      if (host.includes("peacocktv.com")) {
        const tok = path.match(/\/watch\/([^/]+)/i)?.[1];
        return tok ? host + "/watch/" + tok : host + path;
      }
      return host + path;
    } catch {
      return h;
    }
  }

  function detect() {
    if (!STATE.master.length) return;
    const c = canon(location.href);
    const idx = STATE.master.findIndex(x => canon(x.url) === c);
    if (idx >= 0) { STATE.i = idx; saveState(); }
  }

  function currentType() {
    const pType = new URLSearchParams(location.search).get("wwe_type");
    if (pType) return pType.toUpperCase();
    const cur = STATE.master[STATE.i];
    return cur ? cur.type : null;
  }

  function color(t) {
    const T = t ? t.toUpperCase() : "";
    if (T === "RAW") return "#e10600";
    if (T === "SD") return "#0066ff";
    if (T === "PPV") return "#e0b000";
    if (T === "HEAT") return "#ff6a00";
    return "#777";
  }

  function goToItem(n, extraParam) {
    if (!n || !n.url) return;
    const u = new URL(n.url, location.href);
    u.searchParams.set("wwe_autoplay", "1");
    u.searchParams.set("wwe_type", n.type);
    if (extraParam) u.searchParams.set(extraParam, "1");
    setTimeout(() => { location.href = u.toString(); }, 300);
  }

  function onListedPage() {
    if (!STATE.master.length) return false;
    const cur = STATE.master[STATE.i];
    if (!cur) return false;
    return canon(location.href) === canon(cur.url);
  }

  function next() {
    if (!STATE.master.length) return;
    USER_PAUSED = false;
    PAUSE_GUARD_UNTIL = 0;
    ADVANCING = false;
    const i = Math.min(STATE.i + 1, STATE.master.length - 1);
    const n = STATE.master[i];
    STATE.i = i; saveState();
    goToItem(n);
  }

  function startFromFirst() {
    if (!STATE.master.length) return;
    USER_PAUSED = false;
    PAUSE_GUARD_UNTIL = 0;
    ADVANCING = false;
    STATE.i = 0; saveState();
    goToItem(STATE.master[0], "wwe_start");
  }

  function resumeFromCurrent() {
    if (!STATE.master.length) return;
    USER_PAUSED = false;
    PAUSE_GUARD_UNTIL = 0;
    ADVANCING = false;
    const i = Math.max(0, Math.min(STATE.i, STATE.master.length - 1));
    const n = STATE.master[i];
    saveState();
    goToItem(n, "wwe_resume");
  }

  function scheduleNext() {
    if (ADVANCING) return;
    ADVANCING = true;
    USER_PAUSED = false;
    PAUSE_GUARD_UNTIL = 0;
    setTimeout(() => next(), 150);
  }

  function vid() {
    // prefer the first <video> found in shadow roots or DOM
    const v = document.querySelector("video");
    if (v) return v;
    for (const e of document.querySelectorAll("*")) {
      if (e.shadowRoot) {
        const v2 = e.shadowRoot.querySelector("video");
        if (v2) return v2;
      }
    }
    return null;
  }

  function tryPlay() {
    if (USER_PAUSED) return;
    const v = vid();
    if (v && v.paused) v.play().catch(() => {});
  }

  function autoPlay() {
    const q = location.search;
    if ((!q.includes("wwe_autoplay") && !q.includes("wwe_resume") && !q.includes("wwe_start")) || USER_PAUSED) return;
    let c = 0;
    if (AP_TIMER) { clearInterval(AP_TIMER); AP_TIMER = null; }
    AP_TIMER = setInterval(() => {
      tryPlay();
      if (++c > 40) { clearInterval(AP_TIMER); AP_TIMER = null; }
    }, 700);
  }

  function confirmMainPlayback(v) {
    // update accumulators and set MAIN_CONFIRMED when safe
    const dur = v.duration;
    const t = v.currentTime;
    const delta = Math.max(0, t - LAST_T);
    LAST_T = t;
    PLAYED_ACCUM += delta;

    // treat very short or looping muted videos as teasers
    const looksLikeTeaser = Number.isFinite(dur) && dur > 0 && dur < MIN_CONSIDERED_DURATION;
    const likelyBackground = v.loop || (v.muted && !v.controls);

    if (!MAIN_CONFIRMED) {
      if (!looksLikeTeaser && PLAYED_ACCUM >= MIN_ELAPSED_TO_CONFIRM) {
        MAIN_CONFIRMED = true;
      }
      // if it looks like a teaser, never confirm
      if (likelyBackground && looksLikeTeaser) {
        MAIN_CONFIRMED = false;
      }
    }
  }

  function resetMainFlags() {
    MAIN_CONFIRMED = false;
    PLAYED_ACCUM = 0;
    LAST_T = 0;
  }

  function startEndWatch() {
    if (END_WATCH) { clearInterval(END_WATCH); END_WATCH = null; }
    END_WATCH = setInterval(() => {
      if (ADVANCING || USER_PAUSED) return;
      const v = vid();
      if (!v) return;

      // keep confirming as playback proceeds
      confirmMainPlayback(v);

      // advance only if on a listed page and main playback confirmed
      if (!onListedPage() || !MAIN_CONFIRMED) return;

      if (v.ended) { scheduleNext(); return; }
      const dur = v.duration;
      const t = v.currentTime;
      if (Number.isFinite(dur) && dur > 0 && t >= dur - 0.3) {
        scheduleNext();
      }
    }, 1000);
  }

  function ensureDot() {
    if (document.getElementById("ww
