// SPDX-License-Identifier: GPL-2.0-or-later
//
// Elecraft KPA1500 — Zeus workspace panel.
//
// Plain ESM with React.createElement (no build step). Zeus supplies `react`.
// Talks only to this feature's backend through callBackend. Styling uses only
// the public Zeus CSS tokens, scoped under the feature root class.

import React from "react";

const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

const ROOT = "com-kw4ex-zeus-kpa1500";
const PANEL_ID = "kpa1500.main";
const BANDS = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m"];
const BAUDS = [4800, 9600, 19200, 38400, 57600, 115200, 230400];
const PEAK_HOLD_MS = 2000;

// Secondary class names always carry the feature prefix.
const c = (names) => String(names || "").split(/\s+/).filter(Boolean)
  .map((n) => ROOT + "__" + n).join(" ");

const CSS = `
.${ROOT}{font-family:var(--font-sans);color:var(--fg-1);background:var(--bg-1);
  border:1px solid var(--panel-border);border-radius:var(--r-md);padding:8px;
  display:flex;flex-direction:column;gap:8px;box-sizing:border-box;width:100%;height:100%;
  overflow:auto;font-size:12px;position:relative;min-width:0}
.${ROOT} *{box-sizing:border-box}
.${ROOT} .${ROOT}__row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.${ROOT} .${ROOT}__spread{justify-content:space-between}
.${ROOT} .${ROOT}__title{font-size:13px;font-weight:700;color:var(--fg-0);letter-spacing:.02em}
.${ROOT} .${ROOT}__sub{font-size:12px;color:var(--fg-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${ROOT} .${ROOT}__grow{flex:1 1 auto;min-width:0}
.${ROOT} .${ROOT}__pill{font-size:10px;font-weight:700;letter-spacing:.04em;padding:2px 7px;
  border-radius:var(--r-lg);border:1px solid var(--line-strong);color:var(--fg-0);background:var(--bg-2);white-space:nowrap}
.${ROOT} .${ROOT}__pill.${ROOT}__ok{color:var(--ok);border-color:var(--ok)}
.${ROOT} .${ROOT}__pill.${ROOT}__warn{color:var(--amber);border-color:var(--amber)}
.${ROOT} .${ROOT}__pill.${ROOT}__tx{color:var(--tx);border-color:var(--tx)}
.${ROOT} .${ROOT}__pill.${ROOT}__acc{color:var(--accent-bright);border-color:var(--accent)}
.${ROOT} .${ROOT}__banner{border:1px solid var(--line-strong);border-left-width:4px;border-radius:var(--r-sm);
  padding:6px 8px;background:var(--bg-2);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.${ROOT} .${ROOT}__banner.${ROOT}__tx{border-color:var(--tx)}
.${ROOT} .${ROOT}__banner.${ROOT}__warn{border-color:var(--amber)}
.${ROOT} .${ROOT}__banner.${ROOT}__acc{border-color:var(--accent)}
.${ROOT} .${ROOT}__banner strong{color:var(--fg-0)}
.${ROOT} .${ROOT}__meters{display:flex;flex-direction:column;gap:5px}
.${ROOT} .${ROOT}__meter{display:grid;grid-template-columns:minmax(52px,auto) 1fr minmax(58px,auto);align-items:center;gap:8px}
.${ROOT} .${ROOT}__mk{font-size:11px;font-weight:600;color:var(--fg-1);letter-spacing:.05em;text-transform:uppercase}
.${ROOT} .${ROOT}__mv{font-family:var(--font-mono);font-size:12px;color:var(--fg-0);text-align:right;white-space:nowrap}
.${ROOT} .${ROOT}__track{position:relative;height:10px;background:var(--bg-inset);border:1px solid var(--line-strong);border-radius:var(--r-xs);overflow:hidden}
.${ROOT} .${ROOT}__fill{position:absolute;left:0;top:0;bottom:0;background:var(--accent);transition:width var(--dur-fast) var(--ease-out)}
.${ROOT} .${ROOT}__fill.${ROOT}__warn{background:var(--amber)}
.${ROOT} .${ROOT}__fill.${ROOT}__tx{background:var(--tx)}
.${ROOT} .${ROOT}__peak{position:absolute;top:0;bottom:0;width:2px;background:var(--fg-0)}
.${ROOT} .${ROOT}__tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:5px}
.${ROOT} .${ROOT}__tile{background:var(--bg-2);border:1px solid var(--line-strong);border-radius:var(--r-sm);padding:4px 6px}
.${ROOT} .${ROOT}__tile.${ROOT}__warn{border-color:var(--amber)}
.${ROOT} .${ROOT}__tile .${ROOT}__mv{text-align:left;font-size:13px}
.${ROOT} .${ROOT}__group{border-top:1px solid var(--line-strong);padding-top:6px;display:flex;flex-direction:column;gap:5px}
.${ROOT} .${ROOT}__glab{font-size:11px;font-weight:700;color:var(--fg-1);letter-spacing:.05em;text-transform:uppercase}
.${ROOT} .${ROOT}__btns{display:flex;gap:4px;flex-wrap:wrap}
.${ROOT} button.${ROOT}__b{font-family:var(--font-sans);font-size:11px;font-weight:600;min-height:28px;
  padding:4px 11px;border-radius:var(--r-sm);border:1px solid var(--line-strong);background:var(--bg-3);
  color:var(--fg-0);cursor:pointer;transition:background var(--dur-fast) var(--ease-out)}
.${ROOT} button.${ROOT}__b:hover:not(:disabled):not([aria-pressed=true]){background:var(--bg-2)}
.${ROOT} button.${ROOT}__b[aria-pressed=true]:hover:not(:disabled){filter:brightness(1.12)}
.${ROOT} button.${ROOT}__b:focus-visible,.${ROOT} .${ROOT}__in:focus-visible,.${ROOT} input[type=checkbox]:focus-visible,
.${ROOT} input[type=radio]:focus-visible{outline:2px solid var(--accent-bright);outline-offset:2px}
.${ROOT} button.${ROOT}__b:disabled{opacity:.75;border-style:dashed;cursor:not-allowed}
.${ROOT} button.${ROOT}__b[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--bg-0);font-weight:700}
.${ROOT} button.${ROOT}__b.${ROOT}__litok[aria-pressed=true]{background:var(--ok);border-color:var(--ok)}
.${ROOT} button.${ROOT}__b.${ROOT}__litamber[aria-pressed=true]{background:var(--amber);border-color:var(--amber)}
.${ROOT} button.${ROOT}__b.${ROOT}__faint{opacity:.5}
.${ROOT} button.${ROOT}__b.${ROOT}__faint:hover:not(:disabled){opacity:.85}
.${ROOT} .${ROOT}__bands{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px}
.${ROOT} .${ROOT}__bands button.${ROOT}__b{padding:4px 2px}
.${ROOT} button.${ROOT}__b.${ROOT}__danger{border-color:var(--tx);color:var(--tx)}
.${ROOT} button.${ROOT}__b.${ROOT}__good{border-color:var(--ok);color:var(--ok)}
.${ROOT} button.${ROOT}__icon{min-width:28px;padding:4px 7px}
.${ROOT} .${ROOT}__in{font-family:var(--font-mono);font-size:12px;background:var(--bg-inset);color:var(--fg-0);
  border:1px solid var(--line);border-radius:var(--r-xs);padding:4px 6px;min-height:28px;min-width:0}
.${ROOT} .${ROOT}__fld{display:grid;grid-template-columns:minmax(96px,auto) 1fr;align-items:center;gap:6px}
.${ROOT} .${ROOT}__fld > label{color:var(--fg-1);font-size:12px}
.${ROOT} .${ROOT}__chk{display:flex;align-items:center;gap:6px;color:var(--fg-0);font-size:12px;min-height:24px}
.${ROOT} .${ROOT}__checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px 10px}
.${ROOT} .${ROOT}__muted{font-size:12px;color:var(--fg-1)}
.${ROOT} .${ROOT}__err{font-size:11px;color:var(--tx)}
.${ROOT} .${ROOT}__log{background:var(--bg-inset);border:1px solid var(--line);border-radius:var(--r-xs);
  font-family:var(--font-mono);font-size:11px;line-height:1.5;max-height:160px;overflow:auto;padding:6px}
.${ROOT} .${ROOT}__ln{display:flex;gap:6px}
.${ROOT} .${ROOT}__ts{color:var(--fg-2)}
.${ROOT} .${ROOT}__k-warn{color:var(--amber)}
.${ROOT} .${ROOT}__k-tx{color:var(--tx)}
.${ROOT} .${ROOT}__k-ok{color:var(--ok)}
.${ROOT} .${ROOT}__k-cmd{color:var(--accent-bright)}
.${ROOT}.${ROOT}__mini{gap:4px;padding:5px 6px}
.${ROOT} .${ROOT}__mini1{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.${ROOT} .${ROOT}__mini2{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-family:var(--font-mono);font-size:13px;color:var(--fg-0)}
.${ROOT} .${ROOT}__mini2 .${ROOT}__mk{font-size:10px;margin-right:3px}
.${ROOT} .${ROOT}__hsec{border-top:1px solid var(--line-strong);padding:4px 0}
.${ROOT} .${ROOT}__hsec summary{cursor:pointer;font-weight:700;color:var(--fg-0);padding:3px 0}
.${ROOT} .${ROOT}__hp,.${ROOT} .${ROOT}__hl{margin:4px 0;color:var(--fg-1);line-height:1.45;font-size:12px}
.${ROOT} .${ROOT}__hl{padding-left:18px}.${ROOT} .${ROOT}__hl li{margin:2px 0}
.${ROOT} .${ROOT}__hdl{margin:4px 0;font-size:12px;color:var(--fg-1)}
.${ROOT} .${ROOT}__hdl dt{font-weight:700;color:var(--fg-0);margin-top:5px}.${ROOT} .${ROOT}__hdl dd{margin:0 0 0 10px}
.${ROOT} .${ROOT}__hnote{border:1px solid var(--line-strong);border-left:4px solid var(--accent);border-radius:var(--r-sm);background:var(--bg-2);padding:5px 8px;margin:5px 0;font-size:12px;color:var(--fg-1)}
.${ROOT} .${ROOT}__hwarn{border-left-color:var(--amber)}
.${ROOT} .${ROOT}__overlay{position:absolute;inset:0;background:var(--bg-inset);display:flex;align-items:center;
  justify-content:center;padding:12px;border-radius:var(--r-md);z-index:3}
.${ROOT} .${ROOT}__card{background:var(--bg-1);border:1px solid var(--line-strong);border-radius:var(--r-md);
  padding:12px;display:flex;flex-direction:column;gap:8px;max-width:320px}
.${ROOT} .${ROOT}__card h3{margin:0;font-size:13px;color:var(--fg-0)}
.${ROOT} .${ROOT}__ntab{width:100%;border-collapse:collapse;font-size:12px}
.${ROOT} .${ROOT}__ntab th{text-align:left;color:var(--fg-1);font-weight:600;padding:3px 4px;border-bottom:1px solid var(--line-strong)}
.${ROOT} .${ROOT}__ntab td{padding:2px 4px;border-bottom:1px solid var(--line);color:var(--fg-0)}
.${ROOT} .${ROOT}__ntab tr.${ROOT}__cur td{background:var(--bg-2)}
.${ROOT} .${ROOT}__ntab input{width:72px}
.${ROOT} .${ROOT}__ctl{display:flex;flex-direction:column;gap:6px}
.${ROOT} .${ROOT}__cblock{display:flex;flex-direction:column;gap:4px}
.${ROOT} .${ROOT}__ord{display:flex;flex-direction:column;gap:3px}
.${ROOT} .${ROOT}__ordrow{display:flex;align-items:center;gap:6px;padding:2px 4px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--bg-1)}
.${ROOT} .${ROOT}__ordrow label{flex:1 1 auto;display:flex;align-items:center;gap:6px;color:var(--fg-0);font-size:12px}
.${ROOT} .${ROOT}__ordrow .${ROOT}__b{padding:1px 7px;min-width:0}
.${ROOT} .${ROOT}__compact .${ROOT}__glab{display:none}
.${ROOT}.${ROOT}__compact{gap:5px;padding:6px}
.${ROOT}.${ROOT}__compact .${ROOT}__meter{grid-template-columns:44px 1fr 52px}
@media (prefers-reduced-motion: reduce){.${ROOT} button.${ROOT}__b,.${ROOT} .${ROOT}__fill{transition:none}}
`;

