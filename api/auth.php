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

    $stmt = $pdo->prepare('SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(['error' => 'Invalid email or password.'], 401);
    }

    $_SESSION['user'] = [
        'id'       => $user['id'],
        'fullName' => $user['full_name'],
        'email'    => $user['email'],
        'role'     => $user['role'],
    ];

    respond(['user' => $_SESSION['user']]);
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