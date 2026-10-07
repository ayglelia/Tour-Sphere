<?php
require __DIR__ . '/db.php';

$user = require_login();
require_role($user, ['Admin']);

$VALID_ROLES = [
    'Admin', 'Facilities Specialist', 'Front Desk / Security', 'Legal Counsel',
    'Compliance Manager', 'Contract Administrator', 'General Staff',
    'Records Officer', 'Approver (Director/VP)', 'External Auditor',
];
$method = $_SERVER['REQUEST_METHOD'];

function currentAdminCount(PDO $pdo): int {
    return (int) $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'Admin'")->fetch()['c'];
}
function fetchUser(PDO $pdo, $id): ?array {
    $stmt = $pdo->prepare('SELECT id, full_name AS fullName, email, role, created_at AS createdAt FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, full_name AS fullName, email, role, created_at AS createdAt FROM users ORDER BY created_at ASC');
    respond($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = json_input();
    $fullName = trim($body['fullName'] ?? '');
    $email    = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $role     = $body['role'] ?? '';

    if ($fullName === '' || $email === '' || $password === '' || !in_array($role, $VALID_ROLES, true)) {
        respond(['error' => 'Full name, email, password, and a valid role are all required.'], 400);
    }
    if (strlen($password) < 8) {
        respond(['error' => 'Password must be at least 8 characters.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'That email address doesn\'t look valid.'], 400);
    }

    $existing = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $existing->execute([$email]);
    if ($existing->fetch()) {
        respond(['error' => 'A staff account with that email already exists.'], 409);
    }

    $stmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    $stmt->execute([$fullName, $email, password_hash($password, PASSWORD_DEFAULT), $role]);

    respond(fetchUser($pdo, $pdo->lastInsertId()), 201);
}

if ($method === 'PUT') {
    $idValue = $_GET['id'] ?? null;
    if ($idValue === null) respond(['error' => 'Missing ?id=…'], 400);

    if ((int)$idValue === (int)$user['id']) {
        respond(['error' => "You can't change your own role while signed in as that account — ask another Admin."], 403);
    }

    $body = json_input();
    $role = $body['role'] ?? '';
    if (!in_array($role, $VALID_ROLES, true)) respond(['error' => 'Invalid role.'], 400);

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $target->execute([$idValue]);
    $targetRow = $target->fetch();
    if (!$targetRow) respond(['error' => 'Staff account not found.'], 404);

    if ($targetRow['role'] === 'Admin' && $role !== 'Admin' && currentAdminCount($pdo) <= 1) {
        respond(['error' => 'Cannot change role — this is the only remaining Admin account.'], 409);
    }

    $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $idValue]);
    respond(fetchUser($pdo, $idValue));
}

if ($method === 'DELETE') {
    $idValue = $_GET['id'] ?? null;
    if ($idValue === null) respond(['error' => 'Missing ?id=…'], 400);

    if ((int)$idValue === (int)$user['id']) {
        respond(['error' => "You can't delete your own account while signed in as it — ask another Admin."], 403);
    }

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $target->execute([$idValue]);
    $targetRow = $target->fetch();
    if (!$targetRow) respond(['error' => 'Staff account not found.'], 404);

    if ($targetRow['role'] === 'Admin' && currentAdminCount($pdo) <= 1) {
        respond(['error' => 'Cannot delete — this is the only remaining Admin account.'], 409);
    }

    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$idValue]);
    respond(['ok' => true]);
}

respond(['error' => 'Unsupported method.'], 405);