<?php
declare(strict_types=1);

// Uploaded for one read only by scripts/seed/export-db.mjs, which removes it again.
// It reads counts per group and nothing that identifies a reporter: source hashes and rate limits stay on the server.
const TOKEN_HASH = '%TOKEN_HASH%';

function answer(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !hash_equals(TOKEN_HASH, hash('sha256', $_SERVER['HTTP_X_EXPORT_TOKEN'] ?? ''))) {
    answer(404, ['result' => 'not-found']);
}

try {
    $file = __DIR__ . '/../private/smtw.sqlite';
    if (!is_file($file)) {
        answer(503, ['result' => 'no-database']);
    }
    $db = new PDO('sqlite:' . $file, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
    $groups = $db->query(
        'SELECT g.id, g.domain, g.first_month, g.last_month, g.sources, g.signed_reports, g.level_many, g.level_some,
                g.level_none, g.votes_spam, g.votes_legit, g.votes_unsure, g.assessment_wrong, g.seed_spam, t.verdict
         FROM smtw_groups g JOIN smtw_group_trust t ON t.id = g.id ORDER BY g.id',
    )->fetchAll(PDO::FETCH_ASSOC);
    $codes = [];
    foreach ($db->query('SELECT group_id, code, reports FROM smtw_codes') as $row) {
        $codes[(int) $row['group_id']][$row['code']] = (int) $row['reports'];
    }
    foreach ($groups as &$group) {
        foreach ($group as $key => $value) {
            if (is_string($value) && ctype_digit($value)) $group[$key] = (int) $value;
        }
        $group['codes'] = $codes[$group['id']] ?? (object) [];
    }
    unset($group);
    $lastReport = $db->query('SELECT MAX(seen) FROM smtw_sources')->fetchColumn();
    answer(200, ['result' => 'exported', 'exported' => date('c'), 'lastReport' => $lastReport ?: null, 'groups' => $groups]);
} catch (Throwable) {
    answer(503, ['result' => 'database']);
}
