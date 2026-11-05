<?php
declare(strict_types=1);

require __DIR__ . '/../private/common.php';

// Answers for a single domain with a rough category. It stores nothing about the request except a count per
// hour against someone testing many domains, and it offers no way to list entries or to see numbers.
const MAX_LOOKUPS_PER_HOUR = 60;
const MIN_VOTES = 5;
const AGREEMENT = 0.8;

$config = acceptRequest();
$domain = readJson()['senderDomain'] ?? null;
if (!isDomain($domain)) {
    answer(400, 'invalid');
}
$hash = domainHash(hashSecret(), $domain);
$source = sourceHash();

$step = 'database-connect';
try {
    $db = openDatabase($config);
    $step = 'database-read';
    if (!withinLimit($db, $source, MAX_LOOKUPS_PER_HOUR)) {
        answer(429, 'limit');
    }
    $query = $db->prepare('SELECT COALESCE(SUM(votes_spam), 0), COALESCE(SUM(votes_legit), 0), COALESCE(SUM(seed_spam), 0) FROM smtw_groups WHERE domain_hash = ?');
    $query->execute([$hash]);
    [$spam, $legit, $seed] = array_map('intval', $query->fetch(PDO::FETCH_NUM));
} catch (Throwable) {
    answer(503, $step);
}

$votes = $spam + $legit;
if ($votes >= MIN_VOTES) {
    if ($spam >= AGREEMENT * $votes) {
        answer(200, 'reported-spam');
    }
    answer(200, $legit >= AGREEMENT * $votes ? 'reported-legit' : 'disputed');
}
answer(200, $seed > 0 ? 'seen-spam' : 'none');