function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById(ROOT + "-style")) return;
  const s = document.createElement("style");
  s.id = ROOT + "-style";
  s.textContent = CSS;
  document.head.appendChild(s);
}

async function call(callBackend, method, path, body) {
  const res = await callBackend(method, path, body);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok && res.status !== 202) {
    const err = new Error((data && data.message) || (method + " " + path + " failed (" + res.status + ")"));
    err.status = res.status;
    throw err;
  }
  return data;
}

const mhz = (khz) => khz == null ? "—" : (khz / 1000).toFixed(3) + " MHz";
const SOURCE_TEXT = { "default": "default", "manual": "typed", "learned-floor": "learned (antenna)",
  "learned-equipment": "learned (no antenna)", "auto": "auto-learning" };
const CONTROL_IDS = ["power", "operate", "tunestby", "antenna", "atu", "atutune", "band", "fan"];
const CONTROL_NAMES = { power: "POWER", operate: "OPERATE / STANDBY", tunestby: "TUNE STBY (Standby on Tune)", antenna: "ANT 1 / ANT 2",
  atu: "ATU in-line / bypass", atutune: "ATU TUNE", band: "Band buttons", fan: "Fan minimum speed" };
const CONTROL_FLAG = { power: "ctlPower", operate: "ctlOperate", tunestby: "ctlTuneGuard", antenna: "ctlAntenna",
  atu: "ctlAtu", atutune: "ctlTune", band: "ctlBand", fan: "ctlFan" };
const controlOrder = (text) => {
  const out = [];
  String(text || "").split(",").forEach((x) => { const id = x.trim().toLowerCase(); if (CONTROL_IDS.includes(id) && !out.includes(id)) out.push(id); });
  CONTROL_IDS.forEach((id) => { if (!out.includes(id)) out.push(id); });
  return out;
};
const num = (v, d) => (v === null || v === undefined) ? "—" : (d === undefined ? String(v) : Number(v).toFixed(d));
const tempText = (cdeg, unit) => cdeg == null ? "—"
  : unit === "F" ? Math.round(cdeg * 9 / 5 + 32) + " °F" : cdeg + " °C";

function Meter(props) {
  const { label, value, max, text, level, peak } = props;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const peakPct = peak == null ? null : Math.max(0, Math.min(100, (peak / max) * 100));
  return h("div", { className: c("meter") },
    h("span", { className: c("mk") }, label),
    h("div", { className: c("track"), role: "meter", "aria-label": label,
      "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": value == null ? undefined : value,
      "aria-valuetext": text },
      h("div", { className: c("fill " + (level || "")), style: { width: pct + "%" } }),
      peakPct != null && peakPct > pct ? h("div", { className: c("peak"), style: { left: "calc(" + peakPct + "% - 1px)" } }) : null),
    h("span", { className: c("mv") }, text));
}

function Tile(label, text, warn) {
  return h("div", { className: c("tile" + (warn ? " warn" : "")), key: label },
    h("div", { className: c("mk") }, label),
    h("div", { className: c("mv") }, text, warn ? " ⚠" : ""));
}

function Check(cfg, setCfg, key, label) {
  return h("label", { className: c("chk"), key },
    h("input", { type: "checkbox", checked: !!cfg[key], onChange: (e) => setCfg({ ...cfg, [key]: e.target.checked }) }),
    label);
}

// Settings: what the small (two-line) view shows.
const MINI_ITEMS = [["power", "POWER button"], ["status", "OPERATE / STANDBY button"], ["tunestby", "TUNE STBY button"],
  ["freq", "Amp frequency"], ["band", "Band"], ["fwd", "Output power"], ["swr", "SWR"]];
function MiniItemsEditor(draft, setDraft) {
  const cur = new Set(String(draft.miniItems || "power,status,freq,fwd,swr").split(","));
  const flip = (id) => {
    const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id);
    setDraft({ ...draft, miniItems: MINI_ITEMS.map((x) => x[0]).filter((k) => next.has(k)).join(",") });
  };
  return h("div", { key: "mini", className: c("group") },
    h("div", { className: c("glab") }, "Small view (two lines): what it shows"),
    h("div", { className: c("checks") }, MINI_ITEMS.map(([id, label]) =>
      h("label", { className: c("chk"), key: id },
        h("input", { type: "checkbox", checked: cur.has(id), onChange: () => flip(id) }), label))),
    h("div", { className: c("muted") }, "Switch a panel between the small and full view with the ⇕ button at its top right. Each panel remembers its own choice."));
}

// Settings list: one row per control with a show checkbox and ▲ / ▼ to move it.
function ControlOrderEditor(draft, setDraft) {
  const order = controlOrder(draft.controlOrder);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const n = order.slice(); const t = n[i]; n[i] = n[j]; n[j] = t;
    setDraft({ ...draft, controlOrder: n.join(",") });
  };
  return h("div", { className: c("ord"), key: "ord" },
    order.map((id, i) => h("div", { key: id, className: c("ordrow") },
      h("label", null,
        h("input", { type: "checkbox", checked: !!draft[CONTROL_FLAG[id]],
          onChange: (e) => setDraft({ ...draft, [CONTROL_FLAG[id]]: e.target.checked }) }),
        (i + 1) + ". " + CONTROL_NAMES[id]),
      h("button", { type: "button", className: c("b"), disabled: i === 0, "aria-label": "Move " + CONTROL_NAMES[id] + " up", onClick: () => move(i, -1) }, "▲"),
      h("button", { type: "button", className: c("b"), disabled: i === order.length - 1, "aria-label": "Move " + CONTROL_NAMES[id] + " down", onClick: () => move(i, 1) }, "▼"))),
    h("div", { className: c("btns") },
      h("button", { type: "button", className: c("b"), onClick: () => setDraft({ ...draft, controlOrder: CONTROL_IDS.join(",") }) }, "Default order")),
    null);
}

function Field(label, id, control) {
  return h("div", { className: c("fld"), key: id },
    h("label", { htmlFor: id }, label), control);
}

// Identify this panel instance so its view choice is remembered separately for each
// workspace. Uses what Zeus hands the panel; falls back to where it sits on the page.
function panelKey(props, el) {
  try {
    const p = props || {};
    for (const k of ["instanceId", "panelInstanceId", "panelId", "id", "slot", "layoutId", "key"]) {
      if (p[k] != null && String(p[k]) !== "") return "p:" + String(p[k]);
    }
    let n = el, parts = [];
    for (let i = 0; n && i < 12; i++, n = n.parentElement) {
      const d = n.dataset || {};
      const v = d.panelId || d.instanceId || d.panel || d.slot || d.layoutId || d.id || n.getAttribute("data-rgl-id") || n.getAttribute("data-grid-id") || (n !== el ? n.id : "");
      if (v) { parts.push(v); if (parts.length >= 2) break; }
    }
    if (parts.length) return "d:" + parts.join("/");
  } catch (e) { /* fall through */ }
  return "default";
}

