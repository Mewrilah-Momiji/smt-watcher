<?php
declare(strict_types=1);

// Uploaded for one import only by scripts/seed/import-spam.mjs, which removes it again.
// It stores a keyed hash of each domain and a count, the same way as report.php, so that real reports join these groups.
const TOKEN_HASH = '%TOKEN_HASH%';

function answer(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !hash_equals(TOKEN_HASH, hash('sha256', $_SERVER['HTTP_X_IMPORT_TOKEN'] ?? ''))) {
    answer(404, ['result' => 'not-found']);
}

$secretFile = __DIR__ . '/../private/secret.php';
$secretText = is_file($secretFile) ? (string) file_get_contents($secretFile) : '';
if (preg_match('/^<\?php \/\/ ([0-9a-f]{64})$/', trim($secretText), $match) !== 1) {
    answer(503, ['result' => 'no-secret']);
}
$secret = $match[1];
$hash = static fn (string $purpose, string $value): string => hash_hmac('sha256', $purpose . "\0" . $value, $secret);

$groups = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($groups) || count($groups) > 1000) {
    answer(400, ['result' => 'invalid']);
}

try {
    $file = __DIR__ . '/../private/smtw.sqlite';
    $new = !is_file($file);
    $db = new PDO('sqlite:' . $file, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
    if ($new) {
        chmod($file, 0600);
    }
    $db->exec((string) file_get_contents(__DIR__ . '/../private/schema.sql'));
    $db->exec('BEGIN IMMEDIATE');
    $month = date('Y-m');
    // Setting the count instead of adding to it makes a repeated import harmless.
    $write = $db->prepare(
        'INSERT INTO smtw_groups (fingerprint, domain_hash, first_month, last_month, seed_spam) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (fingerprint) DO UPDATE SET seed_spam = excluded.seed_spam',
    );
    foreach ($groups as $group) {
        $domain = $group['senderDomain'] ?? null;
        $links = $group['linkDomains'] ?? null;
        $count = $group['count'] ?? null;
        if (!is_string($domain) || preg_match('/^[a-z0-9-]+(\.[a-z0-9-]+)+$/', $domain) !== 1 || !is_array($links) || !is_int($count) || $count < 1) {
            $db->exec('ROLLBACK');
            answer(400, ['result' => 'invalid']);
        }
        sort($links);
        $write->execute([$hash('group', $domain . "\0" . implode(',', $links)), $hash('domain', $domain), $month, $month, $count]);
    }
    $db->exec('COMMIT');
    $total = (int) $db->query('SELECT COUNT(*) FROM smtw_groups WHERE seed_spam > 0')->fetchColumn();
    $sum = (int) $db->query('SELECT COALESCE(SUM(seed_spam), 0) FROM smtw_groups')->fetchColumn();
    $clear = (int) $db->query('SELECT COUNT(*) FROM smtw_groups WHERE seed_spam > 0 AND domain IS NOT NULL')->fetchColumn();
    answer(200, ['result' => 'imported', 'groups' => $total, 'mails' => $sum, 'readable' => $clear]);
} catch (Throwable) {
    answer(503, ['result' => 'database']);
}
