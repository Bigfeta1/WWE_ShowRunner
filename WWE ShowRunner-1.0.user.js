// ==UserScript==
// @name         WWE ShowRunner
// @namespace    wwe-alt-cross-provider
// @version      1.0.0
// @description  Chronological cross show autoplay for RAW, SmackDown, PPV, Heat on Netflix and Peacock
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  const GM_KEY = "wweAlt.state";

  // Load state
  function loadState() {
    try {
      const raw = GM_getValue(GM_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        return state;
      }
    } catch {}
    return { raw: [], sd: [], ppv: [], heat: [], index: 0, autoplayActive: false };
  }

  function saveState() {
    try {
      GM_setValue(GM_KEY, JSON.stringify(STATE));
    } catch {}
  }

  const STATE = loadState();
  let master = [];

  function isTargetSite() {
    const h = location.hostname.toLowerCase();
    return h.includes("netflix.com") || h.includes("peacocktv.com");
  }

  function cleanLines(t) {
    return t.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#"));
  }

  function parse(lines, type) {
    const out = [];
    for (const l of lines) {
      const m = l.match(/^(\d{4}-\d{2}-\d{2})\s+(https?:\/\/\S+)/);
      if (m) out.push({ date: m[1], url: m[2], type });
    }
    return out;
  }

  function buildMaster() {
    const all = parse(STATE.raw, "RAW")
      .concat(parse(STATE.sd, "SD"))
      .concat(parse(STATE.ppv, "PPV"))
      .concat(parse(STATE.heat, "HEAT"));
    all.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    master = all;
    if (STATE.index >= master.length) STATE.index = 0;
  }

  buildMaster();

  function navigate(index) {
    if (index < 0 || index >= master.length) return;
    const item = master[index];
    STATE.index = index;
    STATE.autoplayActive = true;
    saveState();
    console.log("[WWE] Navigating to index", index, ":", item.date, item.type, item.url);
    location.href = item.url;
  }

  function startFromFirst() {
    if (!master.length) return;
    navigate(0);
  }

  function resumeFromCurrent() {
    if (!master.length) return;
    navigate(STATE.index);
  }

  function next() {
    if (!master.length) return;
    const nextIndex = Math.min(STATE.index + 1, master.length - 1);
    navigate(nextIndex);
  }

  // Video detection
  function getVideo() {
    let v = document.querySelector("video");
    if (v) return v;
    for (const el of document.querySelectorAll("*")) {
      if (el.shadowRoot) {
        v = el.shadowRoot.querySelector("video");
        if (v) return v;
      }
    }
    return null;
  }

  let watchInterval = null;

  function startWatching() {
    if (!isTargetSite() || !STATE.autoplayActive) return;
    if (watchInterval) clearInterval(watchInterval);

    console.log("[WWE] Starting video watch. Current index:", STATE.index);

    watchInterval = setInterval(() => {
      const v = getVideo();
      if (!v) return;

      // Auto-play video
      if (v.paused) v.play().catch(() => {});

      // Check if ended
      if (v.ended || (v.duration > 0 && v.currentTime >= v.duration - 1)) {
        console.log("[WWE] Video ended, advancing to next");
        clearInterval(watchInterval);
        watchInterval = null;
        setTimeout(() => next(), 500);
      }
    }, 1000);
  }

  // Panel UI
  function closePanel() {
    const el = document.getElementById("wwePanel");
    if (el) el.remove();
  }

  function openPanel() {
    if (document.getElementById("wwePanel")) return;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed", right: "16px", bottom: "16px", width: "620px",
      background: "rgba(16,16,16,.95)", color: "#fff", padding: "12px",
      borderRadius: "8px", zIndex: 2147483646, fontFamily: "system-ui,Arial,sans-serif",
      display: "flex", flexDirection: "column", maxHeight: "80vh", overflow: "auto"
    });
    el.id = "wwePanel";
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:600;">WWE ShowRunner (Index: ${STATE.index})</div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button id="wweStart" style="background:#0a84ff;color:#fff;border:0;padding:4px 10px;border-radius:6px;cursor:pointer;">Start</button>
          <button id="wweResume" style="background:#34c759;color:#fff;border:0;padding:4px 10px;border-radius:6px;cursor:pointer;">Resume</button>
          <button id="wweStop" style="background:#ff3b30;color:#fff;border:0;padding:4px 10px;border-radius:6px;cursor:pointer;">Stop</button>
          <button id="wweClose" style="background:#333;color:#fff;border:0;padding:4px 8px;border-radius:6px;cursor:pointer;">Close</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><div>RAW</div><textarea id="rawBox" style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
        <div><div>SD</div><textarea id="sdBox" style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
        <div><div>PPV</div><textarea id="ppvBox" style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
        <div><div>HEAT</div><textarea id="heatBox" style="width:100%;height:120px;background:#111;color:#ddd;"></textarea></div>
      </div>
      <button id="wweSave" style="background:#0a84ff;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;margin-top:8px;">Save Lists</button>
    `;
    document.body.appendChild(el);

    document.getElementById("rawBox").value = STATE.raw.join("\n");
    document.getElementById("sdBox").value = STATE.sd.join("\n");
    document.getElementById("ppvBox").value = STATE.ppv.join("\n");
    document.getElementById("heatBox").value = STATE.heat.join("\n");

    document.getElementById("wweSave").onclick = () => {
      STATE.raw = cleanLines(document.getElementById("rawBox").value);
      STATE.sd = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      buildMaster();
      saveState();
      alert("Lists saved");
    };

    document.getElementById("wweStart").onclick = () => {
      STATE.raw = cleanLines(document.getElementById("rawBox").value);
      STATE.sd = cleanLines(document.getElementById("sdBox").value);
      STATE.ppv = cleanLines(document.getElementById("ppvBox").value);
      STATE.heat = cleanLines(document.getElementById("heatBox").value);
      buildMaster();
      startFromFirst();
    };

    document.getElementById("wweResume").onclick = () => {
      resumeFromCurrent();
    };

    document.getElementById("wweStop").onclick = () => {
      STATE.autoplayActive = false;
      saveState();
      if (watchInterval) clearInterval(watchInterval);
      watchInterval = null;
      alert("Autoplay stopped");
    };

    document.getElementById("wweClose").onclick = closePanel;
  }

  // Hotkey Ctrl+Alt+/
  window.addEventListener("keydown", (e) => {
    if (e.code === "Slash" && e.ctrlKey && e.altKey) {
      e.preventDefault();
      if (document.getElementById("wwePanel")) closePanel();
      else openPanel();
    }
  });

  // Start watching on target sites
  if (isTargetSite()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(startWatching, 1000);
      });
    } else {
      setTimeout(startWatching, 1000);
    }
  }

  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Open WWE ShowRunner", () => openPanel());
  }
})();
