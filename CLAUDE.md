# Fluent War Room Board — Claude Code Context

> **Project:** Fluent HQ SWARM War Room Board Tracker
> **Last Updated:** 2026-03-12
> **Status:** Active — Fluent HQ SWARM sprint tracking
> **Owner:** Natalia Nakonieczny
> **Read this file first.** It is the primary context file for all work in this project.

---

## What It Is

A React war room board tracker for the Fluent HQ SWARM sprint. Runs locally via Vite dev server with a built-in file API — board state auto-saves to `data/board-live.json` on every change (1s debounce). No manual save needed during a session.

**Workstreams:** Tech Team · $ Test · $ Reporting · SSO · Aurus
**Statuses:** Outstanding / In Progress / Complete

---

## How to Run

**Via Claude Code (recommended):**
> Say "start the war room board" — TARS fires up the Vite server and renders it in the Preview panel.

**Local Vite (manual):**
```bash
cd 'Natalia/Fluent War Room Board'
npm install   # first time only
npm run dev   # opens at http://127.0.0.1:5174
```

---

## GitHub — Pushing Updates

**Repo:** `https://github.com/natalianakon/ZUMZ-Fluent-War-Room-Tracker`

**Push changes (this machine — Keychain handles auth):**
```bash
cd "/Users/natalian/Desktop/ZUMIEZ/Natalia/Fluent War Room Board"
git add .
git commit -m "what you changed"
git push
```

**Push on a new machine (token required first time):**
```bash
cd "/Users/natalian/Desktop/ZUMIEZ/Natalia/Fluent War Room Board"
git add .
git commit -m "what you changed"
git push https://YOUR_TOKEN@github.com/natalianakon/ZUMZ-Fluent-War-Room-Tracker.git main
```
> Token expires Apr 17, 2026 — regenerate at GitHub → Settings → Developer Settings → Fine-grained tokens.

**Clone fresh on a new machine:**
```bash
cd ~/Desktop
git clone https://github.com/natalianakon/ZUMZ-Fluent-War-Room-Tracker.git
cd ZUMZ-Fluent-War-Room-Tracker
npm install
npm run dev
```

---

## Files

| File | Location | Description |
|------|----------|-------------|
| `fluent-war-room.jsx` | `src/` | Live source — edit this to change the app |
| `fluent-war-room-YYYY-MM-DD.jsx` | root | Portable snapshot — share or paste into Claude |
| `board-live.json` | `data/` | **Always-current board state** — auto-saved by the app |
| `board-backup-YYYY-MM-DD.json` | `data/` | Dated snapshots |
| `CLAUDE.md` | root | This file |
| `LOG-daily-changes.md` | `docs/` | Running change log |

---

## Persistence Architecture

```
Board change → auto-save (1s debounce) → board-live.json
"Save a backup" → TARS saves 2 dated files (see below)
📸 Board button → screenshot (right-click to save)
📋 End of Day → sprint snapshot modal
```

---

## "Save a Backup" — Backup Protocol

When Natalia says **"save a backup"** or **"save"**, TARS saves the following dated files:

| # | File | Saved To | What It Is |
|---|------|----------|-----------|
| 1 | `fluent-war-room-YYYY-MM-DD.jsx` | root | Tool code snapshot — portable, pasteable into Claude |
| 2 | `board-backup-YYYY-MM-DD.json` | `data/` | Board state snapshot — all items and move log |

> If the same date already exists, TARS overwrites it with the latest version.
> File 2 is the critical one. File 1 lets you paste the tool into any Claude chat for offline use.

---

## Board Features

| Feature | How to Use |
|---------|-----------|
| **Add Item** | ＋ Add button or ＋ Batch Add for bulk |
| **Move Item** | Hover a sticky → ⇄ button |
| **Edit Item** | Hover a sticky → ✎ button |
| **Delete Item** | Hover a sticky → ✕ button |
| **Batch Update** | ⇄ Batch Update → paste `Item Name → New Status` lines |
| **Batch Add** | ＋ Batch Add → paste `Item Name \| Workstream \| Status` lines |
| **End of Day** | 📋 End of Day → sprint snapshot with workstream progress bars |
| **Screenshot** | 📸 Board → right-click image → Save As |
| **Move Log** | Switch to Move Log tab — filterable by date, workstream, status |
| **Reset** | Reset button → clears all items and move log (cannot undo) |

---

## Reconciliation Workflow (Physical Board → Digital Tracker)

When Natalia photos the physical war room board, share the photos and TARS will:
1. Read each sticky note: name, workstream column, status row
2. Diff against the current tracker state
3. Output ready-to-paste **Batch Add** and **Batch Update** lists

Board is always the source of truth. TARS never auto-deletes — only flags items missing from the board.

---

## Roadmap

- [ ] Load initial board items from existing war room board (Batch Add from first photo reconciliation)
- [ ] SharePoint or Teams integration for team-wide visibility
- [ ] Daily end-of-day summary → email/Slack digest

---

## Known Issues

None yet — fresh build.
