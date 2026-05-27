# Weekly Learning Log — CRM › Learnings

Redesign the existing `learnings` tab in `src/pages/admin/CRMPipeline.tsx` to match the spreadsheet pattern in the screenshot: a weekly retrospective log with three reflection columns (what worked / what got stuck / adjustment for next week), one row per ISO week, dynamic and intelligent.

The current schema (`theme`, `insight`, `category`, `source_company_ids`) is kept for backward compatibility and reused under the hood, plus three new columns added for the structured retrospective fields.

## What the user will see

A new full-width panel replacing the current chips-grouped list:

```text
┌─ MUNDUS TRADE — WEEKLY LEARNING LOG ─────────────────────────────┐
│  Wine header · subtitle · current ISO week badge · [+ New week]  │
├──────┬──────────┬─────────────┬──────────────┬───────────────────┤
│ Week │  Filled  │ ✓ Worked    │ ⚠ Stuck      │ 🔧 Next-week fix  │
├──────┼──────────┼─────────────┼──────────────┼───────────────────┤
│ W22  │ May 27   │ tactic text │ blocker text │ concrete action   │
│ 2026 │          │ +tags chips │ +tags chips  │ owner · due date  │
├──────┴──────────┴─────────────┴──────────────┴───────────────────┤
│ Summary footer: streak, weeks logged, top recurring blocker      │
└──────────────────────────────────────────────────────────────────┘
```

Key behaviors:
- **Inline editing** — click any cell, edit in place, autosave on blur (debounced). Empty cells show a faint placeholder.
- **Current week is pinned** at the top with a "THIS WEEK" wine pill; older weeks stack below.
- **Quick-add row** for any missing ISO week back to the first entry, so the operator can backfill.
- **Tag chips** inside each cell (objection, persona, stage, channel) — typed with `#tag` syntax, rendered as wine outline chips.
- **Smart suggestions panel** (collapsible right sidebar): scans the last 4 weeks and surfaces repeat blockers ("'price objection' appeared 3 weeks in a row") and unresolved next-week actions still pending.
- **Filters** above the table: by quarter, by operator (created_by), free-text search across all three columns.
- **Keyboard nav** — Tab/Shift+Tab between cells, Enter to commit, Esc to cancel.
- **Empty state** — friendly CTA "Log your first retrospective — 15 minutes that prevents repeating the same mistake".

## Styling

Strictly Mundus tokens (no new palettes):
- Header band: `--mundus-wine` gradient, white text.
- "Worked" column accent: existing `--mundus-success` / sage green token.
- "Stuck" column accent: existing `--mundus-danger` / wine-red.
- "Next-week fix" column accent: existing `--mundus-info` / deep blue.
- Body cells: cream `#FBF9F4` (already used in docs module) on hover, white default.
- Tight density to match the other admin tables (`.adm-table-tight`).

## i18n

All copy goes through `t()` under `admin.crm.pipeline.learnings.*` with keys added to `en.json`, `pt.json`, `es.json`, `fr.json`, `zh.json`:
- `title`, `subtitle`, `thisWeek`, `newWeek`, `colWeek`, `colFilled`, `colWorked`, `colWorkedHint`, `colStuck`, `colStuckHint`, `colNext`, `colNextHint`, `placeholderWorked`, `placeholderStuck`, `placeholderNext`, `filters.quarter`, `filters.operator`, `filters.search`, `insights.repeating`, `insights.pending`, `empty.title`, `empty.cta`, `streak`, `weeksLogged`.

## Technical changes

### 1. Migration — extend `crm_learnings`
Add the three structured fields plus an operator pointer:
```sql
alter table public.crm_learnings
  add column if not exists worked text,
  add column if not exists stuck text,
  add column if not exists next_action text,
  add column if not exists next_action_due date,
  add column if not exists tags text[] default '{}',
  add column if not exists created_by uuid;

-- one row per (operator, week) for the retrospective view
create unique index if not exists crm_learnings_op_week_uniq
  on public.crm_learnings (created_by, week_start)
  where worked is not null or stuck is not null or next_action is not null;
```
Existing `theme` / `insight` / `category` remain for the legacy free-form learnings; the new view writes to `worked` / `stuck` / `next_action`. Grants and RLS already exist on the table — no changes needed there.

### 2. New component
`src/components/admin/learnings/WeeklyLearningLog.tsx` — owns fetch, week-bucket generation, inline-edit state, autosave, smart-insights computation. Self-contained; receives no props beyond `refresh`.

### 3. Wire-up in `CRMPipeline.tsx`
Replace the body of the `learnings` tab branch (around line 277) with `<WeeklyLearningLog />`. Drop `AddLearningModal` and the chips-grouped renderer (kept only if referenced elsewhere — verify and remove dead code).

### 4. Stylesheet
`src/styles/mundus-learning-log.css` — table, header band, accent column borders, chip styles, smart-insights sidebar, hover/edit states. Reuses existing CSS variables only.

### 5. Smart-insights helper
Pure function inside the component:
- Group `stuck` text by lowercase keyword frequency over last 4 weeks → list of repeating blockers.
- Find `next_action` rows older than 1 week where the next week's `worked` doesn't mention any of the action keywords → "pending follow-through".

## Out of scope
- No changes to other CRM tabs.
- No removal of the legacy `theme/insight/category` data — preserved in DB; only hidden from this new view.
- No AI / LLM call — "smart" is heuristic, deterministic, instant.

