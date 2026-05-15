alter table documents
  add column if not exists sdi_status text,
  add column if not exists sdi_id text,
  add column if not exists sdi_sent_at timestamptz;
