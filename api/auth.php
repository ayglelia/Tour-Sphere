<?php
require __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_input();
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if ($email === '' || $password === '') {
        respond(['error' => 'Email and password are required.'], 400);
    }

    $stmt = $pdo->prepare('
SELECT id, full_name, email, password_hash, role, must_change_password FROM users WHERE email = ?
');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(['error' => 'Invalid email or password.'], 401);
    }

    
$_SESSION['user'] = [
    'id'                 => $user['id'],
    'fullName'           => $user['full_name'],
    'email'              => $user['email'],
    'role'               => $user['role'],
    'mustChangePassword' => (bool)$user['must_change_password'],
];


    respond(['user' => $_SESSION['user']]);
}


if ($action === 'change_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    $user = require_login();
    $body = json_input();

    $currentPassword = $body['currentPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';
    $confirmPassword = $body['confirmPassword'] ?? '';

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        respond(['error' => 'All password fields are required.'], 400);
    }

    if (strlen($newPassword) < 12) {
        respond(['error' => 'New password must be at least 12 characters.'], 400);
    }

    if ($newPassword !== $confirmPassword) {
        respond(['error' => 'New passwords do not match.'], 400);
    }

    $stmt = $pdo->prepare(
        'SELECT password_hash FROM users WHERE id = ?'
    );
    $stmt->execute([$user['id']]);
    $account = $stmt->fetch();

    if (!$account || !password_verify($currentPassword, $account['password_hash'])) {
        respond(['error' => 'Current password is incorrect.'], 403);
    }

    if (password_verify($newPassword, $account['password_hash'])) {
        respond(['error' => 'New password must be different from your current password.'], 400);
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

    
$stmt = $pdo->prepare(
    'UPDATE users
     SET password_hash = ?, must_change_password = 0
     WHERE id = ?'
);
$stmt->execute([$newHash, $user['id']]);

$_SESSION['user']['mustChangePassword'] = false;

session_regenerate_id(true);


    respond([
        'ok' => true,
        'message' => 'Password changed successfully.'
    ]);
}


if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $_SESSION = [];
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'me' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user'])) {
        respond(['user' => null]);
    }
    respond(['user' => $_SESSION['user']]);
}

respond(['error' => 'Unknown auth action.'], 404);