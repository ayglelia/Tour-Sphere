<?php

require_once __DIR__ . '/db.php';

if (empty($_SESSION['user'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Not signed in.'
    ]);
    exit;
}


header('Content-Type: application/json');


$body = json_decode(file_get_contents('php://input'), true);

$type = trim($body['type'] ?? '');
$years = (int)($body['years'] ?? 0);
$password = $body['adminPassword'] ?? '';

if ($type === '' || $years < 1 || $password === '') {

    http_response_code(400);

    echo json_encode([
        'error' => 'Record type, retention period, and Admin password are required.'
    ]);

    exit;
}

/*
 * Find the Admin account.
 */
$stmt = $pdo->prepare("
    SELECT id, email, password_hash, role
    FROM users
    WHERE id = ? AND role = 'Admin'
    LIMIT 1
");

$stmt->execute([$_SESSION['user']['id']]);

$admin = $stmt->fetch();

if (!$admin) {

    http_response_code(500);

    echo json_encode([
        'error' => 'Admin account not found.'
    ]);

    exit;
}

/*
 * Verify the supplied password against
 * the stored Admin password hash.
 */
if (!password_verify($password, $admin['password_hash'])) {

    http_response_code(403);

    echo json_encode([
        'error' => 'Incorrect Admin password.'
    ]);

    exit;
}

/*
 * Update only the requested retention schedule.
 */
$stmt = $pdo->prepare("
    UPDATE retention_schedule
    SET years = ?
    WHERE type = ?
");

$stmt->execute([
    $years,
    $type
]);

$check = $pdo->prepare("
    SELECT *
    FROM retention_schedule
    WHERE type = ?
");

$check->execute([$type]);

$updated = $check->fetch();

if (!$updated) {

    http_response_code(404);

    echo json_encode([
        'error' => 'Retention schedule record not found.'
    ]);

    exit;
}

echo json_encode($updated);