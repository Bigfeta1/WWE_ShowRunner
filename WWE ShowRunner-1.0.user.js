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
  const MIN_CONSIDERED_DURATION = 100; // seconds
  const MIN_ELAPSED_TO_CONFIRM   = 30;  // seconds
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

  // narrow rule for dot visibility
  function hasWweFlag() {
    const q = location.search;
    return /\bwwe_(autoplay|resume|start)=1\b/.test(q);
  }
  function panelOpen() {
    return !!document.getElementById("wwePanel");
  }
  function activeForThisPage() {
    return onListedPage() || hasWweFlag() || panelOpen();
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
    const dur = v.duration;
    const t = v.currentTime;
    const delta = Math.max(0, t - LAST_T);
    LAST_T = t;
    PLAYED_ACCUM += delta;

    const looksLikeTeaser = Number.isFinite(dur) && dur > 0 && dur < MIN_CONSIDERED_DURATION;
    const likelyBackground = v.loop || (v.muted && !v.controls);

    if (!MAIN_CONFIRMED) {
      if (!looksLikeTeaser && PLAYED_ACCUM >= MIN_ELAPSED_TO_CONFIRM) {
        MAIN_CONFIRMED = true;
      }
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

      confirmMainPlayback(v);

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
    if (document.getElementById("wweDot")) return;
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed", right: "12px", bottom: "12px",
      width: "18px", height: "18px", zIndex: 999999,
      background: color(currentType()), borderRadius: "50%", cursor: "pointer",
      display: "none"
    });
    d.id = "wweDot";
    d.onclick = openPanel;
    document.body.appendChild(d);
  }

  function paintDot() {
    const d = document.getElementById("wweDot");
    if (!d) return;
    d.style.background = color(currentType());
    d.style.display = activeForThisPage() ? "block" : "none";
  }

  // import export
  function serializeLists() {
    return {
      format: "wweAltLists",
      version: "1",
      exportedAt: new Date().toISOString(),
      lists: {
        raw: Array.isArray(STATE.raw) ? STATE.raw : [],
        sd: Array.isArray(STATE.sd) ? STATE.sd : [],
        ppv: Array.isArray(STATE.ppv) ? STATE.ppv : [],
        heat: Array.isArray(STATE.heat) ? STATE.heat : []
      }
    };
  }

  function downloadJSON(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function exportLists() {
    const payload = serializeLists();
    const stamp = new Date().toISOString().replace(/[:.]/g, "_");
    downloadJSON(`wwe_lists_${stamp}.json`, payload);
  }

  function isValidPayload(obj) {
    return obj
      && obj.format === "wweAltLists"
      && obj.lists
      && Array.isArray(obj.lists.raw)
      && Array.isArray(obj.lists.sd)
      && Array.isArray(obj.lists.ppv)
      && Array.isArray(obj.lists.heat)
      && obj.lists.raw.every(s => typeof s === "string")
      && obj.lists.sd.every(s => typeof s === "string")
      && obj.lists.ppv.every(s => typeof s === "string")
      && obj.lists.heat.every(s => typeof s === "string");
  }

  function applyImportedLists(obj) {
    STATE.raw = obj.lists.raw.slice();
    STATE.sd = obj.lists.sd.slice();
    STATE.ppv = obj.lists.ppv.slice();
    STATE.heat = obj.lists.heat.slice();
    build();
    detect();
    saveState();
    paintDot();
  }

  function populateTextAreasFromState() {
    const rawBox = document.getElementById("rawBox");
    const sdBox = document.getElementById("sdBox");
    const ppvBox = document.getElementById("ppvBox");
    const heatBox = document.getElementById("heatBox");
    if (rawBox) rawBox.value = STATE.raw.join("\n");
    if (sdBox) sdBox.value = STATE.sd.join("\n");
    if (ppvBox) ppvBox.value = STATE.ppv.join("\n");
    if (heatBox) heatBox.value = STATE.heat.join("\n");
  }

  function openPanel() {
    if (document.getElementById("wwePanel")) return;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed", right: "16px", bottom: "16px", width: "620px",
      background: "rgba(16,16,16,.95)", color: "#fff", padding: "12px",
      borderRadius: "8px", zIndex: 999999, fontFamily: "system-ui,Arial,sans-serif",
      display: "flex", flexDirection: "column", maxHeight: "80vh", overflow: "auto"
    });
    el.id = "wwePanel";
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:600;">WWE ShowRunner</div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button id="wweStart"  style="background:#0a84ff;color:#fff;border:0;padding:4px 10px;border-radius:6px;cursor:pointer;">Start</button>
          <button id="wweResume" style="background:#34c759;color:#fff;border:0;padding:4px 10px;border-radius:6px;cursor:pointer;">Resume</button>
          <button id="wweClose"  style="background:#333;color:#fff;border:0;padding:4px 8px;border-radius:6px;cursor:pointer;">Close</button>
        </div>
      </div>

      <div id="wweBody" style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><div>RAW</div><textarea id="rawBox"  style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
          <div><div>SD</div><textarea  id="sdBox"   style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
          <div><div>PPV</div><textarea id="ppvBox"  style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
          <div><div>HEAT</div><textarea id="heatBox" style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
        </div>

        <div id="wweToolbar" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <button id="wweSave" style="background:#0a84ff;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;">Save</button>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="wweExport" style="background:#8e8e93;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;">Export</button>
            <button id="wweImport" style="background:#ff9f0a;color:#1b1b1b;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;">Import</button>
            <input id="wweImportFile" type="file" accept="application/json,.json" style="display:none;">
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    populateTextAreasFromState();
    paintDot();

    document.getElementById("wweSave").onclick = () => {
      STATE.raw  = cleanLines(document.getElementById("rawBox").value);
      STATE.sd   = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv  = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      build();
      detect();
      saveState();
      paintDot();
    };

    document.getElementById("wweStart").onclick = () => {
      STATE.raw  = cleanLines(document.getElementById("rawBox").value);
      STATE.sd   = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv  = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      build();
      detect();
      saveState();
      startFromFirst();
    };

    document.getElementById("wweResume").onclick = () => {
      STATE.raw  = cleanLines(document.getElementById("rawBox").value);
      STATE.sd   = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv  = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      build();
      detect();
      saveState();
      resumeFromCurrent();
    };

    document.getElementById("wweExport").onclick = () => {
      STATE.raw  = cleanLines(document.getElementById("rawBox").value);
      STATE.sd   = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv  = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      exportLists();
    };

    const fileInput = document.getElementById("wweImportFile");
    document.getElementById("wweImport").onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(String(reader.result || "{}"));
          if (isValidPayload(obj)) {
            applyImportedLists(obj);
            populateTextAreasFromState();
          }
        } catch {}
        fileInput.value = "";
      };
      reader.readAsText(f);
    };

    document.getElementById("wweClose").onclick = () => {
      el.remove();
      paintDot();
    };
  }

  const _push = history.pushState, _repl = history.replaceState;
  history.pushState = function () { _push.apply(this, arguments); window.dispatchEvent(new Event("wwe-route")); };
  history.replaceState = function () { _repl.apply(this, arguments); window.dispatchEvent(new Event("wwe-route")); };
  window.addEventListener("popstate", () => window.dispatchEvent(new Event("wwe-route")));
  window.addEventListener("wwe-route", () => {
    ADVANCING = false;
    detect();
    paintDot();
    if (!USER_PAUSED) setTimeout(autoPlay, 400);
    resetMainFlags();
    startEndWatch();
  });

  setInterval(() => { if (document.body) { ensureDot(); paintDot(); } }, 800);
  build();
  detect();

  function hook() {
    const v = vid();
    if (!v) {
      new MutationObserver(() => { const vv = vid(); if (vv) { hook(); } })
        .observe(document.documentElement, { childList: true, subtree: true });
      return;
    }
    v.addEventListener("playing", () => {
      USER_PAUSED = false;
      PAUSE_GUARD_UNTIL = 0;
      resetMainFlags();
      paintDot();
      startEndWatch();
    });
    v.addEventListener("timeupdate", () => {
      if (!USER_PAUSED) {
        confirmMainPlayback(v);
      }
    });
    v.addEventListener("pause", () => {
      if (v.ended) return;
      USER_PAUSED = true;
      if (AP_TIMER) { clearInterval(AP_TIMER); AP_TIMER = null; }
      PAUSE_GUARD_UNTIL = Date.now() + 7000;
    });
    v.addEventListener("ended", () => {
      if (Date.now() < PAUSE_GUARD_UNTIL) return;
      if (!onListedPage() || !MAIN_CONFIRMED) return;
      scheduleNext();
    });
    startEndWatch();
  }

  hook();
  setTimeout(autoPlay, 400);
  paintDot();
  startEndWatch();
})();