function makePanel(callBackend) {
  return function Kpa1500Panel(props) {
    const [status, setStatus] = useState(null);
    const [cfg, setCfgSaved] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loadErr, setLoadErr] = useState(null);
    const [actErr, setActErr] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [saveErr, setSaveErr] = useState(null);
    const [ports, setPorts] = useState([]);
    const [log, setLog] = useState([]);
    const [confirm, setConfirm] = useState(null); // "on" | "off" | "tune"
    const [peak, setPeak] = useState({ w: null, at: 0 });
    const [found, setFound] = useState(null);      // null | { searching } | { error } | { searched, found }
    const alive = useRef(true);
    // Full or small (two-line) view. Remembered per panel: Zeus may place this panel
    // in several workspaces, each can be set to a different view.
    const rootRef = useRef(null);
    const [view, setViewState] = useState("full");
    const [viewKey, setViewKey] = useState(null);
    useEffect(() => {
      const key = panelKey(props, rootRef.current);
      setViewKey(key);
      try { const v = window.localStorage.getItem(ROOT + ":view:" + key); if (v === "mini" || v === "full") setViewState(v); } catch (e) { /* no storage */ }
    }, []);
    const setView = (v) => {
      setViewState(v);
      try { window.localStorage.setItem(ROOT + ":view:" + (viewKey || "default"), v); } catch (e) { /* not remembered */ }
    };

    // Status poll.
    useEffect(() => {
      alive.current = true;
      let timer = null;
      const tick = async () => {
        try {
          const s = await call(callBackend, "GET", "/status");
          if (!alive.current) return;
          setStatus(s);
          setLoadErr(null);
          const w = s && s.amp ? s.amp.forwardW : null;
          setPeak((p) => {
            const now = Date.now();
            if (w != null && (p.w == null || w >= p.w || now - p.at > PEAK_HOLD_MS)) return { w, at: now };
            return p;
          });
        } catch (e) {
          if (alive.current) setLoadErr(e.message || String(e));
        }
        if (alive.current) timer = setTimeout(tick, 300);
      };
      tick();
      call(callBackend, "GET", "/config").then((x) => { if (alive.current && x) setCfgSaved(x); }).catch(() => {});
      return () => { alive.current = false; if (timer) clearTimeout(timer); };
    }, []);

    // Log poll, only while the log is visible.
    const logVisible = !!(cfg && cfg.showLog);
    useEffect(() => {
      if (!logVisible) return undefined;
      let timer = null;
      let live = true;
      const tick = async () => {
        try { const l = await call(callBackend, "GET", "/log"); if (live) setLog(l || []); } catch (e) { /* shown via status */ }
        if (live) timer = setTimeout(tick, 2000);
      };
      tick();
      return () => { live = false; if (timer) clearTimeout(timer); };
    }, [logVisible]);

    const act = useCallback(async (path, body) => {
      setBusy(true);
      setActErr(null);
      try {
        const r = await call(callBackend, "POST", path, body);
        if (r && r.message && r.ok === true && path === "/tune-guard") setActErr(null);
      } catch (e) {
        setActErr(e.message || String(e));
      } finally {
        setBusy(false);
      }
    }, []);

    const openSettings = async () => {
      setSaveErr(null);
      setDraft(cfg ? { ...cfg } : null);
      setShowSettings(true);
      try { setPorts((await call(callBackend, "GET", "/ports")) || []); } catch (e) { setPorts([]); }
    };

    const saveSettings = async () => {
      setSaveErr(null);
      try {
        const saved = await call(callBackend, "POST", "/config", draft);
        setCfgSaved(saved);
        setShowSettings(false);
      } catch (e) {
        setSaveErr(e.message || String(e));
      }
    };

    // ── loading / unavailable ──────────────────────────────────────────────
    if (!status || !cfg) {
      return h("div", { ref: rootRef, className: ROOT, role: "region", "aria-label": "KPA1500" },
        h("div", { className: c("title") }, "Elecraft KPA1500"),
        loadErr
          ? h("div", { className: c("banner warn"), role: "alert" }, h("strong", null, "Feature backend unavailable. "), loadErr)
          : h("div", { className: c("muted"), role: "status" }, "Loading…"));
    }

    const amp = status.amp || {};
    const conn = status.connection || {};
    const connected = conn.state === "open";
    const on = connected && amp.power === "on";
    const tx = !!status.tx;
    const fault = amp.fault && amp.fault.active ? amp.fault : null;
    const tuning = amp.tuning === true;
    const guard = status.tuneGuard || { phase: "idle" };
    const relayLock = !on || busy || tx || tuning;
    const lockTip = !connected ? "Not connected" : !on ? "Amplifier is off" : tx ? "Not while transmitting" : tuning ? "Not while the ATU is tuning" : undefined;
    const hasTarget = cfg.transport === "serial" ? !!(cfg.serialPort || "").trim() : !!(cfg.host || "").trim();
    const tci = status.tci || { enabled: false };

    // ── controls (all together, in the order chosen in Settings) ──
    // Every two-state control is one toggle that is filled (lit) when active.
    // Pairs/sets (ANT 1/2, bands) light the active one and fade the others.
    // Dashed outline = locked (transmitting / tuning / amp off), never "inactive".
    const toggle = (key, label, lit, opts) => h("button", { key, type: "button",
      className: c("b " + (opts.variant || "") + (opts.faint ? " faint" : "")),
      "aria-pressed": !!lit, disabled: !!opts.disabled, title: opts.title, onClick: opts.onClick }, label);

    const operating = on && amp.operate === true;
    // Live from the backend, so a change made elsewhere (FlexControl knob) shows at once.
    const sotOn = status.standbyOnTune != null ? !!status.standbyOnTune : !!cfg.standbyOnTune;
    const inline = on && amp.atuInline === true;
    // Each control: [shown?, inline buttons | block element]
    const CONTROLS = {
      power: (f) => (f || cfg.ctlPower) && [toggle("pw", amp.powerOnInProgress ? "WAKING…" : "POWER", on || amp.powerOnInProgress, {
        variant: "litok",
        disabled: !connected || busy || amp.powerOnInProgress || (on && (tx || tuning)),
        title: on ? (tx ? "Not while transmitting" : "Amplifier is ON — click to turn it off") : "Amplifier is off — click to turn it on",
        onClick: () => {
          const want = on ? "off" : "on";
          if ((want === "off" && cfg.confirmPowerOff) || (want === "on" && cfg.confirmPowerOn)) setConfirm(want);
          else act("/power", { on: want === "on" });
        } })],
      operate: (f) => (f || cfg.ctlOperate) && [toggle("op", f ? (operating ? "OPERATE" : "STANDBY") : "OPERATE", operating, {
        // Going to STANDBY is always allowed (even under RF); going to OPERATE is locked under RF.
        disabled: operating ? (!on || busy) : relayLock,
        title: !on ? "Amplifier is off" : operating ? "In OPERATE — click for STANDBY" : (lockTip || "In STANDBY — click for OPERATE"),
        onClick: () => act("/operate", { operate: !operating }) })],
      // On/off switch, like the Thetis bridge: lit = whenever TUNE is pressed in
      // Zeus the amp goes to STANDBY, and back to OPERATE when TUNE ends.
      tunestby: (f) => (f || cfg.ctlTuneGuard) && [toggle("tg", sotOn && !(status.flex ? status.flex.connected : (tci.enabled && tci.connected)) ? "TUNE STBY ⚠" : "TUNE STBY", sotOn, {
        disabled: busy,   // lit blue like OPERATE when on
        title: (sotOn
          ? "Standby on Tune is ON: pressing TUNE in Zeus puts the amp in STANDBY, and OPERATE returns afterwards. Click to turn it off."
          : "Standby on Tune is OFF. Click to turn it on.") +
          (sotOn && !(status.flex ? status.flex.connected : (tci.enabled && tci.connected)) ? (status.flex ? " ⚠ Not working yet: the FlexRadio isn't connected." : " ⚠ Not working yet: Zeus TCI isn't connected (" + (tci.error || "turn TCI on in Zeus, port 40001") + ").") : ""),
        onClick: async () => {
          await act("/tune-guard/enable", { on: !sotOn });
          try { const x = await call(callBackend, "GET", "/config"); if (x) setCfgSaved(x); } catch (e) { /* keep */ }
        } })],
      antenna: () => cfg.ctlAntenna && [1, 2].map((a) => {
        const active = on && amp.antenna === a;
        return toggle("a" + a, "ANT " + a, active, {
          faint: on && amp.antenna != null && !active, disabled: relayLock && !active,
          title: active ? "Antenna " + a + " in use" : (lockTip || "Switch to antenna " + a),
          onClick: () => { if (!active) act("/antenna", { antenna: a }); } });
      }),
      atu: () => cfg.ctlAtu && [toggle("atu", "ATU", inline, {
        disabled: relayLock,
        title: lockTip || (inline ? "ATU in-line — click to bypass" : "ATU bypassed — click to put it in-line"),
        onClick: () => act("/atu", { inline: !inline }) })],
      atutune: () => cfg.ctlTune && [toggle("tn", tuning ? "TUNING…" : "ATU TUNE", tuning, {
        variant: "litamber",
        disabled: tuning ? busy : relayLock,
        title: tuning ? "ATU is tuning — click to cancel" : (lockTip || "Start a full-search ATU tune (you supply the carrier)"),
        onClick: () => tuning ? act("/atu/cancel") : setConfirm("tune") })],
      band: () => {
        if (!cfg.ctlBand) return null;
        const fx = status.flex;
        const radioText = fx && !(status.radio && status.radio.band)
          ? "FlexRadio: " + (fx.connected ? "connected, waiting for a frequency…" : (fx.error || fx.notice || "looking for the Flex — is it on and on this network?"))
          : status.radio && status.radio.available && status.radio.band
          ? (status.radio.source || "Zeus") + ": " + status.radio.band + " · " + (status.radio.frequencyHz / 1000).toFixed(1) + " kHz"
            + (status.radio.source !== "FlexRadio" && status.radio.tciHz && Math.abs(status.radio.tciHz - status.radio.frequencyHz) > 2000
                ? " (TCI says " + (status.radio.tciHz / 1000).toFixed(1) + ", ignored)" : "")
          : "Zeus radio state not available";
        return h("div", { key: "band", className: c("cblock") },
          h("div", { className: c("bands"), role: "group", "aria-label": "Amplifier band" },
            BANDS.map((b) => {
              const active = on && amp.band === b;
              return toggle("bd" + b, b.replace("m", ""), active, {
                faint: on && amp.band != null && !active, disabled: relayLock && !active,
                title: active ? "Amp is on " + b : (lockTip || "Set the amp to " + b),
                onClick: () => { if (!active) act("/band", { band: b }); } });
            })),
          h("div", { className: c("muted") }, radioText + (cfg.sendFrequency ? " · amp follows the VFO" : "")));
      },
      fan: () => {
        if (!cfg.ctlFan) return null;
        const fm = amp.fanMinimum;
        return h("div", { key: "fan", className: c("row") },
          h("span", { className: c("muted") }, "Fan minimum"),
          h("button", { type: "button", className: c("b icon"), "aria-label": "Lower minimum fan speed", disabled: !on || busy || fm == null || fm <= 0,
            onClick: () => act("/fan", { speed: fm - 1 }) }, "−"),
          h("span", { className: c("mv"), "aria-live": "polite" }, fm == null ? "—" : String(fm)),
          h("button", { type: "button", className: c("b icon"), "aria-label": "Raise minimum fan speed", disabled: !on || busy || fm == null || fm >= 5,
            onClick: () => act("/fan", { speed: fm + 1 }) }, "+"),
          h("span", { className: c("muted") }, "now " + (amp.fan == null ? "—" : amp.fan) + " / 5"));
      },
    };
    // Consecutive buttons share one wrapping row; the band grid and fan are rows of their own.
    const ctlRows = [];
    let run = [];
    const flush = () => { if (run.length) { ctlRows.push(h("div", { key: "r" + ctlRows.length, className: c("btns") }, run)); run = []; } };
    controlOrder(cfg.controlOrder).forEach((id) => {
      const el = CONTROLS[id] && CONTROLS[id]();
      if (!el) return;
      if (Array.isArray(el)) run = run.concat(el);
      else { flush(); ctlRows.push(el); }
    });
    flush();
    const controls = ctlRows.length ? h("div", { className: c("group ctl"), role: "group", "aria-label": "Amplifier controls" }, ctlRows) : null;

    // ── header ──
    const pills = [];
    if (!connected) pills.push(h("span", { key: "c", className: c("pill " + (conn.state === "opening" ? "warn" : "")) },
      conn.state === "opening" ? "OPENING" : "OFFLINE"));
    if (connected && !cfg.ctlPower) pills.push(h("span", { key: "p", className: c("pill " + (on ? "ok" : amp.power === "off" ? "" : "warn")) },
      amp.powerOnInProgress ? "WAKING…" : on ? "ON" : amp.power === "off" ? "OFF" : "NO REPLY"));
    if (tci.enabled) pills.push(h("span", { key: "tci", className: c("pill " + (tci.connected ? "ok" : "warn")),
      title: tci.connected ? "TCI connected to Zeus at " + tci.target : "TCI not connected: " + (tci.error || "connecting to " + tci.target) },
      tci.connected ? (tci.tune ? "TCI TUNE" : "TCI") : "TCI WAIT"));
    if (on && amp.operate != null && !cfg.ctlOperate) pills.push(h("span", { key: "o", className: c("pill " + (amp.operate ? "acc" : "")) }, amp.operate ? "OPERATE" : "STANDBY"));
    if (tx) pills.push(h("span", { key: "t", className: c("pill tx") }, "TX"));
    if (tuning) pills.push(h("span", { key: "u", className: c("pill warn") }, "ATU TUNING"));
    if (fault) pills.push(h("span", { key: "f", className: c("pill tx") }, "FAULT " + fault.code));

    const header = h("div", { className: c("row spread") },
      h("div", { className: c("grow") },
        h("div", { className: c("title") }, "Elecraft KPA1500"),
        h("div", { className: c("sub") },
          "KW4EX v" + (status.version || "?") + " · " + (conn.target || "no connection set") +
          (amp.firmware ? " · fw " + amp.firmware : "") +
          (amp.band ? " · " + amp.band : "") +
          (on && amp.antenna ? " · ANT" + amp.antenna : ""))),
      h("div", { className: c("row") }, pills,
        h("button", { className: c("b icon"), type: "button", "aria-label": "Show the small view", title: "Show the small two-line view", onClick: () => setView("mini") }, "⇕"),
        h("button", { className: c("b icon"), type: "button", "aria-label": "Help", title: "Help: how to use this panel", onClick: () => setShowHelp(true) }, "?"),
        h("button", { className: c("b icon"), type: "button", "aria-label": "Settings", title: "Settings", onClick: openSettings }, "⚙")));

    const banners = [];
    if (!connected) {
      banners.push(h("div", { key: "dc", className: c("banner warn"), role: "status" },
        h("span", { className: c("grow") },
          !hasTarget ? "Set the amplifier's IP address or serial port in Settings."
            : conn.state === "opening" ? "Opening " + conn.target + "…"
            : "Not connected." + (conn.error ? " " + conn.error : "")),
        hasTarget && conn.state !== "opening"
          ? h("button", { className: c("b"), type: "button", disabled: busy, onClick: () => act("/connect") }, "Connect")
          : h("button", { className: c("b"), type: "button", onClick: openSettings }, "Settings")));
    }
    if (connected && amp.power === "unknown" && !amp.powerOnInProgress) {
      banners.push(h("div", { key: "nr", className: c("banner warn"), role: "status" },
        h("span", { className: c("grow") }, "No reply from the KPA1500 at " + conn.target + ". It may be off or asleep, or the address is wrong."),
        cfg.ctlPower ? h("button", { className: c("b good"), type: "button", disabled: busy, onClick: () => act("/power", { on: true }) }, "Power on") : null));
    }
    if (connected && on && amp.wakeOnLan === false && cfg.transport !== "serial") {
      banners.push(h("div", { key: "wl", className: c("banner acc"), role: "status" },
        h("span", { className: c("grow") }, "Wake-on-LAN is off in the amp, so it can't be powered on over the network."),
        h("button", { className: c("b"), type: "button", disabled: busy, onClick: () => act("/wol/enable") }, "Enable Wake-on-LAN")));
    }
    if (fault) {
      banners.push(h("div", { key: "f", className: c("banner tx"), role: "alert" },
        h("span", { className: c("grow") }, h("strong", null, "FAULT " + fault.code + " "), fault.name),
        cfg.ctlClearFault ? h("button", { className: c("b danger"), type: "button", disabled: busy, onClick: () => act("/fault/clear") }, "Clear fault") : null));
    }
    if (status.pendingBand) {
      banners.push(h("div", { key: "pb", className: c("banner acc"), role: "status" },
        "Band change to " + status.pendingBand + " waits until TX drops."));
    }
    // Standby-on-Tune works silently (no banner): the OPERATE button shows the state.
    if (status.otherController) {
      banners.push(h("div", { key: "oc", className: c("banner warn"), role: "alert" },
        h("span", { className: c("grow") }, h("strong", null, "Another program is also controlling the amp. "),
          "It keeps changing the amp's frequency. Close the Thetis bridge (or any other control program) — only one program should control the KPA1500.")));
    }
    const na = status.noAnt || { state: "off" };
    if (cfg.noAntEnabled && (na.state === "low" || na.state === "tx")) {
      const txNow = na.state === "tx";
      banners.push(h("div", { key: "na", className: c("banner " + (txNow ? "tx" : "warn")), role: "alert" },
        h("span", { className: c("grow") },
          h("strong", null, txNow ? "TRANSMITTING — NO ANTENNA? " : "NO ANTENNA? "),
          "RX " + Math.round(na.dbm) + " dBm on " + na.band + " (limit " + na.limit + " dBm). " +
          (txNow ? "Check the antenna / dummy load!" : "Check the antenna.") +
          (na.hold ? " Amp held in STANDBY." : "")),
        h("button", { className: c("b"), type: "button", disabled: busy, title: "A dummy load is connected on purpose: silence the warning on this band",
          onClick: () => act("/noant/dummy", { on: true }) }, "DUMMY OK")));
    } else if (cfg.noAntEnabled && na.state === "dummy") {
      banners.push(h("div", { key: "nd", className: c("banner acc"), role: "status" },
        h("span", { className: c("grow") }, "DUMMY OK on " + na.band + " — no-antenna warning silenced until a normal level returns."),
        h("button", { className: c("b"), type: "button", onClick: () => act("/noant/dummy", { on: false }) }, "Undo")));
    }
    if (na.scanning) {
      banners.push(h("div", { key: "sc", className: c("banner acc"), role: "status" },
        h("span", { className: c("grow") }, h("strong", null, "Band scan: "), na.scanStatus || "…"),
        h("button", { className: c("b"), type: "button", onClick: () => act("/noant/scan", { on: false }) }, "Stop")));
    }
    if (actErr) banners.push(h("div", { key: "e", className: c("banner warn"), role: "alert" }, actErr));

    // ── telemetry ──
    const swrLevel = amp.swr == null ? "" : amp.swr >= Math.max(cfg.swrWarn * 1.5, 3) ? "tx" : amp.swr >= cfg.swrWarn ? "warn" : "";
    const meters = [];
    if (cfg.showForward) meters.push(h(Meter, { key: "fw", label: "Fwd", value: amp.forwardW, max: cfg.meterMaxWatts,
      peak: peak.w, text: amp.forwardW == null ? "—" : amp.forwardW + " W",
      level: amp.forwardW != null && amp.forwardW > cfg.meterMaxWatts ? "tx" : "" }));
    if (cfg.showSwr) meters.push(h(Meter, { key: "swr", label: "SWR", value: amp.swr == null ? null : amp.swr - 1, max: 4,
      text: amp.swr == null ? "—" : num(amp.swr, 1) + ":1", level: swrLevel }));
    if (cfg.showReflected) meters.push(h(Meter, { key: "rf", label: "Refl", value: amp.reflectedW, max: Math.max(100, Math.round(cfg.meterMaxWatts / 10)),
      text: amp.reflectedW == null ? "—" : amp.reflectedW + " W" }));
    if (cfg.showInput) {
      // The amp reads 0 drive while bypassed (STANDBY / ATU tuning); then the
      // radio's own transmit power from TCI is shown, marked "radio".
      const dw = amp.driveW != null ? amp.driveW : amp.inputW;
      const src = amp.driveSource === "radio" ? " (radio)" : amp.driveSource === "bypass" ? " (bypass)" : "";
      meters.push(h(Meter, { key: "in", label: "Drive", value: dw, max: 100,
        text: dw == null ? "—" : Math.round(dw) + " W" + src,
        level: dw != null && dw > 90 ? "warn" : "" }));
    }
    if (cfg.showDissipation) meters.push(h(Meter, { key: "pd", label: "Diss", value: amp.dissipationW, max: cfg.meterMaxWatts,
      text: amp.dissipationW == null ? "—" : amp.dissipationW + " W" }));

    const tiles = [];
    const hot = amp.tempC != null && amp.tempC >= cfg.tempWarnC;
    if (cfg.showTemperature) tiles.push(Tile("Temp", tempText(amp.tempC, cfg.tempUnit), hot));
    if (cfg.showVoltage) tiles.push(Tile("PA volts", amp.volts == null ? "—" : num(amp.volts, 1) + " V"));
    if (cfg.showCurrent) tiles.push(Tile("PA amps", amp.amps == null ? "—" : num(amp.amps, 0) + " A"));
    if (cfg.showAmpFreq) {
      const vfoKhz = status.radio && status.radio.frequencyHz ? Math.round(status.radio.frequencyHz / 1000) : null;
      const off = amp.freqKhz != null && vfoKhz != null && Math.abs(amp.freqKhz - vfoKhz) > 10 && cfg.sendFrequency;
      const ampShown = amp.freqKhz != null ? mhz(amp.freqKhz)
        : amp.sentKhz != null ? (amp.sentKhz / 1000).toFixed(3) + " MHz (sent)" : "—";
      tiles.push(Tile(off ? "Amp freq ≠ VFO" : "Amp freq", ampShown, off));
    }
    if (cfg.showRxLevel) {
      const na = status.noAnt || {};
      const bad = na.state === "low" || na.state === "tx";
      const live = na.dbm != null ? na.dbm : tci.lastLevel;
      const text = !cfg.tciEnabled ? (cfg.radioSource === "flex" ? "n/a (Flex)" : "TCI off")
        : !tci.connected ? "TCI wait"
        : live == null ? "no data" : Math.round(live) + " dBm";
      tiles.push(Tile("RX level", text, bad));
    }
    if (cfg.showFan) tiles.push(Tile("Fan", amp.fan == null ? "—" : String(amp.fan) + " / 5"));
    if (cfg.showAtuStatus) {
      tiles.push(Tile("ATU", amp.atuInline == null ? "—" : tuning ? "TUNING" : amp.atuInline ? "IN-LINE" : "BYPASS"));
      tiles.push(Tile("Byp SWR", amp.bypassSwr == null ? "—" : num(amp.bypassSwr, 1) + ":1"));
    }

    if (cfg.showRxLevel && cfg.tciEnabled && tci.enabled && !tci.connected) {
      tiles.push(h("div", { key: "tciwhy", className: c("muted"), style: { gridColumn: "1 / -1" } },
        "RX level needs Zeus's TCI: " + (tci.error || "connecting to " + tci.target + "…")));
    }
    const telemetry = (meters.length || tiles.length) ? h("div", { className: c("group") },
      h("div", { className: c("glab") }, "Telemetry"),
      meters.length ? h("div", { className: c("meters") }, meters) : null,
      tiles.length ? h("div", { className: c("tiles") }, tiles) : null) : null;

    const logView = cfg.showLog ? h("div", { className: c("group") },
      h("div", { className: c("glab") }, "Event log"),
      h("div", { className: c("log"), role: "log", "aria-live": "off" },
        (log.length ? log : [{ ts: "", kind: "info", message: "No events yet." }]).map((e, i) =>
          h("div", { className: c("ln"), key: i },
            h("span", { className: c("ts") }, e.ts),
            h("span", { className: c("k-" + (e.kind || "info")) }, e.message))))) : null;

    // ── dialogs ──
    let overlay = null;
    if (confirm) {
      const isTune = confirm === "tune";
      const title = isTune ? "Start an ATU full-search tune?" : confirm === "off" ? "Turn the KPA1500 off?" : "Turn the KPA1500 on?";
      const text = isTune
        ? "This arms the KPA1500's tuner. It needs a carrier: after pressing Start, key a low-power carrier (or TUNE) on the radio. The amp bypasses itself while tuning. This feature never keys the radio."
        : confirm === "off" ? "The amplifier powers down and stops amplifying until it is turned back on."
        : "Sends a Wake-on-LAN packet (when the amp's MAC is known) and then ^ON1; once a second for up to 15 seconds. The amp's NET WAKE on LAN menu must be ON.";
      overlay = h("div", { className: c("overlay") },
        h("div", { className: c("card"), role: "dialog", "aria-modal": "true", "aria-label": title },
          h("h3", null, title),
          h("div", { className: c("muted") }, text),
          h("div", { className: c("btns") },
            h("button", { type: "button", className: c("b " + (confirm === "off" ? "danger" : "good")), autoFocus: true,
              onClick: () => {
                const k = confirm; setConfirm(null);
                if (k === "tune") act("/atu/tune"); else act("/power", { on: k === "on" });
              } }, isTune ? "Start" : confirm === "off" ? "Power off" : "Power on"),
            h("button", { type: "button", className: c("b"), onClick: () => setConfirm(null) }, "Cancel"))));
    } else if (showSettings && draft) {
      overlay = h("div", { className: c("overlay"), style: { alignItems: "flex-start", overflow: "auto" } },
        Settings({ draft, setDraft, ports, saveErr, connected, busy, found, mac: amp.mac, callBackend, tciStatus: tci, flexStatus: status.flex, webStatus: status.web,
          onFind: async () => {
            setFound({ searching: true });
            try { setFound(await call(callBackend, "POST", "/discover")); }
            catch (e) { setFound({ error: e.message || String(e) }); }
          },
          onHelp: () => setShowHelp(true), onCancel: () => setShowSettings(false), onSave: saveSettings,
          onConnect: () => act("/connect"), onDisconnect: () => act("/disconnect"),
          onRefreshPorts: async () => { try { setPorts((await call(callBackend, "GET", "/ports")) || []); } catch (e) { setPorts([]); } } }));
    }

    if (showHelp) overlay = h(HelpView, { version: status.version, onClose: () => setShowHelp(false) });

    if (view === "mini") {
      const items = new Set(String(cfg.miniItems || "power,status,freq,fwd,swr").split(","));
      const btns = [];
      if (items.has("power")) btns.push(...(CONTROLS.power(true) || []));
      if (items.has("status")) btns.push(...(CONTROLS.operate(true) || []));
      if (items.has("tunestby")) btns.push(...(CONTROLS.tunestby(true) || []));
      const vals = [];
      const val = (k, label, text, warn) => vals.push(h("span", { key: k, className: warn ? c("pill warn") : undefined },
        h("span", { className: c("mk") }, label), text));
      if (items.has("freq")) {
        const f = amp.freqKhz != null ? mhz(amp.freqKhz) : amp.sentKhz != null ? (amp.sentKhz / 1000).toFixed(3) + " MHz" : "—";
        const vfoKhz = status.radio && status.radio.frequencyHz ? Math.round(status.radio.frequencyHz / 1000) : null;
        const off = amp.freqKhz != null && vfoKhz != null && Math.abs(amp.freqKhz - vfoKhz) > 10 && cfg.sendFrequency;
        val("fr", "Freq", f, off);
      }
      if (items.has("band")) val("bd", "Band", amp.band || "—");
      if (items.has("fwd")) val("fw", "Fwd", amp.forwardW == null ? "—" : amp.forwardW + " W");
      if (items.has("swr")) val("sw", "SWR", amp.swr == null ? "—" : num(amp.swr, 1) + ":1", swrLevel === "warn" || swrLevel === "tx");
      return h("div", { ref: rootRef, className: ROOT + " " + c("mini"), role: "region", "aria-label": "Elecraft KPA1500 (small view)" },
        h("div", { className: c("mini1") }, btns, pills,
          h("span", { className: c("grow") }),
          h("button", { className: c("b icon"), type: "button", "aria-label": "Show the full panel", title: "Show the full panel", onClick: () => setView("full") }, "⇕"),
          h("button", { className: c("b icon"), type: "button", "aria-label": "Help", title: "Help", onClick: () => setShowHelp(true) }, "?"),
          h("button", { className: c("b icon"), type: "button", "aria-label": "Settings", title: "Settings", onClick: openSettings }, "⚙")),
        h("div", { className: c("mini2") }, vals),
        banners, overlay);
    }

    return h("div", { ref: rootRef, className: ROOT + (cfg.compact ? " " + c("compact") : ""), role: "region", "aria-label": "Elecraft KPA1500" },
      header, controls, banners, telemetry, logView, overlay);
  };
}

