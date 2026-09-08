-- Adds scheduled events alongside plain to-dos, and clock times for both.
--
--   kind = 'task'  : an optional due_date, plus an optional end_time (마감시간).
--   kind = 'event' : a meeting or appointment — always a date and a
--                    start_time/end_time pair (시작/종료 시간).
--
-- Additive only: existing rows become kind = 'task' with both times NULL.

ALTER TABLE todos ADD COLUMN IF NOT EXISTS kind       text NOT NULL DEFAULT 'task';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS end_time   time;

ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_kind_check;
ALTER TABLE todos ADD  CONSTRAINT todos_kind_check CHECK (kind IN ('task', 'event'));

-- Keep the two shapes from drifting: only events carry a start_time, and a
-- bare time with no date would be meaningless on either shape.
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_times_check;
ALTER TABLE todos ADD  CONSTRAINT todos_times_check CHECK (
  CASE kind
    WHEN 'event' THEN
      due_date IS NOT NULL AND start_time IS NOT NULL
      AND end_time IS NOT NULL AND end_time > start_time
    ELSE
      start_time IS NULL AND (end_time IS NULL OR due_date IS NOT NULL)
  END
);
