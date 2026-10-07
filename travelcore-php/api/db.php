<?php

header('Content-Type: application/json; charset=utf-8');

session_start();

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    die(json_encode([
        'error' => 'Missing api/config.php. Copy api/config.example.php to ' .
                   'api/config.php and fill in your database credentials.'
    ]));
}
$config = require $configPath;

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function require_login(): array {
    if (empty($_SESSION['user'])) {
        respond(['error' => 'Not signed in.'], 401);
    }
    return $_SESSION['user'];
}

function require_role(array $user, array $allowed): void {
    if (!in_array($user['role'], $allowed, true)) {
        respond(['error' => 'Your role (' . $user['role'] . ') is not permitted to do this.'], 403);
    }
}