CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY,
  title varchar(240) NOT NULL,
  category varchar(80) NOT NULL DEFAULT 'Général',
  description varchar(2000) NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('pending', 'published', 'completed', 'rejected')),
  viewer_token_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS viewer_token_hash varchar(64);

CREATE INDEX IF NOT EXISTS ideas_public_created_at_idx
  ON ideas (status, created_at DESC);
