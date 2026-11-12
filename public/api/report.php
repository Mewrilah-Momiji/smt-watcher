<?php
declare(strict_types=1);

require __DIR__ . '/../private/common.php';

// Takes one consented contribution. It stores no IP address, recipient, address or email content.
// A sender's domain is only stored readable after several independent reports. Before that, only a keyed hash exists.
const MIN_SOURCES_FOR_CLEAR_DOMAIN = 5;
const MAX_REPORTS_PER_HOUR = 30;
const SOURCE_RETENTION_DAYS = 30;
// The database columns for each entry of ASSESSMENT_LEVELS and VERDICTS in lists.php. A test checks that both match.
const LEVEL_COLUMNS = ['many-signs' => 'level_many', 'some-signs' => 'level_some', 'no-signs' => 'level_none'];
const VERDICT_COLUMNS = ['spam' => 'votes_spam', 'legit' => 'votes_legit', 'unsure' => 'votes_unsure'];

acceptRequest();
$input = readJson();
$authentication = $input['authentication'] ?? null;
$codes = $input['codes'] ?? null;
$linkDomains = $input['linkDomains'] ?? null;
$valid = is_array($input)
    && isDomain($input['senderDomain'] ?? null)
    // The page filters free mail too, but requests can skip the page.
    && !in_array($input['senderDomain'], FREEMAIL_DOMAINS, true)
    && isset(LEVEL_COLUMNS[$input['level'] ?? ''], VERDICT_COLUMNS[$input['verdict'] ?? ''])
    && is_bool($input['signedBySender'] ?? null)
    && is_bool($input['assessmentWrong'] ?? null)
    && is_array($authentication)
    && in_array($authentication['spf'] ?? null, AUTH_RESULTS, true)
    && in_array($authentication['dkim'] ?? null, AUTH_RESULTS, true)
    && in_array($authentication['dmarc'] ?? null, AUTH_RESULTS, true)
    && is_array($codes) && count($codes) <= 40
    && is_array($linkDomains) && count($linkDomains) <= MAX_LINK_DOMAINS;
foreach ($valid ? $codes : [] as $code) {
    $valid = $valid && is_string($code) && preg_match('/^[a-z-]{1,40}$/', $code) === 1;
}
foreach ($valid ? $linkDomains : [] as $domain) {
    $valid = $valid && isDomain($domain);
}
if (!$valid) {
    answer(400, 'invalid');
}

$secret = hashSecret();
$step = 'database-connect';
$hash = static fn (string $purpose, string $value): string => hash_hmac('sha256', $purpose . "\0" . $value, $secret);
$month = date('Y-m');
$domainHash = domainHash($secret, $input['senderDomain']);
// Many recipients of one campaign end up in one group, without any text of the email.
sort($linkDomains);
$fingerprint = $hash('group', $input['senderDomain'] . "\0" . implode(',', $linkDomains));
// The daily key tells sources apart for one day, and the address is not stored.
$source = sourceHash();

try {
    $step = 'database-tables';
    $db = openDatabase();
    $step = 'database-write';
    beginWriting($db);

    $today = date('Y-m-d');
    $db->prepare('DELETE FROM smtw_sources WHERE seen < ?')->execute([date('Y-m-d', strtotime('-' . SOURCE_RETENTION_DAYS . ' days'))]);
    $oldest = date('Y-m', strtotime('-3 years'));
    $db->prepare('DELETE FROM smtw_codes WHERE group_id IN (SELECT id FROM smtw_groups WHERE last_month < ?)')->execute([$oldest]);
    $db->prepare('DELETE FROM smtw_groups WHERE last_month < ?')->execute([$oldest]);
    if (!withinLimit($db, $source, MAX_REPORTS_PER_HOUR)) {
        $db->exec('COMMIT');
        answer(429, 'limit');
    }

    $db->prepare('INSERT OR IGNORE INTO smtw_groups (fingerprint, domain_hash, first_month, last_month) VALUES (?, ?, ?, ?)')->execute([$fingerprint, $domainHash, $month, $month]);
    $find = $db->prepare('SELECT id FROM smtw_groups WHERE fingerprint = ?');
    $find->execute([$fingerprint]);
    $group = (int) $find->fetchColumn();

    // One source counts once per group, so that repeating a report changes nothing.
    $first = $db->prepare('INSERT OR IGNORE INTO smtw_sources (group_id, source_hash, seen) VALUES (?, ?, ?)');
    $first->execute([$group, $source, $today]);
    if ($first->rowCount() === 0) {
        $db->exec('COMMIT');
        answer(200, 'counted');
    }

    $level = LEVEL_COLUMNS[$input['level']];
    $vote = VERDICT_COLUMNS[$input['verdict']];
    $db->prepare(
        "UPDATE smtw_groups SET last_month = ?, sources = sources + 1, signed_reports = signed_reports + ?,
         assessment_wrong = assessment_wrong + ?, $level = $level + 1, $vote = $vote + 1 WHERE id = ?",
    )->execute([$month, (int) $input['signedBySender'], (int) $input['assessmentWrong'], $group]);
    $addCode = $db->prepare('INSERT INTO smtw_codes (group_id, code, reports) VALUES (?, ?, 1) ON CONFLICT (group_id, code) DO UPDATE SET reports = reports + 1');
    foreach (array_unique($codes) as $code) {
        $addCode->execute([$group, $code]);
    }
    foreach ($authentication as $method => $result) {
        if (in_array($method, ['spf', 'dkim', 'dmarc'], true)) {
            $addCode->execute([$group, "auth-$method-$result"]);
        }
    }

    $total = $db->prepare('SELECT SUM(sources) FROM smtw_groups WHERE domain_hash = ?');
    $total->execute([$domainHash]);
    if ((int) $total->fetchColumn() >= MIN_SOURCES_FOR_CLEAR_DOMAIN) {
        $db->prepare('UPDATE smtw_groups SET domain = ? WHERE domain_hash = ? AND domain IS NULL')->execute([$input['senderDomain'], $domainHash]);
    }
    $db->exec('COMMIT');
} catch (Throwable) {
    // Only the failed step: a database message could contain the submitted values or access data.
    answer(503, $step);
}
answer(200, 'counted');
