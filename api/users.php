<?php
require __DIR__ . '/db.php';

$user = require_login();
require_role($user, ['Admin']);

$VALID_ROLES = [
    'Admin',
    'Front Desk / Operations',
    'Facilities & Compliance Officer',
    'Legal & Contracts Officer',
    'Records & Audit Officer',
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


if ($method === 'POST' && ($_GET['action'] ?? '') === 'reset_password') {
    $body = json_input();

    $targetId = filter_var(
        $body['userId'] ?? null,
        FILTER_VALIDATE_INT
    );

    $adminPassword = $body['adminPassword'] ?? '';

    if (!$targetId || $targetId < 1 || $adminPassword === '') {
        respond(['error' => 'Staff account and Admin password are required.'], 400);
    }

    if ((int)$targetId === (int)$user['id']) {
        respond(['error' => 'Use Change Password for your own account.'], 403);
    }

    // Verify the currently signed-in Admin's password.
    $stmt = $pdo->prepare(
        'SELECT password_hash FROM users WHERE id = ? AND role = ?'
    );
    $stmt->execute([$user['id'], 'Admin']);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($adminPassword, $admin['password_hash'])) {
        respond(['error' => 'Incorrect Admin password.'], 403);
    }

    // Find the staff account.
    $stmt = $pdo->prepare(
        'SELECT id, full_name, role FROM users WHERE id = ?'
    );
    $stmt->execute([$targetId]);
    $target = $stmt->fetch();

    if (!$target) {
        respond(['error' => 'Staff account not found.'], 404);
    }

    if ($target['role'] === 'Admin') {
        respond(['error' => 'This reset option is for non-Admin staff accounts only.'], 403);
    }

    // Generate a secure temporary password.
    $temporaryPassword = bin2hex(random_bytes(12));
    $passwordHash = password_hash($temporaryPassword, PASSWORD_DEFAULT);

    
$stmt = $pdo->prepare(
    'UPDATE users
     SET password_hash = ?, must_change_password = 1
     WHERE id = ?'
);
$stmt->execute([$passwordHash, $targetId]);


    header('Cache-Control: no-store');

    respond([
        'ok' => true,
        'message' => 'Staff password reset successfully.',
        'fullName' => $target['full_name'],
        'temporaryPassword' => $temporaryPassword
    ]);
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
    
if (strlen($password) < 12) {
    respond(['error' => 'Password must be at least 12 characters.'], 400);
}

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'That email address doesn\'t look valid.'], 400);
    }

    $existing = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $existing->execute([$email]);
    if ($existing->fetch()) {
        respond(['error' => 'A staff account with that email already exists.'], 409);
    }

    
$stmt = $pdo->prepare(
    'INSERT INTO users
     (full_name, email, password_hash, role, must_change_password)
     VALUES (?, ?, ?, ?, 1)'
);

$stmt->execute([
    $fullName,
    $email,
    password_hash($password, PASSWORD_DEFAULT),
    $role
]);


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