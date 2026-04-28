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
  weekend:      "#F5F0F8",
};

const NAV = {
  bg:       "#0B1C2E",
  border:   "#1E3347",
  text:     "#E8EEF4",
  textSub:  "#8BA5BE",
  textMuted:"#4E6A84",
  surface:  "#162840",
};

// Workstream colors — used for card left-border + legend
const WS_COLORS = {
  "Tech Team":   "#F05A22",
  "$ Test":      "#27AE60",
  "$ Reporting": "#2471A3",
  "Other":       "#C0397B",
};
const WS_LEGEND = ["Tech Team", "$ Test", "$ Reporting", "Other"];

const STATUS_META = {
  "Outstanding": { dot: "#B03025", label: "Outstanding" },
  "In Progress": { dot: "#C47D0A", label: "In Progress" },
  "Complete":    { dot: "#2D9B6F", label: "Complete"    },
};

const ALL_STATUSES = ["Outstanding", "In Progress", "Complete"];

// ── DATE COLUMNS — working toward May 6 go-live ───────────────────────────────
const DATE_COLS = [
  { id: "2026-04-28", label: "Tue · 4/28", isWeekend: false },
  { id: "2026-04-29", label: "Wed · 4/29", isWeekend: false },
  { id: "2026-04-30", label: "Thu · 4/30", isWeekend: false },
  { id: "2026-05-01", label: "Fri · 5/1",  isWeekend: false },
  { id: "2026-05-02", label: "Sat–Sun · 5/2–3", isWeekend: true, combinedIds: ["2026-05-02", "2026-05-03"] },
  { id: "2026-05-04", label: "Mon · 5/4",  isWeekend: false },
  { id: "2026-05-05", label: "Tue · 5/5",  isWeekend: false, badge: "🚀 Deploy",        badgeColor: "#F05A22" },
  { id: "2026-05-06", label: "Wed · 5/6",  isWeekend: false, badge: "🏪 Live in Stores", badgeColor: "#2D9B6F" },
];

const SPECIAL_COLS = [
  {
    id: "backlog-wip",
    label: "Backlog / WIP",
    color: "#C0397B",
    note: "These are items that are in progress and we hope to bring along for our US launch, but are not blockers if not completed",
  },
  {
    id: "not-a-blocker",
    label: "Not a Blocker",
    color: "#16A085",
    note: "Items noted for visibility — not blocking launch and removed from total items on the board count",
  },
];

const PRE_COL = {
  id: "pre-sprint-complete",
  label: "✓ Pre-Sprint Complete",
  color: "#2D9B6F",
  note: "Completed before the current sprint — preserved for reference",
};

// Flat option list for column dropdowns (use first id for combined weekend col)
const COL_OPTIONS = [
  ...DATE_COLS.map(c => ({ value: c.id, label: c.label + (c.badge ? ` — ${c.badge}` : "") })),
  { value: "backlog-wip",         label: "Backlog / WIP" },
  { value: "not-a-blocker",       label: "Not a Blocker" },
  { value: "pre-sprint-complete", label: "✓ Pre-Sprint Complete" },
];

// Default workstream list (for log filters, health rows, etc.)
const ALL_WS = Object.keys(WS_COLORS);

// ── AUTO-MIGRATION: add `col` field + normalize legacy workstream names ───────
function migrateItem(item) {
  // Normalize renamed/removed workstreams
  let ws = item.workstream;
  if (ws === "SSO")           ws = "Other";     // SSO renamed to Other
  if (ws === "Aurus")         ws = "Tech Team"; // Aurus folded into Tech Team
  if (ws === "Backlog")       ws = "Tech Team"; // old column name, not a real workstream
  if (ws === "Not a Blocker") ws = "Other";     // old column name, not a real workstream

  // Assign col if missing
  let col = item.col;
  if (!col) {
    if (ws === "Not a Blocker" || item.workstream === "Not a Blocker") col = "not-a-blocker";
    else if (item.status === "Complete") col = "pre-sprint-complete";
    else col = "backlog-wip";
  }

  return { ...item, workstream: ws, col };
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
const slug  = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const fmtD  = str => {
  if (!str) return "—";
  const s = str.length === 10 ? str : str.split("T")[0];
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtT  = iso => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const today = ()  => new Date().toISOString().split("T")[0];
const daysTo = dateStr => {
  if (!dateStr) return null;
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
    primary:   { background: C.orange,       color: C.white },
    secondary: { background: C.surfaceHigh,  color: C.text,    border: `1px solid ${C.borderMid}` },
    ghost:     { background: "transparent",  color: C.textSub, border: `1px solid ${C.borderMid}` },
    danger:    { background: C.dangerFaint,  color: C.danger,  border: `1px solid ${C.danger}44`  },
    success:   { background: C.successFaint, color: C.success, border: `1px solid ${C.success}44` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}>{children}</button>;
}

function Input({ value, onChange, placeholder, multiline, rows = 4, style: sx }) {
  const base = { background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "9px 12px", width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none", resize: "vertical" };
  return multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, ...sx }} />
    : <input    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, ...sx }} />;
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