// ── Built-in help (plain language, for operators who are not programmers) ───
// Blocks: p, ul, ol, tip, warn, dl.  The same data draws the in-panel Help and
// the stand-alone web page ("Open as a web page").
const HELP = [
  { title: "Start here", open: true, blocks: [
    ["p", "This panel lets Zeus watch and control your Elecraft KPA1500 amplifier and its built-in tuner (ATU). It shows the amp's meters, gives you buttons for the things you do most, and makes the amp follow your radio's frequency by itself."],
    ["p", "To get going:"],
    ["ol", [
      "Turn the KPA1500 on and make sure it is on the same home network as this computer.",
      "Click the ⚙ gear at the top right of the panel. Under Connection, click Find amplifier, then Use next to your amp. Scroll down and click Save.",
      "Within a few seconds the POWER button lights green and the meters come alive.",
      "Change the frequency or band in Zeus. The amp follows within a second or two."]],
    ["tip", "A lit (coloured) button means \"on / in use now\". A plain button means off. A faint button is the other half of a pair. A dashed outline means the button is locked for the moment (the amp is transmitting, the tuner is searching, or the amp is off)."]]},

  { title: "Connecting to the amplifier", blocks: [
    ["p", "Network (recommended): in ⚙ Settings leave Network (UDP) selected, click Find amplifier, then Use. If you know the amp's address (it is on the amp's NET menu) you can type it instead. Leave the UDP port at 1500. Other programs on your network, such as Elecraft's own utility, can still talk to the amp at the same time."],
    ["p", "USB cable or a virtual serial port: choose Serial port, click Refresh, pick the port (COM3 on Windows, /dev/cu.usbserial-… on a Mac, /dev/ttyUSB0 on Linux) and set Baud to match the amp's SERIAL SPEED HOST menu. Only one program at a time can use a serial port."],
    ["p", "Switching the amp on from the panel: the panel learns the amp's network ID by itself the first time it sees the amp on. After that, POWER can wake the amp from off. The amp's menu item NET WAKE on LAN must be ON; if it is off, the panel shows an Enable Wake-on-LAN button. Click it once."],
    ["warn", "Only one program should control the amplifier at a time. If you also run the KPA1500 Thetis bridge, close it while you use this panel. Two programs steering one amp fight each other."]]},

  { title: "What the buttons do", blocks: [
    ["dl", [
      ["POWER", "Green when the amp is on. Click to turn it off or on."],
      ["OPERATE", "Blue when the amp is in OPERATE. Plain means STANDBY. STANDBY always works, even while transmitting."],
      ["TUNE STBY", "Blue when Standby on Tune is on (see below)."],
      ["ANT 1 / ANT 2", "The lit one is in use."],
      ["ATU", "Lit when the tuner is in line. Plain means bypassed."],
      ["ATU TUNE", "Amber while the tuner searches. Click it, press Start, then send a low-power carrier (TUNE) from the radio. Click again to cancel."],
      ["Band buttons", "The amp's current band. You normally do not need them, because the amp follows the radio."]]],
    ["p", "The top line shows the version, the amp's address, firmware, band and antenna, plus small tags: TCI (green when connected to Zeus), TX (red while transmitting) and FAULT. Coloured bars under the buttons are messages, such as a fault (with a Clear fault button)."],
    ["p", "Drive shows the amp's own input reading in OPERATE. During TUNE, when the amp is bypassed, it shows the power passing through, from the radio over TCI (marked \"(radio)\") or from the amp's own meter (marked \"(bypass)\")."]]},

  { title: "The amp follows your radio", blocks: [
    ["p", "When you change frequency or band in Zeus, the panel sends the new frequency to the amp, and the amp's tuner recalls the setting it saved for that spot. With split on, the amp follows the transmit VFO (this needs TCI, below)."],
    ["ul", [
      "The small grey line under the band buttons shows what Zeus reported, for example \"Zeus: 40m · 7074.0 kHz · amp follows the VFO\".",
      "The Amp freq tile turns amber (\"Amp freq ≠ VFO\") when the amp is more than 10 kHz away from your radio.",
      "Following is on by default. You can switch it off in Settings (Amp follows the VFO).",
      "Nothing is sent while you transmit. It is sent just after you stop."]],
    ["p", "Using a FlexRadio (for example Zeus Link Flex)? If the amp doesn't follow the VFO, open ⚙ Settings, find Radio, and set \"My radio is\" to \"A FlexRadio\". Leave the choice below it on \"The Flex that Zeus is connected to\" and the panel follows that radio. If you have several radios on the network (Anan, Hermes Lite, Flex 6700, Flex 6300), click \"Choose a different Flex…\" and pick the right one from the list. Everyone else leaves it on \"Any radio\". The panel only listens to the radio and never changes it. For the receive level and the No-antenna check, also tick Use Zeus TCI in Settings and set its port to the one Zeus shows as Flex TCI (normally 40002)."],
    ["tip", "Number boxes in Settings (ports and so on) change only when you type in them. The mouse wheel and arrow keys do nothing, so you can't change one by accident."],
    ["tip", "If the grey line says \"(TCI says …, ignored)\", Zeus's TCI connection reported a different frequency from the one Zeus shows. The panel uses the one Zeus shows."]]},

  { title: "Standby on Tune (the TUNE STBY button)", blocks: [
    ["p", "When it is on (the button is blue), pressing TUNE in Zeus puts the amp in STANDBY first, so the tuner carrier never goes through the amp. When TUNE ends, OPERATE comes back by itself. There are no pop-ups. The button remembers its setting."],
    ["p", "It needs Zeus TCI. To set that up:"],
    ["ol", [
      "In Zeus's own settings (not this panel's), turn TCI on. Zeus's TCI port is normally 40001.",
      "In this panel's ⚙ Settings, under Standby on Tune, tick Use Zeus TCI. Leave the host 127.0.0.1, set the port to 40001 (or your Zeus's number) and leave the receiver at 0. Click Save.",
      "A green TCI tag appears on the top line. If it says TCI WAIT, the line in Settings tells you why. Usually TCI is still off in Zeus, or the port number is different."]],
    ["p", "A ⚠ on the TUNE STBY button means Zeus TCI is not connected, so the button cannot do its job yet."]]},

  { title: "\"No antenna?\" warning (optional)", blocks: [
    ["p", "If the receive level on a band drops below a limit, it usually means no antenna is connected, and the panel shows a warning. It can also hold the amp in STANDBY. It needs TCI (see above)."],
    ["ul", [
      "In Settings, under No antenna? check, tick Warn when the receive level says no antenna and choose Warn only or Warn and keep the amp in STANDBY.",
      "The easiest choice is to leave Auto-learn ticked. The panel learns each band's normal noise while you listen.",
      "Or use Learn this band (antenna connected) or (antenna disconnected), or type a limit in dBm for a band. A number you type is never changed automatically. Leave a box empty to switch the check off for that band.",
      "Scan all bands now tunes the receiver across the bands to set every limit, then puts your frequency back.",
      "When you use a dummy load on purpose, click DUMMY OK on the warning."]],
    ["p", "A switched-in attenuator, the preamp being off, a very narrow filter or a dead band at night can all lower the level and cause a false warning."]]},

  { title: "Choosing what the panel shows", blocks: [
    ["ul", [
      "Telemetry shown: untick any meter or reading you do not want.",
      "Controls at the top: tick or untick a button to show or hide it. Press ▲ or ▼ to move it. Default order puts them back.",
      "Display: Compact layout makes the panel smaller. You can also choose °C or °F and the warning points for temperature and SWR.",
      "Behaviour: choose whether to ask before power off or on, and whether the amp follows the VFO."]],
    ["p", "After changing anything in Settings, scroll down and click Save."]]},

  { title: "Using it in a web browser", blocks: [
    ["p", "The same panel is also available as a web page, handy when Zeus is full screen or you want a bigger view. While Zeus is running, open a web browser on the same computer and go to http://127.0.0.1:8081/ . The full help page is at http://127.0.0.1:8081/help ."],
    ["ul", [
      "Everything works the same as in Zeus: watch the meters, press the buttons, change Settings.",
      "Only this computer can open it. Phones and other computers cannot.",
      "To turn it off or change the port number, open Settings in the panel and look under Browser page, then click Save. If 8081 is in use by another program, pick another number such as 8082."]],
    ["tip", "Zeus must be running with the KPA1500 feature loaded. If the page does not open, check the Browser page line in Settings."]]},
  { title: "A safe first test", blocks: [
    ["p", "Use a dummy load or a well-matched antenna and keep the radio at low power (about 10 W) for the transmit steps."],
    ["ol", [
      "With nothing transmitting, check that band, antenna, ATU, temperature and volts match the amp's front panel.",
      "Change frequency, then band, in Zeus. The amp follows. Amp freq matches your VFO.",
      "With TCI on, the RX level shows a dBm number that changes with band noise.",
      "With the amp in OPERATE and TUNE STBY on, press TUNE in Zeus at about 10 W. The amp goes to STANDBY, Drive shows about 10 W, and when TUNE stops OPERATE returns.",
      "While transmitting, the ANT, ATU and band buttons are locked (dashed outline).",
      "Try ATU TUNE with low power. The tuner searches and finishes.",
      "POWER off turns the amp off. POWER on wakes it within about 15 seconds."]],
    ["tip", "If anything misbehaves, click OPERATE to put the amp in STANDBY, then note which step failed and what you saw."]]},

  { title: "If something goes wrong", blocks: [
    ["dl", [
      ["OFFLINE or NO REPLY", "Is the amp on? Use Find amplifier in Settings. On a Mac, allow Local Network for Zeus (System Settings › Privacy & Security › Local Network). On Windows, allow Zeus through the firewall (Private networks)."],
      ["Find amplifier finds nothing", "The computer and the amp must be on the same home network. Some Wi-Fi routers block searches. Type the amp's address instead (from its NET menu)."],
      ["The amp does not follow Zeus", "Look at the grey line under the band buttons and check that Amp follows the VFO is ticked in Settings. Close any other program that controls the amp, such as the Thetis bridge or a logger that sets frequency. Turn the Event log on in Settings and look for \"Frequency … sent to amp\"."],
      ["Yellow bar: another program is also controlling the amp", "Something else keeps changing the amp's frequency, usually the Thetis bridge. Close it."],
      ["TCI WAIT, or RX level says \"TCI off\"", "Turn TCI on in Zeus and check the port number (40001)."],
      ["TUNE STBY shows ⚠, or TUNE does not put the amp in STANDBY", "Zeus TCI is not connected. See Standby on Tune above."],
      ["Drive is blank during TUNE", "It needs TCI connected (the green TCI tag)."],
      ["POWER on does not wake the amp", "Turn on NET WAKE on LAN in the amp, or turn the amp on once from its front panel so the panel learns its network ID."],
      ["\"No antenna?\" when the antenna is fine", "Check the attenuator and preamp. Lower that band's limit, or click Learn this band (antenna connected)."],
      ["Serial list is empty or port busy", "Check the USB cable and click Refresh. Another program may have the port open; close it or use the network connection."]]],
    ["p", "Asking for help: take a picture of the panel (Windows: Windows + Shift + S; Mac: Command + Shift + 4) and note what you did just before."]]},

  { title: "Words explained", blocks: [
    ["dl", [
      ["OPERATE / STANDBY", "OPERATE: the amp amplifies. STANDBY: it passes the signal through without amplifying."],
      ["ATU", "The amp's built-in antenna tuner. In line = working. Bypassed = out of the way."],
      ["VFO", "The radio's tuning frequency (VFO A is the normal one; VFO B is used for the transmit side in split)."],
      ["TCI", "A connection built into Zeus that lets other programs get radio information, such as tune, split and receive level. It is off until you turn it on in Zeus."],
      ["UDP port 1500", "How this panel talks to the amp over the network. You normally never need to change it."],
      ["Wake-on-LAN", "A network signal that switches the amp on from off."],
      ["Drive", "The power going into the amp from the radio."]]]]},

  { title: "About, licence and warning", blocks: [
    ["warn", "No warranty. Use at your own risk. This add-on is shared by one radio operator, \"as is\". There is no warranty of any kind: no promise that it works, that it is safe, or that it suits your equipment or purpose. Amplifiers, radios and antennas can be damaged, and RF can be dangerous. You are responsible for checking that it behaves correctly with your own station and for operating within your licence. The author is not liable for any damage or loss. It is not made, approved or supported by Elecraft, FlexRadio or the Zeus project."],
    ["p", "Elecraft KPA1500 for Zeus, by KW4EX. Source and downloads: github.com/kw4ex/zeus-amp. Licence: GPL-2.0-or-later. \"Elecraft\" and \"KPA1500\" are names of Elecraft, Inc.; this is an independent, community-made add-on."]]},
];

