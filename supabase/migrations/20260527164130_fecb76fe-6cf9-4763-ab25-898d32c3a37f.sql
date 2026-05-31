ALTER TABLE public.crm_learnings
  ADD COLUMN IF NOT EXISTS worked text,
  ADD COLUMN IF NOT EXISTS stuck text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_due date,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS filled_at timestamptz;

CREATE INDEX IF NOT EXISTS crm_learnings_week_idx ON public.crm_learnings (week_start DESC);
CREATE INDEX IF NOT EXISTS crm_learnings_created_by_idx ON public.crm_learnings (created_by);