function ProgressBar({ pct, color = C.orange, height = 6, bg = C.border }) {
  return (
    <div style={{ background: bg, borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  );
}

function SegmentedBar({ done, wip, total, height = 6 }) {
  const donePct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const wipPct  = total > 0 ? Math.min(100 - donePct, (wip / total) * 100) : 0;
  return (
    <div style={{ background: C.border, borderRadius: 999, height, overflow: "hidden", display: "flex" }}>
      {donePct > 0 && <div style={{ width: `${donePct}%`, background: C.success, transition: "width 0.4s ease", flexShrink: 0, height: "100%" }} />}
      {wipPct  > 0 && <div style={{ width: `${wipPct}%`,  background: C.warning, transition: "width 0.4s ease", flexShrink: 0, height: "100%" }} />}
    </div>
  );
}

function LaunchCard({ label, deployDate, inStoresDate, color }) {
  const days = daysTo(deployDate);
  const isTBD   = days === null;
  const isToday = !isTBD && days === 0;
  const isPast  = !isTBD && days < 0;
  const bg = isPast ? C.successFaint : isToday ? C.warningFaint : C.surface;
  const borderColor = isPast ? C.success : isToday ? C.warning : color;
  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}55`, borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: borderColor, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: isTBD ? C.textMuted : borderColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {isTBD ? "TBD" : isPast ? "LIVE" : isToday ? "TODAY" : `${days}d`}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 8 }}>Deploy: {isTBD ? "TBD" : fmtD(deployDate)}</div>
      <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>In stores: {isTBD ? "TBD" : fmtD(inStoresDate)}</div>
    </div>
  );
}

// ── WORKSTREAM LEGEND ─────────────────────────────────────────────────────────
function WorkstreamLegend({ dark = false }) {
  const textColor  = dark ? NAV.textMuted : C.textMuted;
  const labelColor = dark ? NAV.textSub   : C.textSub;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", padding: "10px 0" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: textColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>Workstream</span>
      {WS_LEGEND.map(name => { const color = WS_COLORS[name]; return (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: labelColor, fontWeight: 500 }}>{name}</span>
        </div>
      ); })}
    </div>
  );
}

// ── WORKSTREAM HEALTH ROW ─────────────────────────────────────────────────────
function WSHealthRow({ ws, items }) {
  const wsItems = items.filter(i => i.workstream === ws);
  const total   = wsItems.length;
  const done    = wsItems.filter(i => i.status === "Complete").length;
  const wip     = wsItems.filter(i => i.status === "In Progress").length;
  const out     = wsItems.filter(i => i.status === "Outstanding").length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const color   = WS_COLORS[ws] ?? C.orange;
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
function StickyCard({ item, onMove, onEdit, onDelete, compact = false }) {
  const [hovered, setHovered] = useState(false);
  const color     = WS_COLORS[item.workstream] ?? C.orange;
  const statusDot = STATUS_META[item.status]?.dot ?? C.textMuted;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.surfaceElev, borderRadius: 8, padding: compact ? "8px 10px" : "10px 12px",
        marginBottom: 6,
        borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`,
        position: "relative", boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
        transition: "box-shadow 0.15s", cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingRight: hovered ? 64 : 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot, flexShrink: 0, marginTop: 4 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.4, flex: 1 }}>{item.name}</div>
      </div>
      {!compact && (
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, paddingLeft: 12 }}>
          {item.workstream} · {fmtD(item.createdAt)}
        </div>
      )}
      {hovered && (
        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
          <button onClick={() => onMove(item)} style={{ background: C.surfaceHigh, border: `1px solid ${C.borderMid}`, borderRadius: 5, color: C.textSub, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>⇄</button>
          <button onClick={() => onEdit(item)} style={{ background: C.surfaceHigh, border: `1px solid ${C.borderMid}`, borderRadius: 5, color: C.textSub, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>✎</button>
          <button onClick={() => onDelete(item.id)} style={{ background: C.dangerFaint, border: `1px solid ${C.danger}44`, borderRadius: 5, color: C.danger, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function DashboardTab({ items, moves, project }) {
  const todayId    = today();
  const daysLeft   = daysTo("2026-05-05");

  // Active items (exclude Not a Blocker)
  const activeItems = items.filter(i => i.col !== "not-a-blocker" && i.col !== "pre-sprint-complete");
  const allLaunch   = items.filter(i => i.col !== "not-a-blocker");
  const totalDone   = allLaunch.filter(i => i.status === "Complete").length;
  const totalAll    = allLaunch.length;
  const pctDone     = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  // Today's column
  const todayItems  = items.filter(i => i.col === todayId);
  const todayDone   = todayItems.filter(i => i.status === "Complete").length;
  const todayOpen   = todayItems.filter(i => i.status !== "Complete").length;

  // Pace: avg completions per day over last 7 days
  const cutoff = Date.now() - 7 * 86400000;
  const recentCompletes = moves.filter(m => m.to === "Complete" && new Date(m.ts).getTime() >= cutoff);
  const byDay = {};
  recentCompletes.forEach(m => { const d = m.ts.split("T")[0]; byDay[d] = (byDay[d] || 0) + 1; });
  const dayVals   = Object.values(byDay);
  const avgPerDay = dayVals.length > 0 ? (dayVals.reduce((a, b) => a + b, 0) / dayVals.length).toFixed(1) : null;
  const recent    = [...moves].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);

  // Day pipeline data
  const pipelineRows = DATE_COLS.map(col => {
    const ids   = col.combinedIds ?? [col.id];
    const cells = items.filter(i => ids.includes(i.col));
    const open  = cells.filter(i => i.status !== "Complete").length;
    const done  = cells.filter(i => i.status === "Complete").length;
    return { col, open, done, total: cells.length };
  });
  const pipelineMax = Math.max(...pipelineRows.map(r => r.total), 1);

  // Backlog count
  const backlogCount = items.filter(i => i.col === "backlog-wip").length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.orange, textTransform: "uppercase", marginBottom: 4 }}>Sprint Snapshot</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      {/* ── ROW 1: Today's Focus + Launch Countdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Today's Focus */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 14 }}>Today's Focus</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div style={{ background: C.successFaint, border: `1px solid ${C.success}44`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.success, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{todayDone}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.success, textTransform: "uppercase", marginTop: 6 }}>Closed Today</div>
            </div>
            <div style={{ background: C.warningFaint, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.warning, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{todayOpen}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.warning, textTransform: "uppercase", marginTop: 6 }}>Still Open</div>
            </div>
            <div style={{ background: C.dangerFaint, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.danger, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{daysLeft ?? "—"}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.danger, textTransform: "uppercase", marginTop: 6 }}>Days to Deploy</div>
            </div>
          </div>
          {/* Overall progress */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>Overall sprint progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{pctDone}% · {totalDone}/{totalAll}</span>
            </div>
            <ProgressBar pct={pctDone} color={pctDone === 100 ? C.success : C.orange} height={8} />
          </div>
          {backlogCount > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>
              <span style={{ color: "#C0397B", fontWeight: 700 }}>+{backlogCount}</span> items in Backlog / WIP — in progress, hoped for US launch but not blockers if not completed
            </div>
          )}
        </div>

        {/* Launch Countdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 14 }}>Launch Countdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
            <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />
          </div>
        </div>
      </div>

      {/* ── ROW 2: Sprint Pipeline + Workstream Health ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Sprint Pipeline */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 14 }}>Sprint Pipeline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pipelineRows.map(({ col, open, done, total }) => {
              const isToday   = col.id === todayId;
              const isPast    = col.id < todayId;
              const barWidth  = total > 0 ? (total / pipelineMax) * 100 : 0;
              const doneWidth = total > 0 ? (done / total) * 100 : 0;
              const accent    = isToday ? C.orange : col.isWeekend ? "#8B7FB8" : C.textSub;
              return (
                <div key={col.id} style={{
                  padding: "8px 10px", borderRadius: 8,
                  background: isToday ? C.orangeFaint : isPast ? C.surfaceElev : "transparent",
                  border: isToday ? `1px solid ${C.orange}44` : `1px solid transparent`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? C.orange : C.text, minWidth: 110 }}>
                      {col.label}
                      {isToday && <span style={{ fontSize: 9, marginLeft: 5, background: C.orange, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>TODAY</span>}
                      {col.badge && <span style={{ fontSize: 9, marginLeft: 5, color: col.badgeColor }}>{col.badge}</span>}
                    </span>
                    <div style={{ flex: 1, height: 6, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barWidth}%`, background: C.borderMid, borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${doneWidth}%`, background: C.success, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, minWidth: 80, justifyContent: "flex-end" }}>
                      {open > 0  && <span style={{ color: C.warning, fontWeight: 600 }}>{open} open</span>}
                      {done > 0  && <span style={{ color: C.success, fontWeight: 600 }}>{done} done</span>}
                      {total === 0 && <span style={{ color: C.textMuted }}>—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workstream Health */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Workstream Health</div>
          {WS_LEGEND.map(ws => <WSHealthRow key={ws} ws={ws} items={items} />)}
        </div>
      </div>

      {/* ── ROW 3: Pace + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 16 }}>

        {/* Pace */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase", marginBottom: 14 }}>Completion Pace</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: C.surfaceElev, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>Avg / Day</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.orange, fontFamily: "'DM Mono',monospace" }}>{avgPerDay ?? "—"}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}>last 7 days</div>
            </div>
            <div style={{ background: C.surfaceElev, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>Avg / Day Needed</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: daysLeft > 0 ? C.text : C.danger, fontFamily: "'DM Mono',monospace" }}>
                {daysLeft > 0 ? ((activeItems.filter(i => i.status !== "Complete").length) / daysLeft).toFixed(1) : "—"}
              </div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}>to finish by May 5</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px" }}>
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

      {/* ── Legend ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 22px" }}>
        <WorkstreamLegend />
      </div>
    </div>
  );
}

// ── BOARD TAB ──────────────────────────────────────────────────────────────────
function BoardTab({ items, moves, project, onAddItem, onMoveItem, onEditItem, onDeleteItem, onBatchAdd, onBatchUpdate, showToast, onUndo, lastMove }) {
  const todayCol = DATE_COLS.find(c => c.id === today());

  const emptyAdd  = { open: false, name: "", workstream: ALL_WS[0], status: "In Progress", col: "backlog-wip" };
  const emptyMove = { open: false, item: null, toCol: "", toStatus: "" };
  const emptyEdit = { open: false, item: null, name: "", workstream: "", status: "", col: "" };

  const [addForm,     setAddForm]     = useState(emptyAdd);
  const [moveForm,    setMoveForm]    = useState(emptyMove);
  const [editForm,    setEditForm]    = useState(emptyEdit);
  const [batchAdd,    setBatchAdd]    = useState({ open: false, text: "", parsed: [], confirmed: false });
  const [batchUpdate, setBatchUpdate] = useState({ open: false, text: "", parsed: [], confirmed: false });
  const [showEod,     setShowEod]     = useState(false);
  const [eodView,     setEodView]     = useState("A"); // "A" = pipeline, "B" = today's rundown
  const [showExec,    setShowExec]    = useState(false);
  const [showExport,  setShowExport]  = useState(false);
  const [exportJson,  setExportJson]  = useState("");
  const [showImport,  setShowImport]  = useState(false);
  const [importJson,  setImportJson]  = useState("");
  const [showReset,   setShowReset]   = useState(false);

  const boardRef = useRef(null);
  const eodRef   = useRef(null);

  // ── BATCH PARSE ────────────────────────────────────────────────────────────
  function parseBatchAdd(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split("|").map(s => s.trim());
      const name  = parts[0] ?? "";
      const ws    = ALL_WS.find(w => w.toLowerCase() === (parts[1] ?? "").toLowerCase()) ?? ALL_WS[0];
      const st    = ALL_STATUSES.find(s => s.toLowerCase() === (parts[2] ?? "").toLowerCase()) ?? "In Progress";
      return { name, workstream: ws, status: st, col: "backlog-wip", valid: name.length > 0 };
    });
  }

  function parseBatchUpdate(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [rawName, rawStatus] = line.split(/→|->/).map(s => s.trim());
      const item   = items.find(i => i.name.toLowerCase() === (rawName ?? "").toLowerCase());
      const status = ALL_STATUSES.find(s => s.toLowerCase() === (rawStatus ?? "").toLowerCase());
      return { raw: line, itemId: item?.id, itemName: item?.name ?? rawName, newStatus: status, valid: !!item && !!status };
    });
  }

  function confirmBatchAdd() {
    const valid = batchAdd.parsed.filter(p => p.valid);
    valid.forEach(p => onAddItem(p.name, p.workstream, p.status, p.col));
    showToast(`Added ${valid.length} item${valid.length !== 1 ? "s" : ""}`);
    setBatchAdd({ open: false, text: "", parsed: [], confirmed: false });
  }

  function confirmBatchUpdate() {
    const valid = batchUpdate.parsed.filter(p => p.valid);
    valid.forEach(p => onMoveItem(p.itemId, p.newStatus, null));
    showToast(`Updated ${valid.length} item${valid.length !== 1 ? "s" : ""}`);
    setBatchUpdate({ open: false, text: "", parsed: [], confirmed: false });
  }

  // ── CELL HELPER ────────────────────────────────────────────────────────────
  // col can be a full col object (supports combinedIds for merged columns) or a plain id string
  function cellItems(col, isComplete) {
    const ids = (col?.combinedIds ?? [col?.id ?? col]);
    return items.filter(i =>
      ids.includes(i.col) &&
      (isComplete ? i.status === "Complete" : i.status !== "Complete")
    );
  }

  function CardActions(item) {
    return {
      onMove:   () => setMoveForm({ open: true, item, toCol: item.col, toStatus: item.status }),
      onEdit:   () => setEditForm({ open: true, item, name: item.name, workstream: item.workstream, status: item.status, col: item.col }),
      onDelete: () => { onDeleteItem(item.id); showToast("Item deleted"); },
    };
  }

  // ── DATE COLUMN HEADER ─────────────────────────────────────────────────────
  function DateColHeader({ col }) {
    const isToday = col.id === today();
    return (
      <th style={{ padding: "10px 8px", textAlign: "left", minWidth: 140, background: col.isWeekend ? C.weekend : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? C.orange : C.text }}>{col.label}</span>
          {isToday && <span style={{ fontSize: 9, fontWeight: 700, background: C.orange, color: C.white, borderRadius: 4, padding: "1px 5px" }}>TODAY</span>}
        </div>
        {col.badge && (
          <div style={{ fontSize: 10, fontWeight: 700, color: col.badgeColor, marginTop: 3 }}>{col.badge}</div>
        )}
        {col.isWeekend && (
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2, fontStyle: "italic" }}>Weekend</div>
        )}
      </th>
    );
  }

  // ── ROW LABEL ──────────────────────────────────────────────────────────────
  function RowLabel({ text, color, dot }) {
    return (
      <td style={{ verticalAlign: "top", padding: "8px 10px 8px 0", width: 120 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{text}</span>
        </div>
      </td>
    );
  }

  // ── DATE CELL ──────────────────────────────────────────────────────────────
  function DateCell({ col, isComplete }) {
    const cell = cellItems(col, isComplete);
    const bg   = col.isWeekend ? C.weekend : C.surface;
    return (
      <td style={{ verticalAlign: "top", padding: "8px 6px", background: col.isWeekend ? C.weekend : "transparent" }}>
        <div style={{ background: bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px", minHeight: 80 }}>
          {cell.length === 0 && <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 16 }}>—</div>}
          {cell.map(item => <StickyCard key={item.id} item={item} compact {...CardActions(item)} />)}
        </div>
      </td>
    );
  }

  const nabCount = items.filter(i => i.col === "not-a-blocker").length;

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <Btn onClick={() => setAddForm({ ...emptyAdd, open: true })}>＋ Add Item</Btn>
        <Btn variant="secondary" onClick={() => setBatchAdd({ open: true, text: "", parsed: [], confirmed: false })}>＋ Batch Add</Btn>
        <Btn variant="secondary" onClick={() => setBatchUpdate({ open: true, text: "", parsed: [], confirmed: false })}>⇄ Batch Update</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" size="sm" disabled={!lastMove} onClick={onUndo}>↩ Undo</Btn>
        <div style={{ width: 1, height: 22, background: C.border, margin: "0 2px" }} />
        <Btn variant="ghost" size="sm" onClick={async () => {
          if (!boardRef.current) return;
          const { default: h2c } = await import("html2canvas");
          const canvas = await h2c(boardRef.current, { backgroundColor: C.bg, scale: 2, useCORS: true });
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = `board-${today()}.png`;
          a.click();
          showToast("📸 Board saved!");
        }}>📸 Board</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowEod(true)}>📋 EOD</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowExec(true)}>📊 Exec</Btn>
        <Btn variant="ghost" size="sm" onClick={() => { setExportJson(JSON.stringify({ items, moves, exportedAt: new Date().toISOString() }, null, 2)); setShowExport(true); }}>⬆ Export</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setShowImport(true)}>⬇ Import</Btn>
        <Btn variant="danger" size="sm" onClick={() => setShowReset(true)}>↺ Reset</Btn>
      </div>

      {/* Legend strip */}
      <div style={{ padding: "6px 28px", borderBottom: `1px solid ${C.border}`, background: C.surfaceElev }}>
        <WorkstreamLegend />
      </div>

      <div ref={boardRef} style={{ padding: "20px 28px 0" }}>

        {/* ── SECTION 1: DATE GRID ─────────────────────────────────────────── */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
          Sprint — {DATE_COLS[0].label} → {DATE_COLS[DATE_COLS.length - 1].label}
        </div>

        <div style={{ overflowX: "auto", marginBottom: 32 }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 120, padding: "10px 10px 10px 0" }} />
                {DATE_COLS.map(col => <DateColHeader key={col.id} col={col} />)}
              </tr>
            </thead>
            <tbody>
              {/* In Progress row */}
              <tr>
                <RowLabel text="In Progress" color={C.warning} dot={C.warning} />
                {DATE_COLS.map(col => <DateCell key={col.id} col={col} isComplete={false} />)}
              </tr>
              {/* Separator */}
              <tr>
                <td colSpan={DATE_COLS.length + 1} style={{ padding: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 1, background: C.border, flex: 1 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: "0.1em" }}>Completed</span>
                    <div style={{ height: 1, background: C.border, flex: 1 }} />
                  </div>
                </td>
              </tr>
              {/* Completed row */}
              <tr>
                <RowLabel text="Completed" color={C.success} dot={C.success} />
                {DATE_COLS.map(col => <DateCell key={col.id} col={col} isComplete={true} />)}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── SECTION 2: SPECIAL COLUMNS ───────────────────────────────────── */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
          Special Columns
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
          {SPECIAL_COLS.map(col => {
            const colItems = items.filter(i => i.col === col.id);
            return (
              <div key={col.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, background: C.surfaceElev, borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>{colItems.length}</span>
                </div>
                <div style={{ fontSize: 10, color: col.color, fontStyle: "italic", marginBottom: 8 }}>{col.note}</div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${col.color}`, borderRadius: 10, padding: "10px", minHeight: 80 }}>
                  {colItems.length === 0 && <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 20 }}>—</div>}
                  {colItems.map(item => <StickyCard key={item.id} item={item} {...CardActions(item)} />)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SECTION 3: PRE-SPRINT COMPLETE ───────────────────────────────── */}
        {(() => {
          const preItems = items.filter(i => i.col === "pre-sprint-complete");
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PRE_COL.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{PRE_COL.label}</span>
                <span style={{ fontSize: 11, color: C.textMuted, background: C.surfaceElev, borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>{preItems.length}</span>
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, fontStyle: "italic", marginBottom: 8 }}>{PRE_COL.note}</div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${PRE_COL.color}`, borderRadius: 10, padding: "12px 14px" }}>
                {preItems.length === 0 && <div style={{ fontSize: 11, color: C.textMuted }}>—</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                  {preItems.map(item => <StickyCard key={item.id} item={item} compact {...CardActions(item)} />)}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── ADD MODAL ── */}
      <Modal open={addForm.open} onClose={() => setAddForm(emptyAdd)} title="Add Item" width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Item Name</Label><Input value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} placeholder="Enter item name" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Workstream</Label><Select value={addForm.workstream} onChange={v => setAddForm(f => ({ ...f, workstream: v }))} options={ALL_WS} style={{ width: "100%" }} /></div>
            <div><Label>Status</Label><Select value={addForm.status} onChange={v => setAddForm(f => ({ ...f, status: v }))} options={ALL_STATUSES} style={{ width: "100%" }} /></div>
          </div>
          <div><Label>Column</Label><Select value={addForm.col} onChange={v => setAddForm(f => ({ ...f, col: v }))} options={COL_OPTIONS} style={{ width: "100%" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAddForm(emptyAdd)}>Cancel</Btn>
            <Btn disabled={!addForm.name.trim()} onClick={() => { onAddItem(addForm.name.trim(), addForm.workstream, addForm.status, addForm.col); showToast("Item added"); setAddForm(emptyAdd); }}>Add Item</Btn>
          </div>
        </div>
      </Modal>

      {/* ── MOVE MODAL ── */}
      <Modal open={moveForm.open} onClose={() => setMoveForm(emptyMove)} title={`Move: ${moveForm.item?.name}`} width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Move to Column</Label><Select value={moveForm.toCol} onChange={v => setMoveForm(f => ({ ...f, toCol: v }))} options={[{ value: "", label: "Select column…" }, ...COL_OPTIONS]} style={{ width: "100%" }} /></div>
          <div><Label>Status</Label><Select value={moveForm.toStatus} onChange={v => setMoveForm(f => ({ ...f, toStatus: v }))} options={[{ value: "", label: "Select status…" }, ...ALL_STATUSES.map(s => ({ value: s, label: s }))]} style={{ width: "100%" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setMoveForm(emptyMove)}>Cancel</Btn>
            <Btn
              disabled={!moveForm.toCol && !moveForm.toStatus}
              onClick={() => {
                onMoveItem(moveForm.item.id, moveForm.toStatus || moveForm.item.status, moveForm.toCol || moveForm.item.col);
                showToast("Moved!");
                setMoveForm(emptyMove);
              }}
            >Move</Btn>
          </div>
        </div>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={editForm.open} onClose={() => setEditForm(emptyEdit)} title="Edit Item" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Label>Item Name</Label><Input value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Workstream</Label><Select value={editForm.workstream} onChange={v => setEditForm(f => ({ ...f, workstream: v }))} options={ALL_WS} style={{ width: "100%" }} /></div>
            <div><Label>Status</Label><Select value={editForm.status} onChange={v => setEditForm(f => ({ ...f, status: v }))} options={ALL_STATUSES} style={{ width: "100%" }} /></div>
          </div>
          <div><Label>Column</Label><Select value={editForm.col} onChange={v => setEditForm(f => ({ ...f, col: v }))} options={COL_OPTIONS} style={{ width: "100%" }} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditForm(emptyEdit)}>Cancel</Btn>
            <Btn disabled={!editForm.name.trim()} onClick={() => { onEditItem(editForm.item.id, editForm.name.trim(), editForm.workstream, editForm.status, editForm.col); showToast("Updated"); setEditForm(emptyEdit); }}>Save</Btn>
          </div>
        </div>
      </Modal>

      {/* ── BATCH ADD MODAL ── */}
      <Modal open={batchAdd.open} onClose={() => setBatchAdd({ open: false, text: "", parsed: [], confirmed: false })} title="Batch Add Items" width={560}>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>One item per line: <code style={{ background: C.surfaceElev, padding: "2px 6px", borderRadius: 4 }}>Item Name | Workstream | Status</code> — added to Backlog / WIP</div>
        {!batchAdd.confirmed ? (
          <>
            <Input multiline rows={8} value={batchAdd.text} onChange={v => setBatchAdd(f => ({ ...f, text: v }))} placeholder={"Fix shipping webhook | Tech Team | In Progress\nTest US orders | $ Test | Outstanding"} />
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
            <Input multiline rows={8} value={batchUpdate.text} onChange={v => setBatchUpdate(f => ({ ...f, text: v }))} placeholder={"Fix shipping webhook → Complete\nTest US orders → In Progress"} />
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
        const eodLaunch  = items.filter(i => i.col !== "not-a-blocker");
        const eodDone    = eodLaunch.filter(i => i.status === "Complete").length;
        const eodTotal   = eodLaunch.length;
        const todayId    = today();
        const todayCol   = DATE_COLS.find(c => c.id === todayId);
        const todayItems = items.filter(i => i.col === todayId);
        const todayDone  = todayItems.filter(i => i.status === "Complete");
        const todayOpen  = todayItems.filter(i => i.status !== "Complete");
        const tomorrowId = DATE_COLS[DATE_COLS.findIndex(c => c.id === todayId) + 1]?.id;
        const tomorrowItems = tomorrowId ? items.filter(i => i.col === tomorrowId) : [];
        const daysLeft   = daysTo("2026-05-05");

        // Shared: workstream health bars (used in both options)
        const WSBars = () => (
          <div>
            {WS_LEGEND.map(ws => {
              const wsItems = items.filter(i => i.workstream === ws && i.col !== "not-a-blocker");
              const wip   = wsItems.filter(i => i.status === "In Progress").length;
              const done  = wsItems.filter(i => i.status === "Complete").length;
              const total = wsItems.length;
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
              const color = WS_COLORS[ws] ?? C.orange;
              return (
                <div key={ws} style={{ padding: "8px 0", borderBottom: `1px solid ${NAV.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: NAV.text }}>{ws}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
                      <span style={{ color: "#D4920E" }}>⬤ {wip} wip</span>
                      <span style={{ color: "#3DBF88" }}>⬤ {done} done</span>
                      <span style={{ fontWeight: 700, color: pct === 100 ? "#3DBF88" : color }}>{pct}%</span>
                    </div>
                  </div>
                  <SegmentedBar done={done} wip={wip} total={total} height={6} />
                </div>
              );
            })}
          </div>
        );

        // Shared: footer (NAB note + launch cards + legend)
        const Footer = () => (
          <>
            {nabCount > 0 && (
              <div style={{ fontSize: 10, color: "rgba(14,138,126,0.75)", fontStyle: "italic", marginTop: 10 }}>
                ⚑ {nabCount} item{nabCount !== 1 ? "s" : ""} in "Not a Blocker" — noted for visibility, not counted
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
              <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
              <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />
            </div>
            <div style={{ marginTop: 14, borderTop: `1px solid ${NAV.border}`, paddingTop: 10 }}>
              <WorkstreamLegend dark />
            </div>
          </>
        );

        return (
          <Modal open={showEod} onClose={() => setShowEod(false)} title="End of Day Summary" width={640}>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["A", "📊 Pipeline View"], ["B", "📋 Today's Rundown"]].map(([v, label]) => (
                <button key={v} onClick={() => setEodView(v)} style={{
                  padding: "7px 14px", borderRadius: 8, border: `1px solid ${eodView === v ? C.orange : C.borderMid}`,
                  background: eodView === v ? C.orangeFaint : "transparent", color: eodView === v ? C.orange : C.textSub,
                  fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit"
                }}>{label}</button>
              ))}
            </div>

            <div id="eod-capture" ref={eodRef} style={{ background: NAV.bg, padding: 24, borderRadius: 10 }}>
              {/* Header */}
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: C.orange, textTransform: "uppercase", marginBottom: 2 }}>
                {eodView === "A" ? "Sprint Pipeline" : "Today's Rundown"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAV.text, marginBottom: 2 }}>Fluent Commerce — End of Day</div>
              <div style={{ fontSize: 11, color: NAV.textMuted, marginBottom: 16 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {daysLeft !== null && <span style={{ marginLeft: 12, color: C.orange, fontWeight: 700 }}>🚀 {daysLeft}d to deploy</span>}
              </div>

              {/* ── OPTION A: PIPELINE VIEW ────────────────────────────────── */}
              {eodView === "A" && (() => {
                // Build rows: each date col + backlog/wip + pre-sprint complete
                const allCols = [
                  ...DATE_COLS.map(c => ({
                    id: c.combinedIds ?? [c.id],
                    label: c.label,
                    badge: c.badge,
                    isToday: c.id === todayId,
                    isWeekend: c.isWeekend,
                  })),
                  { id: ["backlog-wip"],         label: "Backlog / WIP",        color: "#C0397B" },
                  { id: ["pre-sprint-complete"],  label: "✓ Pre-Sprint Complete", color: "#2D9B6F" },
                ];
                return (
                  <div style={{ marginBottom: 16 }}>
                    {/* Summary strip */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <div style={{ background: "rgba(45,155,111,0.18)", border: "1px solid rgba(45,155,111,0.4)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 32, fontWeight: 900, color: "#3DBF88", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{eodDone}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#3DBF88", textTransform: "uppercase", marginTop: 4 }}>Total Complete</div>
                      </div>
                      <div style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 32, fontWeight: 900, color: NAV.text, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{eodTotal}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textMuted, textTransform: "uppercase", marginTop: 4 }}>Total on Board</div>
                      </div>
                    </div>

                    {/* Day-by-day table */}
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Day Breakdown</div>
                    {allCols.map(col => {
                      const ids    = col.id;
                      const colItems = items.filter(i => ids.includes(i.col));
                      const wip    = colItems.filter(i => i.status !== "Complete").length;
                      const done   = colItems.filter(i => i.status === "Complete").length;
                      const total  = colItems.length;
                      if (total === 0 && !col.isToday) return null;
                      const accent = col.color ?? (col.isWeekend ? "#8B7FB8" : col.isToday ? C.orange : NAV.textSub);
                      return (
                        <div key={ids.join()} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                          borderRadius: 8, marginBottom: 4,
                          background: col.isToday ? "rgba(240,90,34,0.12)" : "rgba(255,255,255,0.04)",
                          border: col.isToday ? `1px solid rgba(240,90,34,0.3)` : "1px solid transparent",
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 12, fontWeight: col.isToday ? 700 : 500, color: NAV.text }}>
                            {col.label}
                            {col.isToday && <span style={{ fontSize: 9, color: C.orange, fontWeight: 700, marginLeft: 6 }}>TODAY</span>}
                            {col.badge && <span style={{ fontSize: 9, marginLeft: 6, color: accent }}>{col.badge}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                            <span style={{ color: "#D4920E", fontWeight: 600 }}>{wip > 0 ? `${wip} open` : "—"}</span>
                            <span style={{ color: "#3DBF88", fontWeight: 600 }}>{done > 0 ? `${done} done` : "—"}</span>
                            <span style={{ color: NAV.textMuted, minWidth: 40, textAlign: "right" }}>{total} total</span>
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 14, borderTop: `1px solid ${NAV.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Workstream Health</div>
                      <WSBars />
                    </div>
                  </div>
                );
              })()}

              {/* ── OPTION B: TODAY'S RUNDOWN ──────────────────────────────── */}
              {eodView === "B" && (() => {
                return (
                  <div style={{ marginBottom: 16 }}>
                    {/* Big 3 tiles */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                      <div style={{ background: "rgba(45,155,111,0.18)", border: "1px solid rgba(45,155,111,0.4)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "#3DBF88", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{todayDone.length}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#3DBF88", textTransform: "uppercase", marginTop: 5 }}>Closed Today</div>
                      </div>
                      <div style={{ background: "rgba(196,125,10,0.18)", border: "1px solid rgba(196,125,10,0.4)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "#D4920E", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{todayOpen.length}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#D4920E", textTransform: "uppercase", marginTop: 5 }}>Still Open Today</div>
                      </div>
                      <div style={{ background: "rgba(240,90,34,0.15)", border: "1px solid rgba(240,90,34,0.35)", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: C.orange, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{daysLeft ?? "—"}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: C.orange, textTransform: "uppercase", marginTop: 5 }}>Days to Deploy</div>
                      </div>
                    </div>

                    {/* Closed today list */}
                    {todayDone.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#3DBF88", textTransform: "uppercase", marginBottom: 8 }}>✓ Closed Today</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {todayDone.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(45,155,111,0.1)", borderRadius: 7, borderLeft: `3px solid ${WS_COLORS[item.workstream] ?? C.orange}` }}>
                              <span style={{ fontSize: 12, color: NAV.text, flex: 1 }}>{item.name}</span>
                              <span style={{ fontSize: 10, color: NAV.textMuted }}>{item.workstream}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Still open today */}
                    {todayOpen.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#D4920E", textTransform: "uppercase", marginBottom: 8 }}>⬤ Still Open Today</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {todayOpen.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(196,125,10,0.1)", borderRadius: 7, borderLeft: `3px solid ${WS_COLORS[item.workstream] ?? C.orange}` }}>
                              <span style={{ fontSize: 12, color: NAV.text, flex: 1 }}>{item.name}</span>
                              <span style={{ fontSize: 10, color: NAV.textMuted }}>{item.workstream}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(196,125,10,0.75)", fontStyle: "italic", marginTop: 7 }}>
                          ↪ These items didn't close today — move to the next day's column if they're carrying over.
                        </div>
                      </div>
                    )}

                    {/* Tomorrow preview — full item list */}
                    {(tomorrowItems.length > 0) && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textSub, textTransform: "uppercase", marginBottom: 8 }}>
                          ⬤ Up Next · {DATE_COLS.find(c => c.id === tomorrowId)?.label}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {tomorrowItems.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 7, borderLeft: `3px solid ${WS_COLORS[item.workstream] ?? C.orange}` }}>
                              <span style={{ fontSize: 12, color: NAV.text, flex: 1 }}>{item.name}</span>
                              <span style={{ fontSize: 10, color: NAV.textMuted }}>{item.workstream}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {todayDone.length === 0 && todayOpen.length === 0 && (
                      <div style={{ color: NAV.textMuted, fontSize: 12, fontStyle: "italic", marginBottom: 14 }}>No items assigned to today's column yet.</div>
                    )}

                    <div style={{ borderTop: `1px solid ${NAV.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: NAV.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Workstream Health</div>
                      <WSBars />
                    </div>
                  </div>
                );
              })()}

              <Footer />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <Btn onClick={async () => {
                const { default: h2c } = await import("html2canvas");
                const canvas = await h2c(eodRef.current, { backgroundColor: NAV.bg, scale: 2 });
                const a = document.createElement("a");
                a.href = canvas.toDataURL();
                a.download = `eod-${today()}.png`;
                a.click();
                showToast("Saved!");
              }}>📸 Save Image</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* ── EXEC MODAL ── */}
      <Modal open={showExec} onClose={() => setShowExec(false)} title="Exec Summary" width={620}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total",       value: items.filter(i => i.col !== "not-a-blocker").length,                                              color: C.orange  },
            { label: "Complete",    value: items.filter(i => i.col !== "not-a-blocker" && i.status === "Complete").length,    color: C.success },
            { label: "In Progress", value: items.filter(i => i.col !== "not-a-blocker" && i.status === "In Progress").length, color: C.warning },
            { label: "Outstanding", value: items.filter(i => i.col !== "not-a-blocker" && i.status === "Outstanding").length, color: C.danger  },
          ].map(t => (
            <div key={t.label} style={{ background: C.surfaceElev, border: `1px solid ${C.border}`, borderTop: `3px solid ${t.color}`, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.color, fontFamily: "'DM Mono',monospace" }}>{t.value}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 4, textTransform: "uppercase", fontWeight: 700 }}>{t.label}</div>
            </div>
          ))}
        </div>
        {ALL_WS.map(ws => <WSHealthRow key={ws} ws={ws} items={items} />)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <LaunchCard label="CA Launch" deployDate={project.launchCA} inStoresDate={project.launchCAInStores ?? project.launchCA} color={C.teal} />
          <LaunchCard label="US Launch" deployDate={project.launchUS} inStoresDate={project.launchUSInStores ?? project.launchUS} color={C.orange} />
        </div>
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <WorkstreamLegend />
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
              onBatchAdd(d.items.map(migrateItem), d.moves, true);
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
function MoveLogTab({ moves }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterWS,   setFilterWS]   = useState("All");
  const [filterSt,   setFilterSt]   = useState("All");
  const [onlyMoves,  setOnlyMoves]  = useState(false);

  const filtered = moves
    .filter(m => !filterDate || m.ts.startsWith(filterDate))
    .filter(m => filterWS === "All" || m.workstream === filterWS)
    .filter(m => filterSt === "All" || m.to === filterSt)
    .filter(m => !onlyMoves || (m.from && m.from !== m.to))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const groups = {};
  filtered.forEach(m => { const d = m.ts.split("T")[0]; if (!groups[d]) groups[d] = []; groups[d].push(m); });

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ background: C.surfaceElev, border: `1px solid ${C.borderMid}`, borderRadius: 8, color: C.text, fontSize: 12, padding: "7px 10px", fontFamily: "inherit", outline: "none" }} />
        <Select value={filterWS} onChange={setFilterWS} options={["All", ...ALL_WS]} style={{ minWidth: 130 }} />
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
              const toMeta   = STATUS_META[m.to]   ?? {};
              const fromMeta = STATUS_META[m.from]  ?? {};
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
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("#F05A22");
  const [newCA,    setNewCA]    = useState("");
  const [newUS,    setNewUS]    = useState("");

  function handleAdd() {
    if (!newName.trim() || !newCA || !newUS) return;
    onAdd({ id: slug(newName) + "-" + Date.now(), name: newName.trim(), color: newColor, launchCA: newCA, launchUS: newUS });
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

  const saveTimer   = useRef(null);
  const boardLoaded = useRef(false);
  const showToast   = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        const defaults = [{ id: "fluent-commerce", name: "Fluent Commerce", color: "#F05A22", launchCA: "2026-03-24", launchCAInStores: "2026-03-25", launchUS: "2026-05-05", launchUSInStores: "2026-05-06" }];
        if (Array.isArray(data) && data.length > 0) {
          // Update US dates if still old values
          const updated = data.map(p => ({
            ...p,
            launchUS:         p.launchUS         === "2026-03-30" ? "2026-05-05" : p.launchUS,
            launchUSInStores: p.launchUSInStores  === "2026-03-31" ? "2026-05-06" : p.launchUSInStores,
          }));
          setProjects(updated);
          setActiveId(updated[0].id);
        } else {
          setProjects(defaults);
          setActiveId("fluent-commerce");
          fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defaults) }).catch(() => {});
        }
      })
      .catch(() => {
        const defaults = [{ id: "fluent-commerce", name: "Fluent Commerce", color: "#F05A22", launchCA: "2026-03-24", launchCAInStores: "2026-03-25", launchUS: "2026-05-05", launchUSInStores: "2026-05-06" }];
        setProjects(defaults);
        setActiveId("fluent-commerce");
      });
  }, []);

  // Load board data + migrate old items
  useEffect(() => {
    if (!activeId) return;
    boardLoaded.current = false;
    setLoaded(false);
    fetch(`/api/board/${activeId}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setItems((data.items ?? []).map(migrateItem));
          setMoves(data.moves ?? []);
        } else {
          setItems([]); setMoves([]);
        }
        setLoaded(true);
        boardLoaded.current = true;
      })
      .catch(() => { setLoaded(true); boardLoaded.current = true; });
  }, [activeId]);

  // Auto-save
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

  // Save projects metadata
  useEffect(() => {
    if (projects.length === 0) return;
    fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projects) }).catch(() => {});
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeId) ?? projects[0];
  const lastMove = moves.length > 0 ? [...moves].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0] : null;

  // ── ITEM OPERATIONS ───────────────────────────────────────────────────────
  function addItem(name, workstream, status, col = "backlog-wip") {
    const id = Date.now().toString();
    const newItem = { id, name, workstream, status, col, createdAt: new Date().toISOString() };
    const move    = { id: id + "m", itemId: id, itemName: name, workstream, from: null, to: status, ts: new Date().toISOString() };
    setItems(prev => [...prev, newItem]);
    setMoves(prev => [...prev, move]);
  }

  function moveItem(itemId, toStatus, toCol) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newStatus = toStatus || item.status;
    const newCol    = toCol    || item.col;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus, col: newCol } : i));
    if (newStatus !== item.status) {
      const move = { id: Date.now().toString() + "m", itemId, itemName: item.name, workstream: item.workstream, from: item.status, to: newStatus, ts: new Date().toISOString() };
      setMoves(prev => [...prev, move]);
    }
  }

  function editItem(itemId, name, workstream, status, col) {
    const item = items.find(i => i.id === itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, name, workstream, status, col: col ?? i.col } : i));
    if (item && item.status !== status) {
      const move = { id: Date.now().toString() + "m", itemId, itemName: name, workstream, from: item.status, to: status, ts: new Date().toISOString() };
      setMoves(prev => [...prev, move]);
    }
  }

  function deleteItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  function replaceBoard(newItems, newMoves, replace = false) {
    if (replace) {
      setItems(newItems.map(migrateItem));
      setMoves(newMoves);
    } else {
      const existingIds = new Set(items.map(i => i.id));
      setItems(prev => [...prev, ...newItems.filter(i => !existingIds.has(i.id)).map(migrateItem)]);
      setMoves(prev => [...prev, ...newMoves]);
    }
  }

  function undo() {
    if (!lastMove) return;
    if (lastMove.from === null) {
      deleteItem(lastMove.itemId);
    } else {
      moveItem(lastMove.itemId, lastMove.from, null);
    }
    setMoves(prev => prev.filter(m => m.id !== lastMove.id));
  }

  if (!activeProject) return <div style={{ padding: 40, color: C.textMuted }}>Loading…</div>;

  // ── NAV ───────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "board",     label: "Board"     },
    { id: "log",       label: "Move Log"  },
  ];

  const launchExcl = items.filter(i => i.col !== "not-a-blocker");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: NAV.bg, borderBottom: `1px solid ${NAV.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 20px", height: 48 }}>
          {/* Brand */}
          <button onClick={() => setShowProjMgr(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: activeProject?.color ?? C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14 }}>⚡</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: NAV.text }}>{activeProject?.name}</span>
            <span style={{ fontSize: 11, color: NAV.textMuted }}>▾</span>
          </button>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{
                background: "none", border: "none", color: tab === n.id ? NAV.text : NAV.textSub,
                fontWeight: tab === n.id ? 700 : 500, fontSize: 13, padding: "4px 14px", cursor: "pointer",
                borderBottom: tab === n.id ? `2px solid ${activeProject?.color ?? C.orange}` : "2px solid transparent",
                borderRadius: 0, fontFamily: "inherit",
              }}>{n.label}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
            {[
              { label: "Total",  v: launchExcl.length,                                              color: NAV.textSub },
              { label: "Done",   v: launchExcl.filter(i => i.status === "Complete").length,         color: C.success   },
              { label: "Active", v: launchExcl.filter(i => i.status === "In Progress").length,      color: C.orange    },
            ].map(s => (
              <div key={s.label} style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 20, padding: "4px 12px", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: s.color }}>{s.v}</span>
                <span style={{ color: NAV.textMuted }}>{s.label}</span>
              </div>
            ))}
            <div style={{ background: NAV.surface, border: `1px solid ${NAV.border}`, borderRadius: 20, padding: "4px 12px", color: NAV.textMuted, fontSize: 11 }}>
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === "dashboard" && activeProject && (
        <DashboardTab items={items} moves={moves} project={activeProject} />
      )}
      {tab === "board" && activeProject && (
        <BoardTab
          items={items} moves={moves} project={activeProject}
          onAddItem={addItem} onMoveItem={moveItem} onEditItem={editItem}
          onDeleteItem={deleteItem} onBatchAdd={replaceBoard} onBatchUpdate={() => {}}
          showToast={showToast} onUndo={undo} lastMove={lastMove}
        />
      )}
      {tab === "log" && (
        <MoveLogTab moves={moves} />
      )}

      <Toast msg={toast} />

      <ProjectManager
        open={showProjMgr} onClose={() => setShowProjMgr(false)}
        projects={projects} activeId={activeId}
        onSwitch={id => setActiveId(id)}
        onAdd={p => setProjects(prev => [...prev, p])}
        onDelete={id => setProjects(prev => prev.filter(p => p.id !== id))}
      />
    </div>
  );
}
