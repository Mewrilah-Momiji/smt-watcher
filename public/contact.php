<?php
declare(strict_types=1);

// Sends the contact form to the operator. It stores nothing except a count per hour against mass mailing.
// The operator's address is a setting: npm run deploy writes it from .env.local to private/contact.php.
const ADDRESS_FILE = __DIR__ . '/private/contact.php';
const MAX_MESSAGES_PER_HOUR = 20;
const MAX_MESSAGE_LENGTH = 5000;
const MIN_SECONDS_TO_FILL = 3;

function finish(string $status): never
{
    header('Location: imprint.html?contact=' . $status . '#contact', true, 303);
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function operatorAddress(): ?string
{
    $config = is_file(ADDRESS_FILE) ? require ADDRESS_FILE : null;
    $address = is_array($config) ? ($config['email'] ?? null) : null;
    return is_string($address) && filter_var($address, FILTER_VALIDATE_EMAIL) !== false ? $address : null;
}

function withinHourlyLimit(): bool
{
    $file = sys_get_temp_dir() . '/smtw-contact-' . date('YmdH');
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        return false;
    }
    $count = (int) stream_get_contents($handle);
    if ($count < MAX_MESSAGES_PER_HOUR) {
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, (string) ($count + 1));
    }
    flock($handle, LOCK_UN);
    fclose($handle);
    return $count < MAX_MESSAGES_PER_HOUR;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

// Bots fill the hidden field or send at once. They get the normal answer, so that they learn nothing.
// The page measures how long the form was open; without a number the form was not sent from the page.
$seconds = field('seconds');
if (field('website') !== '' || preg_match('/^\d{1,9}$/', $seconds) !== 1 || (int) $seconds < MIN_SECONDS_TO_FILL) {
    finish('sent');
}

$name = preg_replace('/[\x00-\x1F\x7F]/u', ' ', field('name')) ?? '';
$email = field('email');
$message = field('message');
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || $message === '' || mb_strlen($message) > MAX_MESSAGE_LENGTH || mb_strlen($name) > 200) {
    finish('invalid');
}
if (!withinHourlyLimit()) {
    finish('busy');
}
$operator = operatorAddress();
if ($operator === null) {
    finish('failed');
}

// The address was validated, which rules out line breaks in the header.
$headers = [
    'From' => 'SMT Watcher <' . $operator . '>',
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64',
];
// A translation error names the language and page, which the form takes from the page. Both are checked, as anyone can send them.
$subject = 'SMT Watcher contact form';
$details = '';
if (field('topic') === 'translation') {
    $lang = preg_match('/^[a-z]{2}$/', field('lang')) === 1 ? field('lang') : '?';
    $page = preg_match('/^[\w-]+\.html$/', field('page')) === 1 ? field('page') : '?';
    $subject = 'SMT Watcher translation error (' . $lang . ')';
    $details = 'Language: ' . $lang . "\nPage: " . $page . "\n";
}
$body = 'Name: ' . ($name === '' ? '-' : $name) . "\nE-Mail: " . $email . "\n" . $details . "\n" . $message . "\n";
$sent = mail($operator, $subject, chunk_split(base64_encode($body)), $headers, '-f' . $operator);
finish($sent ? 'sent' : 'failed');
