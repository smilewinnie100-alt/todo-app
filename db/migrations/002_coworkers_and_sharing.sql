-- Co-workers, item sharing, and the in-app notifications both of them raise.

-- Emails are the handle used to look someone up, so they have to be unique.
-- Signup already checks for a duplicate in application code; this closes the
-- race between that check and the INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- A one-directional address book: having someone here lets me share items with
-- them. It grants me nothing over their own items.
CREATE TABLE IF NOT EXISTS coworkers (
  owner_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  coworker_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, coworker_id),
  CONSTRAINT coworkers_not_self CHECK (owner_id <> coworker_id)
);

-- Who a todo/event is shared with. Sharees are full co-editors, so the only
-- thing this table does not grant is re-sharing (owner keeps that).
CREATE TABLE IF NOT EXISTS todo_shares (
  todo_id    uuid NOT NULL REFERENCES todos (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_id, user_id)
);

CREATE INDEX IF NOT EXISTS todo_shares_user_idx ON todo_shares (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actor_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  todo_id    uuid REFERENCES todos (id) ON DELETE CASCADE,
  kind       text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_kind_check
    CHECK (kind IN ('coworker_added', 'todo_shared', 'todo_unshared'))
);

CREATE INDEX IF NOT EXISTS notifications_inbox_idx
  ON notifications (user_id, read, created_at DESC);
