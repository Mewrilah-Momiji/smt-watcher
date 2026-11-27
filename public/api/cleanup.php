<?php
declare(strict_types=1);

// private/ sits next to api/, or outside the web root where private-dir.php names it (written by scripts/deploy.mjs).
require (is_file(__DIR__ . '/../private-dir.php') ? require __DIR__ . '/../private-dir.php' : __DIR__ . '/../private') . '/common.php';

// Called every hour by a cron job of the host, so that hashes of addresses and the day key are gone in time even when
// nobody uses the page. It only deletes what is past its time and takes no input, so anyone may call it; a call within
// ten minutes of the last one does nothing.
const MIN_SECONDS_BETWEEN_RUNS = 600;

header('Cache-Control: no-store');
$lastRun = dirname(DATABASE_FILE) . '/last-cleanup';
if (is_file($lastRun) && filemtime($lastRun) > time() - MIN_SECONDS_BETWEEN_RUNS) {
    answer(200, 'skipped');
}
touch($lastRun);

discardOldDayKey();
clearOldContactCounts();
// Without a database there is nothing more to delete, and this must not create one.
if (!is_file(DATABASE_FILE)) {
    answer(200, 'cleaned');
}
$step = 'database-connect';
try {
    $db = openDatabase();
    $step = 'database-write';
    beginWriting($db);
    cleanUp($db);
    $db->exec('COMMIT');
} catch (Throwable) {
    answer(503, $step);
}
answer(200, 'cleaned');
