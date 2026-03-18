# Fluent War Room Board Tracker — README

> **Tool:** Fluent HQ SWARM War Room Board Tracker
> **Owner:** Natalia Nakonieczny
> **Last Updated:** 2026-03-12

---

## What It Is

A React-based digital war room board for tracking the Fluent HQ SWARM sprint. Mirrors a physical sticky-note board — items live in workstream columns and move across status rows as work progresses.

Runs locally via a Vite dev server. All board state auto-saves to `data/board-live.json` every time you make a change — no manual saving required during a session.

---

## How to Start It

**From Claude Code:**
> Say "start the war room board" and TARS will spin it up in the Preview panel.

**Manually:**
```bash
cd 'Natalia/Fluent War Room Board'
npm install        # first time only
npm run dev        # opens at http://127.0.0.1:5174
```

---

## Board Layout

| | Tech Team | $ Test | $ Reporting | SSO | Aurus |
|---|---|---|---|---|---|
| **Outstanding** | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| **In Progress** | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **Complete** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |

---

## Features

### Adding Items
| Method | How |
|--------|-----|
| **Single item** | ＋ Add button → fill name, workstream, status |
| **Bulk load** | ＋ Batch Add → paste one per line: `Item Name \| Workstream \| Status` |

### Moving Items
| Method | How |
|--------|-----|
| **Single move** | Hover a sticky → ⇄ button → pick new status |
| **Bulk move** | ⇄ Batch Update → paste one per line: `Item Name → New Status` |

### Other Actions
| Action | How |
|--------|-----|
| **Edit item name** | Hover sticky → ✎ |
| **Delete item** | Hover sticky → ✕ |
| **View move history** | Move Log tab — filterable by date, workstream, status |
| **End of day snapshot** | 📋 End of Day → sprint summary with workstream progress bars |
| **Screenshot the board** | 📸 Board → right-click image → Save As |
| **Executive summary** | Exec Summary button (if visible) |
| **Export data** | Export button → copy JSON |
| **Import data** | Import button → paste JSON |
| **Reset everything** | Reset button → clears all items + move log (cannot undo) |

---

## Batch Format Reference

### Batch Add
```
Item Name | Workstream | Status
Zuplo API Gateway Configs | Tech Team | Outstanding
Apropos Test Loaded | $ Test | Complete
Nyco Tax Reporting | $ Reporting | In Progress
```

### Batch Update
```
Item Name → New Status
Zuplo API Gateway Configs → In Progress
Apropos Test Loaded → Complete
```

- Workstream and status matching is **case-insensitive**
- Duplicates are auto-skipped
- Invalid entries are flagged in the preview — review before applying

---

## Daily Reconciliation (Physical Board → Digital Tracker)

At end of day or any standup, photo the physical board and drop the images in a Claude Code chat. TARS will:
1. Read every sticky note — name, workstream column, status row
2. Diff against the current digital tracker
3. Output ready-to-paste **Batch Add** and **Batch Update** lists

The physical board is always the source of truth. TARS never auto-deletes — only flags items missing from the board for manual review.

---

## Saving Backups

The board auto-saves continuously to `data/board-live.json`. For a point-in-time snapshot, say **"save a backup"** and TARS saves two dated files:

| File | Location | What It Is |
|------|----------|-----------|
| `fluent-war-room-YYYY-MM-DD.jsx` | root | Tool source snapshot — portable, pasteable into Claude |
| `board-backup-YYYY-MM-DD.json` | `data/` | Board state snapshot — all items + move log |

---

## File Structure

```
Fluent War Room Board/
├── CLAUDE.md                          # TARS context file (read this first)
├── fluent-war-room-YYYY-MM-DD.jsx     # Dated tool snapshots
├── index.html
├── package.json
├── vite.config.js                     # File API plugin (auto-save to disk)
├── src/
│   ├── main.jsx
│   └── fluent-war-room.jsx            # Live source — edit this to change the app
├── data/
│   ├── board-live.json                # Always-current board state (auto-saved)
│   └── board-backup-YYYY-MM-DD.json  # Dated snapshots
└── docs/
    ├── fluent-war-room-README.md      # This file
    └── LOG-daily-changes.md           # Running change log
```