function helpBlock(b, key) {
  const [kind, body] = b;
  if (kind === "p") return h("p", { key, className: c("hp") }, body);
  if (kind === "ul") return h("ul", { key, className: c("hl") }, body.map((t, i) => h("li", { key: i }, t)));
  if (kind === "ol") return h("ol", { key, className: c("hl") }, body.map((t, i) => h("li", { key: i }, t)));
  if (kind === "tip") return h("div", { key, className: c("hnote") }, body);
  if (kind === "warn") return h("div", { key, className: c("hnote hwarn") }, body);
  return h("dl", { key, className: c("hdl") }, body.map(([t, d], i) =>
    [h("dt", { key: "t" + i }, t), h("dd", { key: "d" + i }, d)]));
}

export function helpPageHtml(version) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blk = (b) => {
    const [k, body] = b;
    if (k === "p") return "<p>" + esc(body) + "</p>";
    if (k === "ul" || k === "ol") return "<" + k + ">" + body.map((t) => "<li>" + esc(t) + "</li>").join("") + "</" + k + ">";
    if (k === "tip") return "<div class=\"note\">" + esc(body) + "</div>";
    if (k === "warn") return "<div class=\"note warn\">" + esc(body) + "</div>";
    return "<dl>" + body.map(([t, d]) => "<dt>" + esc(t) + "</dt><dd>" + esc(d) + "</dd>").join("") + "</dl>";
  };
  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Elecraft KPA1500 for Zeus – Help</title><style>" +
    "body{font:16px/1.5 system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#1b232c;max-width:46rem;margin:2rem auto;padding:0 1rem}" +
    "h1{font-size:1.7rem;margin:0 0 .2rem}h2{font-size:1.25rem;margin:1.8rem 0 .4rem;padding-bottom:.2rem;border-bottom:2px solid #1f5fbf;color:#1f5fbf}" +
    ".sub{color:#55616d;margin:0 0 1rem}.note{background:#eef3fa;border:1px solid #c9d7ec;border-radius:6px;padding:.6rem .8rem;margin:.6rem 0}" +
    ".warn{background:#fff6e0;border-color:#e0a72e}dt{font-weight:700;margin-top:.6rem}dd{margin:0 0 0 1rem}li{margin:.2rem 0}" +
    "nav a{display:inline-block;margin:0 .8rem .2rem 0}@media print{nav{display:none}}</style></head><body>" +
    "<h1>Elecraft KPA1500 for Zeus</h1><p class=\"sub\">Help for operators, version " + esc(version || "") + " &middot; KW4EX</p><nav>" +
    HELP.map((s, i) => "<a href=\"#s" + i + "\">" + esc(s.title) + "</a>").join("") + "</nav>" +
    HELP.map((s, i) => "<h2 id=\"s" + i + "\">" + esc(s.title) + "</h2>" + s.blocks.map(blk).join("")).join("") +
    "</body></html>";
}

