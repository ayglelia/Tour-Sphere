<?php

header('Content-Type: application/json; charset=utf-8');

session_start();

$config = [
    'db_host' => getenv('DB_HOST'),
    'db_port' => getenv('DB_PORT') ?: 3306,
    'db_name' => getenv('DB_DATABASE'),
    'db_user' => getenv('DB_USERNAME'),
    'db_pass' => getenv('DB_PASSWORD') !== false
    ? getenv('DB_PASSWORD')
    : (getenv('DB_ALLOW_EMPTY_PASSWORD') === '1' ? '' : false),
];

if (
    !$config['db_host'] ||
    !$config['db_name'] ||
    !$config['db_user'] ||
    $config['db_pass'] === false
) {
    http_response_code(500);
    die(json_encode([
        'error' => 'Database environment variables are missing.'
    ]));
}


try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};port=" . ($config['db_port'] ?? 3306) . ";dbname={$config['db_name']};charset=utf8mb4",
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


if (!empty($_SESSION['user']['id'])) {
    $check = $pdo->prepare(
        'SELECT must_change_password FROM users WHERE id = ?'
    );
    $check->execute([$_SESSION['user']['id']]);
    $account = $check->fetch();

    if (!$account) {
        $_SESSION = [];
        session_destroy();
        http_response_code(401);
        die(json_encode(['error' => 'Account no longer exists.']));
    }

    $_SESSION['user']['mustChangePassword'] =
        (bool)$account['must_change_password'];

    if (
        $_SESSION['user']['mustChangePassword'] &&
        basename($_SERVER['SCRIPT_NAME'] ?? '') !== 'auth.php'
    ) {
        http_response_code(403);
        die(json_encode([
            'error' => 'You must change your temporary password before accessing TourSphere.',
            'mustChangePassword' => true
        ]));
    }
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

function is_absolute_storage_path($path): bool {
    if (!is_string($path) || $path === '') {
        return false;
    }

    return str_starts_with($path, '/') ||
        (
            strlen($path) >= 3 &&
            ctype_alpha($path[0]) &&
            $path[1] === ':' &&
            ($path[2] === '\\' || $path[2] === '/')
        );
}