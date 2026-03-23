import { useState, useEffect, useRef } from "react";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0EDE8",
  surface:      "#FFFFFF",
  surfaceElev:  "#F7F4F0",
  surfaceHigh:  "#EDE9E2",
  border:       "#DDD8D0",
  borderMid:    "#CAC3B8",
  borderHigh:   "#A89F94",
  orange:       "#F05A22",
  orangeDim:    "#C04818",
  orangeFaint:  "rgba(240,90,34,0.10)",
  teal:         "#0E8A7E",
  tealFaint:    "rgba(14,138,126,0.10)",
  text:         "#1A1208",
  textSub:      "#6B5E52",
  textMuted:    "#9E9186",
  success:      "#2D9B6F",
  successFaint: "rgba(45,155,111,0.12)",
  warning:      "#C47D0A",
  warningFaint: "rgba(196,125,10,0.12)",
  danger:       "#B03025",
  dangerFaint:  "rgba(176,48,37,0.10)",
  white:        "#FFFFFF",
};

// ── NAV TOKENS (stays dark regardless of theme) ───────────────────────────────
const NAV = {
  bg:       "#0B1C2E",
  border:   "#1E3347",
  text:     "#E8EEF4",
  textSub:  "#8BA5BE",
  textMuted:"#4E6A84",
  surface:  "#162840",
};

const WS_COLORS = {
  "Tech Team":   "#F05A22",
  "$ Test":      "#27AE60",
  "$ Reporting": "#2471A3",
  "SSO":         "#C0397B",
  "Aurus":       "#D4AC0D",
};

const STATUS_META = {
  "Outstanding": { dot: C.danger,  label: "Outstanding", short: "OUT" },
  "In Progress":  { dot: C.warning, label: "In Progress",  short: "WIP" },
  "Complete":     { dot: C.success, label: "Complete",     short: "DONE" },
};

const ALL_STATUSES   = ["Outstanding", "In Progress", "Complete"];
const DEFAULT_WS     = ["Tech Team", "$ Test", "$ Reporting", "SSO", "Aurus"];

const slug  = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// Parse YYYY-MM-DD as local noon to avoid UTC midnight shifting to prior day
const fmtD = str => {
  if (!str) return "—";
  const s = str.length === 10 ? str : str.split("T")[0];
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtT  = iso => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const today = () => new Date().toISOString().split("T")[0];
const daysTo = dateStr => {
  const t = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.round((d - t) / 86400000);
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function Modal({ open, onClose, title, width = 520, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, style: sx }) {
  const base = { border: "none", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, fontWeight: 600, fontFamily: "inherit", transition: "opacity 0.15s", opacity: disabled ? 0.45 : 1, display: "inline-flex", alignItems: "center", gap: 6 };
  const sizes = { sm: { fontSize: 11, padding: "5px 10px" }, md: { fontSize: 13, padding: "8px 14px" }, lg: { fontSize: 14, padding: "10px 20px" } };
  const variants = {
    primary:  { background: C.orange,       color: C.white },
    secondary:{ background: C.surfaceHigh,  color: C.text,    border: `1px solid ${C.borderMid}` },
    ghost:    { background: "transparent",  color: C.textSub, border: `1px solid ${C.borderMid}` },
    danger:   { background: C.dangerFaint,  color: C.danger,  border: `1px solid ${C.danger}44` },
    success:  { background: C.successFaint, color: C.success, border: `1px solid ${C.success}44` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}>{children}</button>;
}

function Input({ value, onChange, placeholder, multiline, rows = 4, style: sx }) {
  const base = { background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px", width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none", resize: "vertical" };
  return multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, ...sx }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, ...sx }} />;
}