function HelpView(p) {
  const [note, setNote] = useState(null);
  const page = () => helpPageHtml(p.version);
  const openPage = () => {
    setNote(null);
    try {
      const url = URL.createObjectURL(new Blob([page()], { type: "text/html" }));
      const w = window.open(url, "_blank");
      if (!w) setNote("Your browser would not open a new window. Use \"Save as a file\" instead, then open the saved file.");
    } catch (e) { setNote("Could not open a page here. Use \"Save as a file\" instead."); }
  };
  const savePage = () => {
    setNote(null);
    try {
      const url = URL.createObjectURL(new Blob([page()], { type: "text/html" }));
      const a = document.createElement("a");
      a.href = url; a.download = "KPA1500-for-Zeus-help.html";
      document.body.appendChild(a); a.click(); a.remove();
      setNote("Saved as KPA1500-for-Zeus-help.html (look in your Downloads folder). Double-click it to read it in your browser.");
    } catch (e) { setNote("Saving a file is not possible from here. The same help is in this panel."); }
  };
  return h("div", { className: c("overlay"), style: { alignItems: "flex-start", overflow: "auto" } },
    h("div", { className: c("card"), role: "dialog", "aria-modal": "true", "aria-label": "KPA1500 help", style: { maxWidth: "620px", width: "100%" } },
      h("div", { className: c("row spread") }, h("h3", null, "KPA1500 help"),
        h("button", { type: "button", className: c("b"), onClick: p.onClose, autoFocus: true }, "Close")),
      h("div", { className: c("row") },
        h("button", { type: "button", className: c("b"), onClick: openPage }, "Open as a web page"),
        h("button", { type: "button", className: c("b"), onClick: savePage }, "Save as a file")),
      note ? h("div", { className: c("muted"), role: "status" }, note) : null,
      HELP.map((s, i) => h("details", { key: i, className: c("hsec"), open: !!s.open },
        h("summary", null, s.title), s.blocks.map((b, j) => helpBlock(b, j)))),
      h("div", { className: c("btns") }, h("button", { type: "button", className: c("b"), onClick: p.onClose }, "Close"))));
}

