<?php
declare(strict_types=1);

// Shared by the scripts in api/. This folder is closed to the web.
// lists.php is written by the build from src/core/sharedLists.ts.
require __DIR__ . '/lists.php';

const MAX_BODY_BYTES = 4096;

function answer(int $status, string $result): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['result' => $result]);
    exit;
}

function isDomain(mixed $value): bool
{
    return is_string($value) && strlen($value) <= 253 && preg_match(DOMAIN_PATTERN, $value) === 1;
}

/** Created on first use, so that it never has to pass through a local file or the repository. */
function hashSecret(): string
{
    $file = __DIR__ . '/secret.php';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        answer(503, 'key-file');
    }
    $secret = trim((string) stream_get_contents($handle));
    if (preg_match('/^<\?php \/\/ ([0-9a-f]{64})$/', $secret, $match) === 1) {
        $secret = $match[1];
    } else {
        $secret = bin2hex(random_bytes(32));
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, '<?php // ' . $secret);
        chmod($file, 0600);
    }
    flock($handle, LOCK_UN);
    fclose($handle);
    return $secret;
}

/** A random key for one day that is then overwritten, so that nobody can link older source hashes to an address. */
function dayKey(): string
{
    $file = __DIR__ . '/day-key.php';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        answer(503, 'key-file');
    }
    $today = date('Y-m-d');
    $stored = (string) stream_get_contents($handle);
    if (preg_match('/^<\?php \/\/ ' . $today . ' ([0-9a-f]{64})$/', $stored, $match) === 1) {
        $key = $match[1];
    } else {
        $key = bin2hex(random_bytes(32));
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, '<?php // ' . $today . ' ' . $key);
        chmod($file, 0600);
    }
    flock($handle, LOCK_UN);
    fclose($handle);
    return $key;
}

function domainHash(string $secret, string $domain): string
{
    return hash_hmac('sha256', "domain\0" . $domain, $secret);
}

function sourceHash(): string
{
    return hash_hmac('sha256', sourceNetwork($_SERVER['REMOTE_ADDR'] ?? ''), dayKey());
}

/** One IPv6 connection usually holds a whole /64 network, so only that part tells sources apart. */
function sourceNetwork(string $address): string
{
    if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
        return $address;
    }
    $mapped = inet_pton($address);
    if ($mapped === false) {
        return $address;
    }
    // An IPv4 address written in IPv6 form (::ffff:a.b.c.d) stays one address.
    if (str_starts_with($mapped, str_repeat("\0", 10) . "\xff\xff")) {
        return inet_ntop(substr($mapped, 12)) ?: $address;
    }
    return bin2hex(substr($mapped, 0, 8)) . '::/64';
}

/** Accepts only a JSON POST from this page, and stops if the database is switched off. */
function acceptRequest(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    // The Thunderbird extension sends this form of origin, or none. Other websites can do neither.
    $fromExtension = str_starts_with($origin, 'moz-extension://');
    if ($fromExtension) {
        header('Access-Control-Allow-Origin: ' . preg_replace('/[^a-z0-9:\/.-]/i', '', $origin));
    }
    if ($fromExtension && ($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        header('Access-Control-Allow-Methods: POST');
        header('Access-Control-Allow-Headers: Content-Type');
        http_response_code(204);
        exit;
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        answer(405, 'method');
    }
    $host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    $fromPage = parse_url($origin, PHP_URL_HOST) === $host || $fromExtension || $origin === '';
    if (!$fromPage || !str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        answer(403, 'origin');
    }
    $configFile = __DIR__ . '/config.php';
    $config = is_file($configFile) ? require $configFile : null;
    if (!is_array($config) || ($config['enabled'] ?? false) !== true) {
        answer(503, 'unavailable');
    }
}

function readJson(): mixed
{
    $body = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    return is_string($body) && strlen($body) <= MAX_BODY_BYTES ? json_decode($body, true) : null;
}

/** The database is one SQLite file in this closed folder. Only the server's PHP reads and writes it. */
const DATABASE_FILE = __DIR__ . '/smtw.sqlite';

function openDatabase(): PDO
{
    $new = !is_file(DATABASE_FILE);
    // Waits up to 5 seconds for another request that is writing, instead of failing at once.
    $db = new PDO('sqlite:' . DATABASE_FILE, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
    if ($new) {
        chmod(DATABASE_FILE, 0600);
    }
    if ($db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'smtw_rate'")->fetchColumn() === false) {
        $db->exec((string) file_get_contents(__DIR__ . '/schema.sql'));
    }
    return $db;
}

/** Takes the write lock right away, so that two reports at the same moment wait in turn instead of failing. */
function beginWriting(PDO $db): void
{
    $db->exec('BEGIN IMMEDIATE');
}

/** Counts one request of this source. Returns false above the limit for this hour. */
function withinLimit(PDO $db, string $source, int $limit): bool
{
    $hour = date('Y-m-d H:00:00');
    $db->prepare('DELETE FROM smtw_rate WHERE hour_start < ?')->execute([date('Y-m-d H:00:00', time() - 2 * 3600)]);
    $db->prepare('INSERT INTO smtw_rate (source_hash, hour_start, reports) VALUES (?, ?, 1) ON CONFLICT (source_hash, hour_start) DO UPDATE SET reports = reports + 1')->execute([$source, $hour]);
    $count = $db->prepare('SELECT reports FROM smtw_rate WHERE source_hash = ? AND hour_start = ?');
    $count->execute([$source, $hour]);
    return (int) $count->fetchColumn() <= $limit;
}
