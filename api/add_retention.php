<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'POST required.'], 405);
}

// Only signed-in Admins can create retention schedules.
$user = require_login();
require_role($user, ['Admin']);

$body = json_input();

$type = trim((string)($body['type'] ?? ''));
$years = filter_var(
    $body['years'] ?? null,
    FILTER_VALIDATE_INT
);
$adminPassword = $body['adminPassword'] ?? '';

if (
    $type === '' ||
    strlen($type) > 100 ||
    $years === false ||
    $years < 1
) {
    respond([
        'error' => 'Enter a valid record type and retention period.'
    ], 400);
}

if (!is_string($adminPassword) || $adminPassword === '') {
    respond(['error' => 'Admin password is required.'], 400);
}

// Verify the currently signed-in Admin's password.
$stmt = $pdo->prepare(
    'SELECT password_hash FROM users WHERE id = ? AND role = ?'
);
$stmt->execute([$user['id'], 'Admin']);
$admin = $stmt->fetch();

if (
    !$admin ||
    !password_verify($adminPassword, $admin['password_hash'])
) {
    respond(['error' => 'Incorrect Admin password.'], 403);
}

// Prevent duplicate record types.
$stmt = $pdo->prepare(
    'SELECT type FROM retention_schedule WHERE LOWER(type) = LOWER(?)'
);
$stmt->execute([$type]);

if ($stmt->fetch()) {
    respond(['error' => 'This record type already exists.'], 409);
}

// Save the retention schedule.
try {
    $stmt = $pdo->prepare(
        'INSERT INTO retention_schedule (type, years) VALUES (?, ?)'
    );
    $stmt->execute([$type, $years]);
} catch (PDOException $e) {
    respond(['error' => 'Unable to save retention schedule.'], 500);
}

respond([
    'type' => $type,
    'years' => $years,
    'message' => 'Retention schedule added successfully.'
], 201);