// Live per-band limits for the "No antenna?" check, inside Settings.
function NumBox(props) {
  const { id, value, min, max, onCommit } = props;
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(String(value)); }, [value, editing]);
  const commit = () => {
    setEditing(false);
    let n = parseInt(text, 10);
    if (isNaN(n)) n = value;
    n = Math.min(max, Math.max(min, n));
    setText(String(n));
    if (n !== value) onCommit(n);
  };
  return h("input", {
    id, className: c("in"), type: "text", inputMode: "numeric", autoComplete: "off", value: text,
    title: "Type a number from " + min + " to " + max + ", then press Enter or click elsewhere.",
    onFocus: () => setEditing(true),
    onChange: (e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)),
    onBlur: commit,
    onKeyDown: (e) => {
      if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    },
    onWheel: (e) => e.preventDefault(),
  });
}

// Radio source: what Zeus reports, or a FlexRadio read directly (several radios can be on the network).
function FlexSettings(props) {
  const { draft, set, callBackend, status, id } = props;
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const flex = draft.radioSource === "flex";
  const search = async () => {
    setBusy(true);
    try { setList(await call(callBackend, "POST", "/flex/discover")); }
    catch (e) { setList({ ok: false, found: [], message: String((e && e.message) || e) }); }
    setBusy(false);
  };
  useEffect(() => { if (flex && !list) search(); }, [flex]);
  const found = (list && list.found) || [];
  const label = (r) => (r.model || "FlexRadio") + (r.nickname ? " \"" + r.nickname + "\"" : "") + " · serial " + r.serial + " · " + r.ip;
  return h("div", { key: "flexbox" },
    Field("My radio is", id("radioSource"), h("select", { id: id("radioSource"), className: c("in"), value: draft.radioSource,
      onChange: (e) => set("radioSource", e.target.value) },
      h("option", { value: "zeus" }, "Any radio (Anan, Hermes Lite, …) — use what Zeus reports"),
      h("option", { value: "flex" }, "A FlexRadio — read it directly"))),
    h("div", { className: c("muted") }, flex
      ? "Use this for a FlexRadio (e.g. Zeus Link Flex) if the amp doesn't follow the VFO. The panel only listens to the radio; it never changes it."
      : "Anan, Hermes Lite and most other radios work with this setting."),
    flex ? [
      h("div", { key: "fxpick", className: c("row") },
        h("select", { id: id("flexSerial"), className: c("in grow"), value: draft.flexSerial, onChange: (e) => set("flexSerial", e.target.value) },
          [h("option", { key: "", value: "" }, "The Flex that Zeus is connected to (recommended)")]
            .concat(found.map((r) => h("option", { key: r.serial, value: r.serial }, label(r) + (r.zeus ? " · Zeus is using this" : ""))))
            .concat(draft.flexSerial && !found.some((r) => r.serial === draft.flexSerial)
              ? [h("option", { key: "cur", value: draft.flexSerial }, "serial " + draft.flexSerial + " (not seen just now)")] : [])),
        h("button", { type: "button", className: c("b"), disabled: busy, onClick: search }, busy ? "Searching…" : "Choose a different Flex…")),
      list && list.message ? h("div", { key: "fxmsg", className: c("err") }, list.message) : null,
      list && list.ok && !found.length ? h("div", { key: "fxnone", className: c("muted") }, "No FlexRadio answered. Check it is on this network, or type its address below.") : null,
      Field("Radio address (optional)", id("flexHost"), h("input", { id: id("flexHost"), className: c("in"), value: draft.flexHost,
        placeholder: "only if it can't be found automatically", onChange: (e) => set("flexHost", e.target.value) })),
      h("div", { key: "fxst", className: c(status && status.connected ? "muted" : "err"), role: "status" },
        !status ? "FlexRadio status: not started yet — click Save."
          : status.connected ? "FlexRadio status: connected to " + (status.radio ? label(status.radio) : status.target) + "."
          : "FlexRadio status: not connected — " + (status.error || status.notice || "looking…")),
    ] : null);
}

function NoAntBands(props) {
  const { callBackend, below, above } = props;
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    let timer = null;
    const tick = async () => {
      try { const d = await call(callBackend, "GET", "/noant"); if (live) setData(d); } catch (e) { /* keep last */ }
      if (live) timer = setTimeout(tick, 1000);
    };
    tick();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, []);

  const post = async (path, body) => {
    setBusy(true);
    try { const r = await call(callBackend, "POST", path, body); setMsg(r && r.message ? r.message : "Done."); }
    catch (e) { setMsg(e.message || String(e)); }
    finally { setBusy(false); }
  };

  if (!data) return h("div", { className: c("muted") }, "Loading band limits…");
  const cur = data.current || {};
  const levelText = cur.dbm == null ? "no reading yet" : Math.round(cur.dbm) + " dBm";

  const commit = (band, text) => {
    const t = String(text).trim();
    setEdits((e) => { const n = { ...e }; delete n[band]; return n; });
    if (t === "") return post("/noant/band", { band, limit: null, reset: false });
    const v = Number(t);
    if (!Number.isFinite(v)) { setMsg("Type a number such as -105, or leave it empty for no check."); return null; }
    return post("/noant/band", { band, limit: Math.round(v), reset: false });
  };

  return h("div", { className: c("group"), style: { borderTop: "none", paddingTop: 0 } },
    h("div", { className: c("muted") },
      cur.band ? ("Now on " + cur.band + ": receive level " + levelText + (cur.limit != null ? ", limit " + cur.limit + " dBm" : ", no check on this band")) + "."
        : "The radio is not on a ham band."),
    h("div", { className: c("btns") },
      h("button", { type: "button", className: c("b"), disabled: busy || !cur.band,
        title: "Antenna connected: limit = this band's noise floor − " + below + " dB",
        onClick: () => post("/noant/learn", { antennaConnected: true }) }, "Learn this band (antenna connected)"),
      h("button", { type: "button", className: c("b"), disabled: busy || !cur.band,
        title: "Antenna disconnected: limit = equipment noise + " + above + " dB",
        onClick: () => post("/noant/learn", { antennaConnected: false }) }, "Learn this band (antenna disconnected)")),
    h("div", { className: c("btns") },
      cur.scanning
        ? h("button", { type: "button", className: c("b danger"), onClick: () => post("/noant/scan", { on: false }) }, "Stop band scan")
        : h("button", { type: "button", className: c("b"), disabled: busy || !cur.canScan,
            title: cur.canScan ? "Tunes the radio to the middle of each band's phone segment, measures the noise, sets the limit, then restores your frequency"
              : "Zeus has not given this feature permission to tune the radio",
            onClick: () => post("/noant/scan", { on: true }) }, "Scan all bands now (antenna connected)"),
      h("button", { type: "button", className: c("b"), disabled: busy, onClick: () => post("/noant/defaults") }, "Default limits")),
    cur.scanStatus ? h("div", { className: c("muted"), role: "status" }, "Scan: " + cur.scanStatus) : null,
    msg ? h("div", { className: c("muted"), role: "status" }, msg) : null,
    h("table", { className: c("ntab") },
      h("thead", null, h("tr", null,
        h("th", null, "Band"), h("th", null, "Limit (dBm)"), h("th", null, "How it was set"), h("th", null, "Noise floor"), h("th", null, ""))),
      h("tbody", null, (data.bands || []).map((b) => {
        const editing = Object.prototype.hasOwnProperty.call(edits, b.band);
        return h("tr", { key: b.band, className: b.band === cur.band ? c("cur") : undefined },
          h("td", null, b.band),
          h("td", null, h("input", { className: c("in"), type: "text", inputMode: "numeric", "aria-label": b.band + " limit in dBm, empty for no check",
            value: editing ? edits[b.band] : (b.limit == null ? "" : String(b.limit)), placeholder: "off",
            onChange: (e) => { const v = e.target.value; setEdits((x) => ({ ...x, [b.band]: v })); },
            onBlur: (e) => { if (editing) commit(b.band, e.target.value); },
            onKeyDown: (e) => { if (e.key === "Enter") e.target.blur(); } })),
          h("td", null, SOURCE_TEXT[b.source] || b.source),
          h("td", null, b.floor == null ? "—" : Math.round(b.floor) + " dBm"),
          h("td", null, h("button", { type: "button", className: c("b"), disabled: busy || b.source === "default",
            "aria-label": "Reset " + b.band + " to the default limit", onClick: () => post("/noant/band", { band: b.band, limit: null, reset: true }) }, "Reset")));
      }))),
    h("div", { className: c("muted") },
      "Empty = no check on that band. A limit you type is never changed automatically. " +
      "Things that lower the receive level and can cause a false warning: the attenuator, preamp off, a very narrow filter, or a dead band at night."));
}