function Select({ value, onChange, options, style: sx }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px", fontFamily: "inherit", outline: "none", cursor: "pointer", ...sx }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}

function StatusDot({ status }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[status]?.dot ?? C.textMuted, display: "inline-block", flexShrink: 0 }} />;
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.surfaceHigh, border: `1px solid ${C.borderHigh}`, color: C.text, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
      {msg}
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = C.orange, height = 6, bg = C.border }) {
  return (
    <div style={{ background: bg, borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ── SEGMENTED PROGRESS BAR (done=green, wip=yellow, remaining=bg) ─────────────
function SegmentedBar({ done, wip, total, height = 6 }) {
  const donePct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const wipPct  = total > 0 ? Math.min(100 - donePct, (wip  / total) * 100) : 0;
  return (
    <div style={{ background: C.border, borderRadius: 999, height, overflow: "hidden", display: "flex" }}>
      {donePct > 0 && <div style={{ width: `${donePct}%`, background: C.success, transition: "width 0.4s ease", flexShrink: 0, height: "100%" }} />}
      {wipPct  > 0 && <div style={{ width: `${wipPct}%`,  background: C.warning, transition: "width 0.4s ease", flexShrink: 0, height: "100%" }} />}
    </div>
  );
}

// ── KPI TILE ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color = C.orange, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── LAUNCH CARD ───────────────────────────────────────────────────────────────
function LaunchCard({ label, deployDate, inStoresDate, color }) {
  const days = daysTo(deployDate);
  const isToday = days === 0;
  const isPast  = days < 0;
  const bg = isPast ? C.successFaint : isToday ? C.warningFaint : C.surface;
  const borderColor = isPast ? C.success : isToday ? C.warning : color;
  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}55`, borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: borderColor, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: borderColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {isPast ? "LIVE" : isToday ? "TODAY" : `${days}d`}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 8 }}>Deploy: {fmtD(deployDate)}</div>
      <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>In stores: {fmtD(inStoresDate)}</div>
    </div>
  );
}

// ── WORKSTREAM HEALTH ROW ─────────────────────────────────────────────────────
function WSHealthRow({ ws, items }) {
  const wsItems  = items.filter(i => i.workstream === ws);
  const total    = wsItems.length;
  const done     = wsItems.filter(i => i.status === "Complete").length;
  const wip      = wsItems.filter(i => i.status === "In Progress").length;
  const out      = wsItems.filter(i => i.status === "Outstanding").length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const color    = WS_COLORS[ws] ?? C.orange;
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ws}</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.textSub }}>
          <span style={{ color: C.danger }}>⬤ {out}</span>
          <span style={{ color: C.warning }}>⬤ {wip}</span>
          <span style={{ color: C.success }}>⬤ {done}</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? C.success : color }}>{pct}%</span>
        </div>
      </div>
      <SegmentedBar done={done} wip={wip} total={total} height={6} />
    </div>
  );
}

// ── STICKY CARD ───────────────────────────────────────────────────────────────
function StickyCard({ item, onMove, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const color = WS_COLORS[item.workstream] ?? C.orange;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: C.surfaceElev, borderRadius: 8, padding: "10px 12px", marginBottom: 6, borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`, position: "relative", boxShadow: hovered ? `0 4px 16px rgba(0,0,0,0.3)` : "none", transition: "box-shadow 0.15s", cursor: "default" }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.4, paddingRight: hovered ? 60 : 0 }}>{item.name}</div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 5 }}>{fmtD(item.createdAt)}</div>
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
          <button onClick={() => onMove(item)} title="Move" style={{ background: C.surfaceHigh, border: `1px solid ${C.borderMid}`, borderRadius: 5, color: C.textSub, cursor: "pointer", fontSize: 12, padding: "3px 7px" }}>⇄</button>
          <button onClick={() => onEdit(item)} title="Edit" style={{ background: C.surfaceHigh, border: `1px solid ${C.borderMid}`, borderRadius: 5, color: C.textSub, cursor: "pointer", fontSize: 12, padding: "3px 7px" }}>✎</button>
          <button onClick={() => onDelete(item.id)} title="Delete" style={{ background: C.dangerFaint, border: `1px solid ${C.danger}44`, borderRadius: 5, color: C.danger, cursor: "pointer", fontSize: 12, padding: "3px 7px" }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function DashboardTab({ items, moves, project }) {
  const total    = items.length;
  const done     = items.filter(i => i.status === "Complete").length;
  const wip      = items.filter(i => i.status === "In Progress").length;
  const out      = items.filter(i => i.status === "Outstanding").length;
  const pctDone  = total > 0 ? Math.round((done / total) * 100) : 0;
  const daysCA   = daysTo(project.launchCA);

  // Pace: moves per day over last 7 days
  const cutoff = Date.now() - 7 * 86400000;
  const recentCompletes = moves.filter(m => m.to === "Complete" && new Date(m.ts).getTime() >= cutoff);
  const byDay = {};
  recentCompletes.forEach(m => { const d = m.ts.split("T")[0]; byDay[d] = (byDay[d] || 0) + 1; });
  const dayVals = Object.values(byDay);
  const avgPerDay = dayVals.length > 0 ? (dayVals.reduce((a, b) => a + b, 0) / dayVals.length).toFixed(1) : null;
  const projDays = avgPerDay && parseFloat(avgPerDay) > 0 ? Math.ceil(out / parseFloat(avgPerDay)) : null;
  const onTrack  = projDays !== null ? projDays <= daysCA : null;

  // Recent moves
  const recent = [...moves].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);

  const workstreams = project.workstreams ?? DEFAULT_WS;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Sprint Snapshot header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.orange, textTransform: "uppercase", marginBottom: 4 }}>Sprint Snapshot</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      {/* Big 3 status tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.dangerFaint, border: `2px solid ${C.danger}55`, borderRadius: 12, padding: "22px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.danger, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{out}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.danger, textTransform: "uppercase", marginTop: 10 }}>Remaining</div>
        </div>
        <div style={{ background: C.warningFaint, border: `2px solid ${C.warning}55`, borderRadius: 12, padding: "22px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.warning, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{wip}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.warning, textTransform: "uppercase", marginTop: 10 }}>In Progress</div>
        </div>
        <div style={{ background: C.successFaint, border: `2px solid ${C.success}55`, borderRadius: 12, padding: "22px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.success, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{done}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: C.success, textTransform: "uppercase", marginTop: 10 }}>Complete</div>
        </div>
      </div>

      {/* Total Items bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase" }}>Total Items on Board</span>
        <span style={{ fontSize: 26, fontWeight: 900, color: C.text, fontFamily: "'DM Mono', monospace" }}>{total}</span>
      </div>

      {/* Launch countdown + Workstream health side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Launch countdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 16 }}>Launch Countdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
            <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />
          </div>
        </div>

        {/* Workstream health */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Workstream Health</div>
          {workstreams.map(ws => <WSHealthRow key={ws} ws={ws} items={items} />)}
        </div>
      </div>

      {/* Pace + Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        {/* Pace card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 16 }}>Completion Pace</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.surfaceElev, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>Avg / Day</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.orange, fontFamily: "'DM Mono',monospace" }}>{avgPerDay ?? "—"}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}>last 7 days</div>
            </div>
            <div style={{ background: C.surfaceElev, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>Remaining</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: out > 0 ? C.danger : C.success, fontFamily: "'DM Mono',monospace" }}>{out + wip}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}>items to close</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>Overall progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{pctDone}%</span>
            </div>
            <ProgressBar pct={pctDone} color={pctDone === 100 ? C.success : C.orange} height={8} />
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 14 }}>Recent Activity</div>
          {recent.length === 0 && <div style={{ color: C.textMuted, fontSize: 13 }}>No moves yet.</div>}
          {recent.map((m, i) => {
            const wsColor = WS_COLORS[m.workstream] ?? C.textMuted;
            const toMeta  = STATUS_META[m.to] ?? {};
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: wsColor, marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.itemName}</div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                    {m.from ? `${m.from} → ` : ""}<span style={{ color: toMeta.dot, fontWeight: 600 }}>{m.to}</span>
                    <span style={{ color: C.textMuted }}> · {fmtD(m.ts)} {fmtT(m.ts)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 10, background: wsColor + "22", color: wsColor, borderRadius: 5, padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>{m.workstream}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── BOARD TAB ──────────────────────────────────────────────────────────────────
function BoardTab({ items, moves, project, onAddItem, onMoveItem, onEditItem, onDeleteItem, onBatchAdd, onBatchUpdate, showToast, onUndo, lastMove }) {
  const [addForm,      setAddForm]      = useState({ open: false, name: "", workstream: project.workstreams?.[0] ?? "Tech Team", status: "Outstanding" });
  const [moveForm,     setMoveForm]     = useState({ open: false, item: null, toStatus: "" });
  const [editForm,     setEditForm]     = useState({ open: false, item: null, name: "", workstream: "", status: "" });
  const [batchAdd,     setBatchAdd]     = useState({ open: false, text: "", parsed: [], confirmed: false });
  const [batchUpdate,  setBatchUpdate]  = useState({ open: false, text: "", parsed: [], confirmed: false });
  const [showEod,      setShowEod]      = useState(false);
  const [caOnly,       setCaOnly]       = useState(false);
  const boardRef = useRef(null);
  const [showExec,     setShowExec]     = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [exportJson,   setExportJson]   = useState("");
  const [showImport,   setShowImport]   = useState(false);
  const [importJson,   setImportJson]   = useState("");
  const [showReset,    setShowReset]    = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const eodRef = useRef(null);

  const workstreams = project.workstreams ?? DEFAULT_WS;

  const filteredItems = filterStatus === "All" ? items : items.filter(i => i.status === filterStatus);

  // ── BATCH ADD PARSE ───────────────────────────────────────────────────────
  function parseBatchAdd(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split("|").map(s => s.trim());
      const name  = parts[0] ?? "";
      const ws    = workstreams.find(w => w.toLowerCase() === (parts[1] ?? "").toLowerCase()) ?? workstreams[0];
      const st    = ALL_STATUSES.find(s => s.toLowerCase() === (parts[2] ?? "").toLowerCase()) ?? "Outstanding";
      const valid = name.length > 0;
      return { name, workstream: ws, status: st, valid };
    });
  }

  // ── BATCH UPDATE PARSE ────────────────────────────────────────────────────
  function parseBatchUpdate(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [rawName, rawStatus] = line.split("→").map(s => s.trim());
      const item   = items.find(i => i.name.toLowerCase() === (rawName ?? "").toLowerCase());
      const status = ALL_STATUSES.find(s => s.toLowerCase() === (rawStatus ?? "").toLowerCase());
      return { raw: line, itemId: item?.id, itemName: item?.name ?? rawName, newStatus: status, valid: !!item && !!status };
    });
  }

  function confirmBatchAdd() {
    const valid = batchAdd.parsed.filter(p => p.valid);
    valid.forEach(p => onAddItem(p.name, p.workstream, p.status));
    showToast(`Added ${valid.length} item${valid.length !== 1 ? "s" : ""}`);
    setBatchAdd({ open: false, text: "", parsed: [], confirmed: false });
  }

  function confirmBatchUpdate() {
    const valid = batchUpdate.parsed.filter(p => p.valid);
    valid.forEach(p => onMoveItem(p.itemId, p.newStatus));
    showToast(`Updated ${valid.length} item${valid.length !== 1 ? "s" : ""}`);
    setBatchUpdate({ open: false, text: "", parsed: [], confirmed: false });
  }

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 28px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <Btn onClick={() => setAddForm(f => ({ ...f, open: true }))} icon="＋">＋ Add Item</Btn>
        <Btn variant="secondary" onClick={() => setBatchAdd({ open: true, text: "", parsed: [], confirmed: false })}>＋ Batch Add</Btn>
        <Btn variant="secondary" onClick={() => setBatchUpdate({ open: true, text: "", parsed: [], confirmed: false })}>⇄ Batch Update</Btn>
        <div style={{ flex: 1 }} />
        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {["All", ...ALL_STATUSES].map(s => {
            const active = filterStatus === s;
            const meta = STATUS_META[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "none", background: active ? (meta?.dot ?? C.orange) : C.surfaceElev, color: active ? C.white : C.textSub, transition: "all 0.15s" }}>
                {s}
              </button>
            );
          })}
        </div>
        <Btn variant="ghost" size="sm" disabled={!lastMove} onClick={onUndo} title={lastMove ? `Undo: ${lastMove.itemName} → ${lastMove.from ?? "remove"}` : "Nothing to undo"}>↩ Undo</Btn>
        <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />
        <Btn variant="ghost" size="sm" onClick={async () => {
          if (!boardRef.current) return;
          const { default: h2c } = await import("html2canvas");
          const canvas = await h2c(boardRef.current, { backgroundColor: C.bg, scale: 2, useCORS: true });
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = `board-${project.name.toLowerCase().replace(/\s+/g, "-")}-${today()}.png`;
          a.click();
          showToast("📸 Board saved!");
        }}>📸 Board</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowEod(true)}>📋 EOD</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowExec(true)}>📊 Exec</Btn>
        <Btn variant="ghost" size="sm" onClick={() => { setExportJson(JSON.stringify({ items, moves, exportedAt: new Date().toISOString() }, null, 2)); setShowExport(true); }}>⬆ Export</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowImport(true)}>⬇ Import</Btn>
        <Btn variant="danger" size="sm" onClick={() => setShowReset(true)}>↺ Reset</Btn>
      </div>

      {/* Board grid */}
      <div ref={boardRef} style={{ overflowX: "auto", padding: "0 28px" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginTop: 20 }}>
          <thead>
            <tr>
              <th style={{ width: 110, padding: "10px 14px", textAlign: "left" }} />
              {workstreams.map(ws => (
                <th key={ws} style={{ padding: "10px 14px", textAlign: "left", minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: WS_COLORS[ws] ?? C.orange }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{ws}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_STATUSES.map(status => {
              const meta = STATUS_META[status];
              return (
                <tr key={status}>
                  <td style={{ verticalAlign: "top", padding: "8px 14px 8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta.dot, textTransform: "uppercase", letterSpacing: "0.08em" }}>{status}</span>
                    </div>
                  </td>
                  {workstreams.map(ws => {
                    const cellItems = filteredItems.filter(i => i.workstream === ws && i.status === status);
                    return (
                      <td key={ws} style={{ verticalAlign: "top", padding: "8px 6px" }}>
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 10px", minHeight: 90 }}>
                          {cellItems.length === 0 && (
                            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 20 }}>—</div>
                          )}
                          {cellItems.map(item => (
                            <StickyCard
                              key={item.id}
                              item={item}
                              onMove={item => setMoveForm({ open: true, item, toStatus: "" })}
                              onEdit={item => setEditForm({ open: true, item, name: item.name, workstream: item.workstream, status: item.status })}
                              onDelete={id => { onDeleteItem(id); showToast("Item deleted"); }}
                            />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── ADD MODAL ── */}
      <Modal open={addForm.open} onClose={() => setAddForm(f => ({ ...f, open: false }))} title="Add Item">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Item Name</Label><Input value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} placeholder="Enter item name" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Workstream</Label><Select value={addForm.workstream} onChange={v => setAddForm(f => ({ ...f, workstream: v }))} options={workstreams} style={{ width: "100%" }} /></div>
            <div><Label>Status</Label><Select value={addForm.status} onChange={v => setAddForm(f => ({ ...f, status: v }))} options={ALL_STATUSES} style={{ width: "100%" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <Btn variant="ghost" onClick={() => setAddForm(f => ({ ...f, open: false }))}>Cancel</Btn>
            <Btn disabled={!addForm.name.trim()} onClick={() => { onAddItem(addForm.name.trim(), addForm.workstream, addForm.status); showToast("Item added"); setAddForm(f => ({ ...f, open: false, name: "" })); }}>Add Item</Btn>
          </div>
        </div>
      </Modal>

      {/* ── MOVE MODAL ── */}
      <Modal open={moveForm.open} onClose={() => setMoveForm({ open: false, item: null, toStatus: "" })} title={`Move: ${moveForm.item?.name}`} width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Move to Status</Label><Select value={moveForm.toStatus} onChange={v => setMoveForm(f => ({ ...f, toStatus: v }))} options={[{ value: "", label: "Select status…" }, ...ALL_STATUSES.map(s => ({ value: s, label: s }))]} style={{ width: "100%" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setMoveForm({ open: false, item: null, toStatus: "" })}>Cancel</Btn>
            <Btn disabled={!moveForm.toStatus} onClick={() => { onMoveItem(moveForm.item.id, moveForm.toStatus); showToast(`Moved to ${moveForm.toStatus}`); setMoveForm({ open: false, item: null, toStatus: "" }); }}>Move</Btn>
          </div>
        </div>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={editForm.open} onClose={() => setEditForm({ open: false, item: null, name: "", workstream: "", status: "" })} title="Edit Item" width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Item Name</Label><Input value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Workstream</Label><Select value={editForm.workstream} onChange={v => setEditForm(f => ({ ...f, workstream: v }))} options={workstreams} style={{ width: "100%" }} /></div>
            <div><Label>Status</Label><Select value={editForm.status} onChange={v => setEditForm(f => ({ ...f, status: v }))} options={ALL_STATUSES} style={{ width: "100%" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditForm({ open: false, item: null, name: "", workstream: "", status: "" })}>Cancel</Btn>
            <Btn disabled={!editForm.name.trim()} onClick={() => { onEditItem(editForm.item.id, editForm.name.trim(), editForm.workstream, editForm.status); showToast("Item updated"); setEditForm({ open: false, item: null, name: "", workstream: "", status: "" }); }}>Save</Btn>
          </div>
        </div>
      </Modal>

      {/* ── BATCH ADD MODAL ── */}
      <Modal open={batchAdd.open} onClose={() => setBatchAdd({ open: false, text: "", parsed: [], confirmed: false })} title="Batch Add Items" width={560}>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>One item per line: <code style={{ background: C.surfaceElev, padding: "2px 6px", borderRadius: 4 }}>Item Name | Workstream | Status</code></div>
        {!batchAdd.confirmed ? (
          <>
            <Input multiline rows={8} value={batchAdd.text} onChange={v => setBatchAdd(f => ({ ...f, text: v }))} placeholder={"Fix shipping webhook | Tech Team | In Progress\nTest CA orders | $ Test | Outstanding"} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setBatchAdd({ open: false, text: "", parsed: [], confirmed: false })}>Cancel</Btn>
              <Btn disabled={!batchAdd.text.trim()} onClick={() => setBatchAdd(f => ({ ...f, parsed: parseBatchAdd(f.text), confirmed: true }))}>Preview</Btn>
            </div>
          </>
        ) : (
          <>
            {batchAdd.parsed.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: p.valid ? C.successFaint : C.dangerFaint, border: `1px solid ${p.valid ? C.success : C.danger}44`, borderRadius: 7, fontSize: 12 }}>
                <span>{p.valid ? "✓" : "✗"}</span>
                <span style={{ flex: 1, color: C.text }}>{p.name}</span>
                <span style={{ color: C.textSub }}>{p.workstream}</span>
                <span style={{ color: p.valid ? C.success : C.danger }}>{p.status}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setBatchAdd(f => ({ ...f, confirmed: false }))}>← Back</Btn>
              <Btn disabled={!batchAdd.parsed.some(p => p.valid)} onClick={confirmBatchAdd}>Add {batchAdd.parsed.filter(p => p.valid).length} Items</Btn>
            </div>
          </>
        )}
      </Modal>

      {/* ── BATCH UPDATE MODAL ── */}
      <Modal open={batchUpdate.open} onClose={() => setBatchUpdate({ open: false, text: "", parsed: [], confirmed: false })} title="Batch Update Status" width={560}>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>One update per line: <code style={{ background: C.surfaceElev, padding: "2px 6px", borderRadius: 4 }}>Item Name → New Status</code></div>
        {!batchUpdate.confirmed ? (
          <>
            <Input multiline rows={8} value={batchUpdate.text} onChange={v => setBatchUpdate(f => ({ ...f, text: v }))} placeholder={"Fix shipping webhook → Complete\nTest CA orders → In Progress"} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setBatchUpdate({ open: false, text: "", parsed: [], confirmed: false })}>Cancel</Btn>
              <Btn disabled={!batchUpdate.text.trim()} onClick={() => setBatchUpdate(f => ({ ...f, parsed: parseBatchUpdate(f.text), confirmed: true }))}>Preview</Btn>
            </div>
          </>
        ) : (
          <>
            {batchUpdate.parsed.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: p.valid ? C.successFaint : C.dangerFaint, border: `1px solid ${p.valid ? C.success : C.danger}44`, borderRadius: 7, fontSize: 12 }}>
                <span>{p.valid ? "✓" : "✗"}</span>
                <span style={{ flex: 1, color: C.text }}>{p.itemName}</span>
                {p.valid && <span style={{ color: C.success }}>→ {p.newStatus}</span>}
                {!p.valid && <span style={{ color: C.danger }}>not found or invalid status</span>}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setBatchUpdate(f => ({ ...f, confirmed: false }))}>← Back</Btn>
              <Btn disabled={!batchUpdate.parsed.some(p => p.valid)} onClick={confirmBatchUpdate}>Update {batchUpdate.parsed.filter(p => p.valid).length} Items</Btn>
            </div>
          </>
        )}
      </Modal>

      {/* ── EOD MODAL ── */}
      {(() => {
        // Items excluded from CA-only view (US-dependent or not CA launch blockers)
        const CA_EXCL_NAMES = [
          "Intra-Day US",
          "Inventory LOH-US",
          "ATB Files US",
          "Pre-Order Tool",
          "Migration of HTS + COO via SF",
          "Shipping/Stash Updates to Crowdtwist",
          "Test Store Deactivation w/Prod Volume Inventory",
          "Fluent Middleware Creds (US)",
          "US Final Validation Back to Aurus",
          "Nyco Downstream Tax Approval (US)",
          "Hand-Off and Approval from Graham (US)",
          "Fenix Updates",
          "Ensure placeholder ID is replaced with correct value & Tampermonkey so scanning works properly",
        ];
        const CA_EXCL_WORKSTREAMS = ["$ Reporting"]; // all financial reporting tickets
        const eodItems = caOnly
          ? items.filter(i => {
              if (CA_EXCL_NAMES.includes(i.name)) return false;
              // Workstream exclusions only apply to non-complete items — completed work still counts
              if (CA_EXCL_WORKSTREAMS.includes(i.workstream) && i.status !== "Complete") return false;
              return true;
            })
          : items;
        return (
          <Modal open={showEod} onClose={() => setShowEod(false)} title="End of Day Summary" width={600}>
            {/* CA ONLY toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
              <button
                onClick={() => setCaOnly(false)}
                style={{ fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer", border: "none", background: !caOnly ? C.orange : C.surfaceElev, color: !caOnly ? C.white : C.textSub, transition: "all 0.15s" }}>
                ALL
              </button>
              <button
                onClick={() => setCaOnly(true)}
                style={{ fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20, cursor: "pointer", border: "none", background: caOnly ? C.teal : C.surfaceElev, color: caOnly ? C.white : C.textSub, transition: "all 0.15s" }}>
                CA ONLY
              </button>
              {caOnly && <span style={{ fontSize: 10, color: C.textMuted }}>Excluding US-only items + all $ Reporting tickets</span>}
            </div>
            <div id="eod-capture" ref={eodRef} style={{ background: NAV.bg, padding: 24, borderRadius: 10 }}>
              {/* Header */}
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.orange, textTransform: "uppercase", marginBottom: 2 }}>Sprint Snapshot</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAV.text, marginBottom: 2 }}>
                {project.name} — End of Day{caOnly ? " (CA Only)" : ""}
              </div>
              <div style={{ fontSize: 11, color: NAV.textMuted, marginBottom: 16 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>

              {/* Sprint snapshot tiles */}
              {(() => {
                const eodOut   = eodItems.filter(i => i.status === "Outstanding").length;
                const eodWip   = eodItems.filter(i => i.status === "In Progress").length;
                const eodDone  = eodItems.filter(i => i.status === "Complete").length;
                const eodTotal = eodItems.length;
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                      <div style={{ background: "rgba(176,48,37,0.18)", border: "1px solid rgba(176,48,37,0.4)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "#E05A50", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{eodOut}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#E05A50", textTransform: "uppercase", marginTop: 6 }}>Remaining</div>
                      </div>
                      <div style={{ background: "rgba(196,125,10,0.18)", border: "1px solid rgba(196,125,10,0.4)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "#D4920E", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{eodWip}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#D4920E", textTransform: "uppercase", marginTop: 6 }}>In Progress</div>
                      </div>
                      <div style={{ background: "rgba(45,155,111,0.18)", border: "1px solid rgba(45,155,111,0.4)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "#3DBF88", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{eodDone}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#3DBF88", textTransform: "uppercase", marginTop: 6 }}>Complete</div>
                      </div>
                    </div>
                    <div style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 8, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textMuted, textTransform: "uppercase" }}>Total Items on Board</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: NAV.text, fontFamily: "'DM Mono', monospace" }}>{eodTotal}</span>
                    </div>
                  </>
                );
              })()}

              {workstreams.map(ws => {
                const wsItems = eodItems.filter(i => i.workstream === ws);
                const out   = wsItems.filter(i => i.status === "Outstanding").length;
                const wip   = wsItems.filter(i => i.status === "In Progress").length;
                const done  = wsItems.filter(i => i.status === "Complete").length;
                const total = wsItems.length;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                const color = WS_COLORS[ws] ?? C.orange;
                return (
                  <div key={ws} style={{ padding: "12px 0", borderBottom: `1px solid ${NAV.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: NAV.text }}>{ws}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                        <span style={{ color: C.danger }}>⬤ {out} out</span>
                        <span style={{ color: C.warning }}>⬤ {wip} wip</span>
                        <span style={{ color: C.success }}>⬤ {done} done</span>
                        <span style={{ fontWeight: 700, color: pct === 100 ? C.success : color }}>{pct}%</span>
                      </div>
                    </div>
                    <SegmentedBar done={done} wip={wip} total={total} height={8} />
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: caOnly ? "1fr" : "1fr 1fr", gap: 10, marginTop: 16 }}>
                <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
                {!caOnly && <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <Btn onClick={async () => { const { default: h2c } = await import("html2canvas"); const canvas = await h2c(eodRef.current, { backgroundColor: NAV.bg, scale: 2 }); const a = document.createElement("a"); a.href = canvas.toDataURL(); a.download = `eod-${caOnly ? "ca-only-" : ""}${today()}.png`; a.click(); showToast("Saved!"); }}>📸 Save Image</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* ── EXEC SUMMARY MODAL ── */}
      <Modal open={showExec} onClose={() => setShowExec(false)} title="Exec Summary" width={620}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total",      value: items.length,                                    color: C.orange },
            { label: "Complete",   value: `${items.filter(i => i.status === "Complete").length}`,    color: C.success },
            { label: "In Progress",value: `${items.filter(i => i.status === "In Progress").length}`, color: C.warning },
            { label: "Outstanding",value: `${items.filter(i => i.status === "Outstanding").length}`, color: C.danger },
          ].map(t => (
            <div key={t.label} style={{ background: C.surfaceElev, border: `1px solid ${C.border}`, borderTop: `3px solid ${t.color}`, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.color, fontFamily: "'DM Mono',monospace" }}>{t.value}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4, textTransform: "uppercase", fontWeight: 700 }}>{t.label}</div>
            </div>
          ))}
        </div>
        {workstreams.map(ws => <WSHealthRow key={ws} ws={ws} items={items} />)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
          <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />
        </div>
      </Modal>

      {/* ── EXPORT MODAL ── */}
      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export Board Data" width={560}>
        <Input multiline rows={10} value={exportJson} onChange={() => {}} style={{ fontFamily: "monospace", fontSize: 11 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <Btn onClick={() => { navigator.clipboard.writeText(exportJson); showToast("Copied!"); }}>Copy JSON</Btn>
        </div>
      </Modal>

      {/* ── IMPORT MODAL ── */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Board Data" width={560}>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10 }}>Paste exported JSON below. This will replace all current data.</div>
        <Input multiline rows={10} value={importJson} onChange={setImportJson} placeholder='{"items":[...],"moves":[...]}' style={{ fontFamily: "monospace", fontSize: 11 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <Btn variant="ghost" onClick={() => setShowImport(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => {
            try {
              const d = JSON.parse(importJson);
              if (!d.items || !d.moves) throw new Error();
              onBatchAdd(d.items, d.moves, true);
              showToast("Board imported");
              setShowImport(false);
              setImportJson("");
            } catch { showToast("Invalid JSON"); }
          }}>Import & Replace</Btn>
        </div>
      </Modal>

      {/* ── RESET MODAL ── */}
      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset Board" width={400}>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>This will delete all items and move history. This cannot be undone.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowReset(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { onBatchAdd([], [], true); showToast("Board reset"); setShowReset(false); }}>Reset Everything</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── MOVE LOG TAB ──────────────────────────────────────────────────────────────
function MoveLogTab({ moves, project }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterWS,   setFilterWS]   = useState("All");
  const [filterSt,   setFilterSt]   = useState("All");
  const [onlyMoves,  setOnlyMoves]  = useState(false);

  const workstreams = project.workstreams ?? DEFAULT_WS;

  const filtered = moves
    .filter(m => !filterDate || m.ts.startsWith(filterDate))
    .filter(m => filterWS === "All" || m.workstream === filterWS)
    .filter(m => filterSt === "All" || m.to === filterSt)
    .filter(m => !onlyMoves || (m.from && m.from !== m.to))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  // Group by date
  const groups = {};
  filtered.forEach(m => {
    const d = m.ts.split("T")[0];
    if (!groups[d]) groups[d] = [];
    groups[d].push(m);
  });

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 12, padding: "7px 10px", fontFamily: "inherit", outline: "none" }} />
        <Select value={filterWS} onChange={setFilterWS} options={["All", ...workstreams]} style={{ minWidth: 130 }} />
        <Select value={filterSt} onChange={setFilterSt} options={["All", ...ALL_STATUSES]} style={{ minWidth: 130 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textSub, cursor: "pointer" }}>
          <input type="checkbox" checked={onlyMoves} onChange={e => setOnlyMoves(e.target.checked)} />
          Moves only
        </label>
        {(filterDate || filterWS !== "All" || filterSt !== "All" || onlyMoves) && (
          <Btn variant="ghost" size="sm" onClick={() => { setFilterDate(""); setFilterWS("All"); setFilterSt("All"); setOnlyMoves(false); }}>Clear</Btn>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>{filtered.length} entries</span>
      </div>

      {Object.keys(groups).length === 0 && (
        <div style={{ textAlign: "center", color: C.textMuted, fontSize: 14, marginTop: 60 }}>No entries match your filters.</div>
      )}

      {Object.entries(groups).map(([date, entries]) => {
        const completed = entries.filter(e => e.to === "Complete").length;
        return (
          <div key={date} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtD(date + "T12:00:00Z")}</span>
              {completed > 0 && <span style={{ fontSize: 10, background: C.successFaint, color: C.success, border: `1px solid ${C.success}44`, borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>{completed} completed</span>}
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            {entries.map(m => {
              const wsColor  = WS_COLORS[m.workstream] ?? C.textMuted;
              const toMeta   = STATUS_META[m.to] ?? {};
              const fromMeta = STATUS_META[m.from] ?? {};
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${wsColor}`, borderRadius: 8, marginBottom: 8 }}>
                  <StatusDot status={m.to} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.itemName}</div>
                    <div style={{ fontSize: 11, color: C.textSub, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {m.from
                        ? <span><span style={{ color: fromMeta.dot }}>{m.from}</span> → <span style={{ color: toMeta.dot, fontWeight: 700 }}>{m.to}</span></span>
                        : <span>Added as <span style={{ color: toMeta.dot, fontWeight: 700 }}>{m.to}</span></span>
                      }
                      <span style={{ color: C.textMuted }}>{fmtT(m.ts)}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, background: wsColor + "22", color: wsColor, borderRadius: 5, padding: "2px 8px", fontWeight: 700, flexShrink: 0 }}>{m.workstream}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── PROJECT SWITCHER MODAL ────────────────────────────────────────────────────
function ProjectManager({ open, onClose, projects, activeId, onSwitch, onAdd, onDelete }) {
  const [newName, setNewName]     = useState("");
  const [newColor, setNewColor]   = useState("#F05A22");
  const [newCA, setNewCA]         = useState("");
  const [newUS, setNewUS]         = useState("");

  function handleAdd() {
    if (!newName.trim() || !newCA || !newUS) return;
    onAdd({ id: slug(newName) + "-" + Date.now(), name: newName.trim(), color: newColor, launchCA: newCA, launchUS: newUS, workstreams: [...DEFAULT_WS] });
    setNewName(""); setNewCA(""); setNewUS("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Projects" width={520}>
      <div style={{ marginBottom: 20 }}>
        {projects.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: p.id === activeId ? C.surfaceHigh : C.surfaceElev, border: `1px solid ${p.id === activeId ? C.borderHigh : C.border}`, borderLeft: `4px solid ${p.color}`, borderRadius: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>CA: {p.launchCA} · US: {p.launchUS}</div>
            </div>
            {p.id !== activeId && <Btn size="sm" variant="secondary" onClick={() => { onSwitch(p.id); onClose(); }}>Switch</Btn>}
            {p.id === activeId && <span style={{ fontSize: 11, color: p.color, fontWeight: 700 }}>Active</span>}
            {projects.length > 1 && p.id !== activeId && <Btn size="sm" variant="danger" onClick={() => onDelete(p.id)}>✕</Btn>}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Add New Project</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <Input value={newName} onChange={setNewName} placeholder="Project name" />
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 44, height: 38, borderRadius: 8, border: `1px solid ${C.borderMid}`, cursor: "pointer", padding: 2, background: C.surfaceElev }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><Label>CA Launch Date</Label><input type="date" value={newCA} onChange={e => setNewCA(e.target.value)} style={{ background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px", width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} /></div>
            <div><Label>US Launch Date</Label><input type="date" value={newUS} onChange={e => setNewUS(e.target.value)} style={{ background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px", width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} /></div>
          </div>
          <Btn disabled={!newName.trim() || !newCA || !newUS} onClick={handleAdd}>Add Project</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [projects,    setProjects]    = useState([]);
  const [activeId,    setActiveId]    = useState("fluent-commerce");
  const [items,       setItems]       = useState([]);
  const [moves,       setMoves]       = useState([]);
  const [loaded,      setLoaded]      = useState(false);
  const [tab,         setTab]         = useState("dashboard");
  const [toast,       setToast]       = useState(null);
  const [showProjMgr, setShowProjMgr] = useState(false);

  const saveTimer = useRef(null);
  const boardLoaded = useRef(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load projects metadata
  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setActiveId(data[0].id);
        } else {
          // Seed default
          const defaults = [{ id: "fluent-commerce", name: "Fluent Commerce", color: "#F05A22", launchCA: "2026-03-24", launchCAInStores: "2026-03-25", launchUS: "2026-03-30", launchUSInStores: "2026-03-31", workstreams: [...DEFAULT_WS] }];
          setProjects(defaults);
          setActiveId("fluent-commerce");
          fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defaults) }).catch(() => {});
        }
      })
      .catch(() => {
        const defaults = [{ id: "fluent-commerce", name: "Fluent Commerce", color: "#F05A22", launchCA: "2026-03-24", launchCAInStores: "2026-03-25", launchUS: "2026-03-30", launchUSInStores: "2026-03-31", workstreams: [...DEFAULT_WS] }];
        setProjects(defaults);
        setActiveId("fluent-commerce");
      });
  }, []);

  // Load board data when activeId changes
  useEffect(() => {
    if (!activeId) return;
    boardLoaded.current = false;
    setLoaded(false);
    fetch(`/api/board/${activeId}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setItems(data.items ?? []);
          setMoves(data.moves ?? []);
        } else {
          setItems([]);
          setMoves([]);
        }
        setLoaded(true);
        boardLoaded.current = true;
      })
      .catch(() => { setLoaded(true); boardLoaded.current = true; });
  }, [activeId]);

  // Auto-save board data
  useEffect(() => {
    if (!loaded || !boardLoaded.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/board/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, moves }),
      }).catch(() => {});
    }, 1000);
  }, [items, moves, loaded, activeId]);

  // Save projects metadata when projects change
  useEffect(() => {
    if (projects.length === 0) return;
    fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projects) }).catch(() => {});
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeId) ?? projects[0];
  const lastMove = moves.length > 0 ? [...moves].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0] : null;

  // ── ITEM OPERATIONS ───────────────────────────────────────────────────────
  function addItem(name, workstream, status) {
    const id = Date.now().toString();
    const newItem = { id, name, workstream, status, createdAt: new Date().toISOString() };
    const move = { id: id + "m", itemId: id, itemName: name, workstream, from: null, to: status, ts: new Date().toISOString() };
    setItems(prev => [...prev, newItem]);
    setMoves(prev => [...prev, move]);
  }

  function moveItem(itemId, toStatus) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: toStatus } : i));
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const move = { id: Date.now().toString() + "m", itemId, itemName: item.name, workstream: item.workstream, from: item.status, to: toStatus, ts: new Date().toISOString() };
    setMoves(prev => [...prev, move]);
  }

  function editItem(itemId, name, workstream, status) {
    const item = items.find(i => i.id === itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, name, workstream, status } : i));
    if (item && item.status !== status) {
      const move = { id: Date.now().toString() + "m", itemId, itemName: name, workstream, from: item.status, to: status, ts: new Date().toISOString() };
      setMoves(prev => [...prev, move]);
    }
  }

  function deleteItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  function replaceBoard(newItems, newMoves) {
    setItems(newItems);
    setMoves(newMoves);
  }

  function undoLastMove() {
    if (moves.length === 0) return;
    const last = [...moves].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
    if (last.from === null) {
      // Was an "add" — remove the item entirely
      setItems(prev => prev.filter(i => i.id !== last.itemId));
    } else {
      // Was a move — revert to prior status
      setItems(prev => prev.map(i => i.id === last.itemId ? { ...i, status: last.from } : i));
    }
    setMoves(prev => prev.filter(m => m.id !== last.id));
    showToast(`↩ Undone — ${last.itemName}`);
  }

  // ── PROJECT OPERATIONS ────────────────────────────────────────────────────
  function addProject(proj) {
    setProjects(prev => [...prev, proj]);
    showToast(`Project "${proj.name}" created`);
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
    showToast("Project deleted");
  }

  if (!activeProject) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Loading…</div>;

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "⬛" },
    { id: "board",     label: "Board",     icon: "🗂" },
    { id: "log",       label: "Move Log",  icon: "📋" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* ── TOP NAV ── */}
      <div style={{ background: NAV.bg, borderBottom: `1px solid ${NAV.border}`, display: "flex", alignItems: "center", gap: 0, padding: "0 24px", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        {/* Logo + Project switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 28 }}>
          <div style={{ width: 30, height: 30, background: C.orange, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚡</div>
          <button onClick={() => setShowProjMgr(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = NAV.surface} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeProject.color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: NAV.text }}>{activeProject.name}</span>
            <span style={{ fontSize: 11, color: NAV.textMuted }}>▾</span>
          </button>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "18px 16px", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.orange : NAV.textSub, borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent", transition: "all 0.15s", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
          {[
            { label: "Total",  v: items.length,                                           color: NAV.textSub },
            { label: "Done",   v: items.filter(i => i.status === "Complete").length,       color: C.success },
            { label: "Active", v: items.filter(i => i.status === "In Progress").length,    color: C.orange },
          ].map(s => (
            <div key={s.label} style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 20, padding: "4px 12px", display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontWeight: 800, color: s.color }}>{s.v}</span>
              <span style={{ color: NAV.textMuted }}>{s.label}</span>
            </div>
          ))}
          <div style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 20, padding: "4px 12px", fontFamily: "monospace", fontSize: 11, color: NAV.textMuted }}>
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {!loaded ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.textMuted, fontSize: 14 }}>Loading board…</div>
      ) : (
        <>
          {tab === "dashboard" && <DashboardTab items={items} moves={moves} project={activeProject} />}
          {tab === "board"     && <BoardTab items={items} moves={moves} project={activeProject} onAddItem={addItem} onMoveItem={moveItem} onEditItem={editItem} onDeleteItem={deleteItem} onBatchAdd={(newI, newM, replace) => { if (replace) replaceBoard(newI, newM); else { newI.forEach(i => addItem(i.name, i.workstream, i.status)); } }} showToast={showToast} onUndo={undoLastMove} lastMove={lastMove} />}
          {tab === "log"       && <MoveLogTab moves={moves} project={activeProject} />}
        </>
      )}

      <ProjectManager open={showProjMgr} onClose={() => setShowProjMgr(false)} projects={projects} activeId={activeId} onSwitch={id => { setActiveId(id); setTab("dashboard"); }} onAdd={addProject} onDelete={deleteProject} />
      <Toast msg={toast} />
    </div>
  );
}
