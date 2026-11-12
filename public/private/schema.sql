CREATE TABLE IF NOT EXISTS smtw_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  domain_hash TEXT NOT NULL,
  domain TEXT NULL,
  first_month TEXT NOT NULL,
  last_month TEXT NOT NULL,
  sources INTEGER NOT NULL DEFAULT 0,
  signed_reports INTEGER NOT NULL DEFAULT 0,
  level_many INTEGER NOT NULL DEFAULT 0,
  level_some INTEGER NOT NULL DEFAULT 0,
  level_none INTEGER NOT NULL DEFAULT 0,
  votes_spam INTEGER NOT NULL DEFAULT 0,
  votes_legit INTEGER NOT NULL DEFAULT 0,
  votes_unsure INTEGER NOT NULL DEFAULT 0,
  assessment_wrong INTEGER NOT NULL DEFAULT 0,
  seed_spam INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS smtw_groups_domain_hash ON smtw_groups (domain_hash);
CREATE TABLE IF NOT EXISTS smtw_codes (
  group_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  reports INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, code)
);
CREATE TABLE IF NOT EXISTS smtw_sources (
  group_id INTEGER NOT NULL,
  source_hash TEXT NOT NULL,
  seen TEXT NOT NULL,
  PRIMARY KEY (group_id, source_hash)
);
CREATE INDEX IF NOT EXISTS smtw_sources_seen ON smtw_sources (seen);
CREATE TABLE IF NOT EXISTS smtw_rate (
  source_hash TEXT NOT NULL,
  hour_start TEXT NOT NULL,
  reports INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source_hash, hour_start)
);
CREATE VIEW IF NOT EXISTS smtw_group_trust AS
SELECT
  id, domain, sources, votes_spam, votes_legit, votes_unsure, assessment_wrong, seed_spam,
  CASE
    WHEN votes_spam + votes_legit < 5 THEN 'too-few'
    WHEN votes_spam >= 0.8 * (votes_spam + votes_legit) THEN 'likely-spam'
    WHEN votes_legit >= 0.8 * (votes_spam + votes_legit) THEN 'likely-legitimate'
    ELSE 'disputed'
  END AS verdict
FROM smtw_groups;
