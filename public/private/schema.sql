CREATE TABLE IF NOT EXISTS smtw_groups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fingerprint CHAR(64) NOT NULL UNIQUE,
  domain_hash CHAR(64) NOT NULL,
  domain VARCHAR(253) NULL,
  first_month CHAR(7) NOT NULL,
  last_month CHAR(7) NOT NULL,
  sources INT UNSIGNED NOT NULL DEFAULT 0,
  signed_reports INT UNSIGNED NOT NULL DEFAULT 0,
  level_many INT UNSIGNED NOT NULL DEFAULT 0,
  level_some INT UNSIGNED NOT NULL DEFAULT 0,
  level_none INT UNSIGNED NOT NULL DEFAULT 0,
  votes_spam INT UNSIGNED NOT NULL DEFAULT 0,
  votes_legit INT UNSIGNED NOT NULL DEFAULT 0,
  votes_unsure INT UNSIGNED NOT NULL DEFAULT 0,
  assessment_wrong INT UNSIGNED NOT NULL DEFAULT 0,
  seed_spam INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX (domain_hash)
);
CREATE TABLE IF NOT EXISTS smtw_codes (
  group_id INT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  reports INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, code)
);
CREATE TABLE IF NOT EXISTS smtw_sources (
  group_id INT UNSIGNED NOT NULL,
  source_hash CHAR(64) NOT NULL,
  seen DATE NOT NULL,
  PRIMARY KEY (group_id, source_hash),
  INDEX (seen)
);
CREATE TABLE IF NOT EXISTS smtw_rate (
  source_hash CHAR(64) NOT NULL,
  hour_start DATETIME NOT NULL,
  reports INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (source_hash, hour_start)
);
CREATE OR REPLACE VIEW smtw_group_trust AS
SELECT
  id, domain, sources, votes_spam, votes_legit, votes_unsure, assessment_wrong, seed_spam,
  CASE
    WHEN votes_spam + votes_legit < 5 THEN 'too-few'
    WHEN votes_spam >= 0.8 * (votes_spam + votes_legit) THEN 'likely-spam'
    WHEN votes_legit >= 0.8 * (votes_spam + votes_legit) THEN 'likely-legitimate'
    ELSE 'disputed'
  END AS verdict
FROM smtw_groups;
