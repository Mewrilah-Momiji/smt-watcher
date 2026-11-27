<?php
declare(strict_types=1);

// Sends the contact form to the operator. It stores nothing except counts for the current hour against mass mailing,
// in total and per source, where a source is a hash of the address with the random day key.
// The operator's address is a setting: npm run deploy writes it from .env.local to private/contact.php.
// private/ sits next to this file, or outside the web root where private-dir.php names it.
define('PRIVATE_DIR', is_file(__DIR__ . '/private-dir.php') ? require __DIR__ . '/private-dir.php' : __DIR__ . '/private');
define('ADDRESS_FILE', PRIVATE_DIR . '/contact.php');
require PRIVATE_DIR . '/common.php';
const MAX_MESSAGES_PER_HOUR = 20;
// One sender cannot use up the hour for everyone else.
const MAX_MESSAGES_PER_SOURCE_PER_HOUR = 5;
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

function configuredAddress(string $key): ?string
{
    static $config = null;
    $config ??= is_file(ADDRESS_FILE) ? require ADDRESS_FILE : [];
    $address = is_array($config) ? ($config[$key] ?? null) : null;
    return is_string($address) && filter_var($address, FILTER_VALIDATE_EMAIL) !== false ? $address : null;
}

function operatorAddress(): ?string
{
    return configuredAddress('email');
}

// The sender, e.g. noreply@ of the site's own domain, so that the mail matches the domain's SPF and DKIM.
// Without it, the operator's address sends. Replies go to the writer through Reply-To.
function senderAddress(string $operator): string
{
    return configuredAddress('mail_from') ?? $operator;
}

function withinHourlyLimit(): bool
{
    return contactWithinLimit(sourceHash(), MAX_MESSAGES_PER_HOUR, MAX_MESSAGES_PER_SOURCE_PER_HOUR);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

// Only the imprint of this site may send the form, not a page elsewhere that makes its visitors send it.
// The browser sets Sec-Fetch-Site itself. Origin is often "null" here because of the no-referrer policy, so only a named foreign origin counts.
$fetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = $origin === '' || $origin === 'null' ? null : parse_url($origin, PHP_URL_HOST);
$host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
if (($fetchSite !== '' && $fetchSite !== 'same-origin') || ($originHost !== null && $originHost !== $host)) {
    finish('failed');
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
$sender = senderAddress($operator);
$headers = [
    'From' => 'SMT Watcher <' . $sender . '>',
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
$body = 'Name: ' . ($name === '' ? '-' : $name) . "\nE-Mail: " . $email . "\nTime to fill in: " . (int) $seconds . " s\n" . $details . "\n" . $message . "\n";
$sent = mail($operator, $subject, chunk_split(base64_encode($body)), $headers, '-f' . $sender);
finish($sent ? 'sent' : 'failed');