function Settings(p) {
  const { draft, setDraft, ports, saveErr, connected, busy } = p;
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const id = (k) => ROOT + "-cfg-" + k;
  // Number boxes are plain text boxes that accept digits only. The mouse wheel and the
  // up/down arrow keys do nothing, so a number can only be changed by typing it.
  const numIn = (k, min, max) => h(NumBox, { key: k, id: id(k), value: draft[k], min, max, onCommit: (v) => set(k, v) });
  const portList = ports.slice();
  if (draft.serialPort && portList.indexOf(draft.serialPort) < 0) portList.unshift(draft.serialPort);

  return h("div", { className: c("card"), role: "dialog", "aria-modal": "true", "aria-label": "KPA1500 settings", style: { maxWidth: "560px", width: "100%" } },
    h("div", { className: c("row spread") }, h("h3", null, "KPA1500 settings"),
      p.onHelp ? h("button", { type: "button", className: c("b"), onClick: p.onHelp }, "Help — how to use this panel") : null),

    h("div", { className: c("glab") }, "Connection"),
    h("div", { className: c("row"), role: "radiogroup", "aria-label": "Connection type" },
      h("label", { className: c("chk") }, h("input", { type: "radio", name: id("tr"), checked: draft.transport !== "serial", onChange: () => set("transport", "udp") }), "Network (UDP)"),
      h("label", { className: c("chk") }, h("input", { type: "radio", name: id("tr"), checked: draft.transport === "serial", onChange: () => set("transport", "serial") }), "Serial port (USB or virtual)")),
    draft.transport !== "serial" ? [
      Field("Amp IP address", id("host"), h("div", { className: c("row") },
        h("input", { id: id("host"), className: c("in grow"), value: draft.host, placeholder: "192.168.0.175",
          onChange: (e) => set("host", e.target.value) }),
        h("button", { type: "button", className: c("b"), disabled: !!(p.found && p.found.searching), onClick: p.onFind },
          p.found && p.found.searching ? "Searching…" : "Find amplifier"))),
      p.found && !p.found.searching ? h("div", { key: "found", className: c("muted"), role: "status" },
        p.found.error ? p.found.error
          : p.found.found && p.found.found.length
            ? p.found.found.map((f) => h("div", { key: f.ip, className: c("row") },
                h("span", { className: c("grow") }, f.ip + (f.serial ? " · serial " + f.serial : "") + (f.firmware ? " · fw " + f.firmware : "") + (f.boot ? " · boot block" : "")),
                h("button", { type: "button", className: c("b"), onClick: () => setDraft({ ...draft, host: f.ip, ampMac: draft.ampMac || f.mac || "" }) }, "Use")))
            : "No KPA1500 answered (searched " + (p.found.searched || "?") + ").") : null,
      Field("UDP port", id("netPort"), numIn("netPort", 1, 65535)),
      h("div", { key: "udpnote", className: c("muted") }, "UDP keeps no session, so the Elecraft utility and other programs can talk to the amp at the same time."),
    ] : [
      Field("Serial port", id("serialPort"), h("div", { className: c("row") },
        h("select", { id: id("serialPort"), className: c("in grow"), value: draft.serialPort, onChange: (e) => set("serialPort", e.target.value) },
          [h("option", { key: "", value: "" }, portList.length ? "choose…" : "no ports found")].concat(portList.map((n) => h("option", { key: n, value: n }, n)))),
        h("button", { type: "button", className: c("b"), onClick: p.onRefreshPorts }, "Refresh"))),
      Field("Baud", id("baud"), h("select", { id: id("baud"), className: c("in"), value: draft.baud, onChange: (e) => set("baud", Number(e.target.value)) },
        BAUDS.map((b) => h("option", { key: b, value: b }, String(b))))),
      h("div", { key: "sernote", className: c("muted") }, "Any serial port works (COM3 on Windows, /dev/cu.usbserial-… on a Mac), including a virtual serial-port emulator. Only one program can open a serial port at a time; use a port splitter to share it."),
    ],
    Field("Poll interval (ms)", id("pollMs"), numIn("pollMs", 50, 2000, 10)),
    h("div", { className: c("checks") }, Check(draft, setDraft, "autoConnect", "Connect automatically")),
    h("div", { className: c("btns") },
      h("button", { type: "button", className: c("b"), disabled: busy, onClick: p.onConnect }, "Connect"),
      h("button", { type: "button", className: c("b"), disabled: busy || !connected, onClick: p.onDisconnect }, "Disconnect"),
      h("span", { className: c("muted") }, "Save first if you changed the connection.")),

    h("div", { className: c("glab") }, "Remote power-on"),
    Field("Amp MAC address", id("ampMac"), h("input", { id: id("ampMac"), className: c("in"), value: draft.ampMac,
      placeholder: p.mac || "learned when the amp is on", onChange: (e) => set("ampMac", e.target.value) })),
    Field("Wake-on-LAN port", id("wolPort"), numIn("wolPort", 1, 65535)),

    h("div", { className: c("glab") }, "Behaviour"),
    h("div", { className: c("checks") },
      Check(draft, setDraft, "sendFrequency", "Amp follows the VFO (^FR: band + ATU recall; VFO B in split via TCI)"),
      Check(draft, setDraft, "bandFollow", "Also send band (^BN)"),
      Check(draft, setDraft, "standbyOnConnect", "Standby on connect"),
      Check(draft, setDraft, "confirmPowerOff", "Confirm power off"),
      Check(draft, setDraft, "confirmPowerOn", "Confirm power on")),
    Field("Frequency step (kHz)", id("frequencyStepKhz"), numIn("frequencyStepKhz", 1, 100)),

    h("div", { className: c("glab") }, "Radio"),
    h(FlexSettings, { key: "flexset", draft, set, callBackend: p.callBackend, status: p.flexStatus, id }),

    h("div", { className: c("glab") }, "Browser page"),
    h("div", { className: c("checks") }, Check(draft, setDraft, "webEnabled", "Also show this panel on a web page (this computer only)")),
    draft.webEnabled ? Field("Web page port", id("webPort"), numIn("webPort", 1024, 65535)) : null,
    h("div", { key: "webst", className: c(p.webStatus && p.webStatus.error ? "err" : "muted"), role: "status" },
      !draft.webEnabled ? "Off."
        : !p.webStatus ? "Not started yet — click Save."
        : p.webStatus.running ? "Open " + p.webStatus.url + " in a web browser on this computer (for help: " + p.webStatus.url + "help). Only this computer can reach it."
        : p.webStatus.error ? "Could not start: " + p.webStatus.error + " Try another port number."
        : "Starting… Click Save if you just changed it."),

    h("div", { className: c("glab") }, "Standby on Tune"),
    h("div", { className: c("checks") },
      Check(draft, setDraft, "standbyOnTune", "Enable Standby-on-Tune (same as the TUNE STBY button)"),
      Check(draft, setDraft, "restoreOperateAfterTune", "Return to OPERATE afterwards"),
      Check(draft, setDraft, "tciEnabled", "Use Zeus TCI for TUNE, split VFO and receive level (like the Thetis bridge)"),
      Check(draft, setDraft, "autoTuneDetect", "Also trigger when Zeus mode reports TUNE")),
    draft.tciEnabled ? [
      Field("TCI host", id("tciHost"), h("input", { id: id("tciHost"), className: c("in"), value: draft.tciHost, onChange: (e) => set("tciHost", e.target.value) })),
      Field("TCI port", id("tciPort"), numIn("tciPort", 1, 65535)),
      Field("TCI receiver", id("tciReceiver"), numIn("tciReceiver", 0, 7)),
      h("div", { key: "tcist", className: c(p.tciStatus && p.tciStatus.connected ? "muted" : "err"), role: "status" },
        !p.tciStatus || !p.tciStatus.enabled ? "TCI status: not started yet — click Save."
          : p.tciStatus.connected ? "TCI status: connected to Zeus at " + p.tciStatus.target + ". " +
            (p.tciStatus.levels > 0
              ? "Receive level: " + Math.round(p.tciStatus.lastLevel) + " dBm (" + p.tciStatus.levels + " reports, channel " + p.tciStatus.levelChannel + ")."
              : "Zeus has not sent any receive-level reports yet.") +
            " Transmit-power reports: " + (p.tciStatus.powerReports || 0) + "."
          : "TCI status: not connected — " + (p.tciStatus.error || "trying " + p.tciStatus.target + "…") +
            ". In Zeus's settings turn TCI on and use the same port here (Zeus's default is 40001)."),
    ] : null,

    h("div", { className: c("glab") }, "No antenna? check"),
    h("div", { className: c("checks") },
      Check(draft, setDraft, "noAntEnabled", "Warn when the receive level says no antenna"),
      Check(draft, setDraft, "noAntAutoLearn", "Auto-learn each band's noise floor while listening")),
    Field("When it warns", id("noAntAction"), h("select", { id: id("noAntAction"), className: c("in"), value: draft.noAntAction,
      onChange: (e) => set("noAntAction", e.target.value) },
      h("option", { value: "warn" }, "Warn only"),
      h("option", { value: "standby" }, "Warn and keep the amp in STANDBY"))),
    Field("Limit below noise floor (dB)", id("noAntBelowFloorDb"), numIn("noAntBelowFloorDb", 1, 30)),
    Field("Limit above no-antenna noise (dB)", id("noAntAboveEquipDb"), numIn("noAntAboveEquipDb", 1, 30)),
    draft.tciEnabled ? null : h("div", { key: "natci", className: c("muted") },
      (draft.radioSource === "flex"
        ? "This check needs a receive level: tick \"Use Zeus TCI\" above and use the port shown as Flex TCI in Zeus's settings (default 40002)."
        : "This check needs the receive level from Zeus: tick \"Use Zeus TCI\" above and set Zeus's TCI port (Zeus's default is 40001).")),
    h(NoAntBands, { key: "nab", callBackend: p.callBackend, below: draft.noAntBelowFloorDb, above: draft.noAntAboveEquipDb }),

    h("div", { className: c("glab") }, "Telemetry shown"),
    h("div", { className: c("checks") },
      Check(draft, setDraft, "showForward", "Forward power"),
      Check(draft, setDraft, "showSwr", "SWR"),
      Check(draft, setDraft, "showReflected", "Reflected power"),
      Check(draft, setDraft, "showInput", "Drive (input) power"),
      Check(draft, setDraft, "showDissipation", "PA dissipation"),
      Check(draft, setDraft, "showTemperature", "Temperature"),
      Check(draft, setDraft, "showVoltage", "PA voltage"),
      Check(draft, setDraft, "showCurrent", "PA current"),
      Check(draft, setDraft, "showFan", "Fan speed"),
      Check(draft, setDraft, "showAtuStatus", "ATU status"),
      Check(draft, setDraft, "showAmpFreq", "Amp frequency"),
      Check(draft, setDraft, "showRxLevel", "Receive level (no-antenna check)"),
      Check(draft, setDraft, "showLog", "Event log")),

    h("div", { className: c("glab") }, "Controls at the top — tick to show, ▲▼ to arrange"),
    ControlOrderEditor(draft, setDraft),
    MiniItemsEditor(draft, setDraft),
    h("div", { className: c("checks") },
      Check(draft, setDraft, "ctlClearFault", "Clear-fault button (in the fault warning)")),

    h("div", { className: c("glab") }, "Display"),
    h("div", { className: c("checks") }, Check(draft, setDraft, "compact", "Compact layout")),
    Field("Temperature unit", id("tempUnit"), h("select", { id: id("tempUnit"), className: c("in"), value: draft.tempUnit, onChange: (e) => set("tempUnit", e.target.value) },
      h("option", { value: "C" }, "°C"), h("option", { value: "F" }, "°F"))),
    Field("Power meter full scale (W)", id("meterMaxWatts"), numIn("meterMaxWatts", 100, 3000, 50)),
    Field("SWR warning", id("swrWarn"), numIn("swrWarn", 1.1, 10, 0.1)),
    Field("Temperature warning (°C)", id("tempWarnC"), numIn("tempWarnC", 30, 100)),

    saveErr ? h("div", { className: c("err"), role: "alert" }, saveErr) : null,
    h("div", { className: c("btns") },
      h("button", { type: "button", className: c("b good"), onClick: p.onSave }, "Save"),
      h("button", { type: "button", className: c("b"), onClick: p.onCancel }, "Cancel")));
}

export default function activate(api) {
  const { registerPanel, callBackend } = api;
  ensureStyle();
  registerPanel({ id: PANEL_ID, component: makePanel(callBackend) });
}
