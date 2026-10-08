<?php

require_once __DIR__ . '/db.php';

$user = $_SESSION['user'] ?? null;

if (!$user) {
    http_response_code(401);
    exit('Not authenticated.');
}

$allowedRoles = [
    'Admin',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
];

if (!in_array($user['role'] ?? '', $allowedRoles, true)) {
    http_response_code(403);
    exit('You do not have permission to access this file.');
}

$id = (int)($_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    exit('Invalid correspondence ID.');
}

$stmt = $pdo->prepare(
    'SELECT file_name, file_path, file_type
     FROM correspondence
     WHERE id = ?
     LIMIT 1'
);

$stmt->execute([$id]);

$file = $stmt->fetch();

if (!$file) {
    http_response_code(404);
    exit('Correspondence file not found.');
}

if (empty($file['file_path'])) {
    http_response_code(404);
    exit('No attachment is associated with this correspondence.');
}


$storageDir = getenv('CORRESPONDENCE_STORAGE_DIR');

if (!$storageDir || !str_starts_with($storageDir, '/')) {
    http_response_code(500);
    exit('Private correspondence storage is not configured.');
}

$baseDir = realpath($storageDir);

if (!$baseDir) {
    http_response_code(404);
    exit('Correspondence storage directory not found.');
}

$storedName = (string)$file['file_path'];

if (
    $storedName !== basename($storedName) ||
    !preg_match('/^CO_[0-9]+_[0-9]{8}_[0-9]{6}_[a-f0-9]{8}\.(pdf|doc|docx|jpg|jpeg|png)$/', $storedName)
) {
    http_response_code(403);
    exit('Invalid stored filename.');
}

$filePath = realpath(
    $baseDir . DIRECTORY_SEPARATOR . $storedName
);


if (
    !$baseDir ||
    !$filePath ||
    !str_starts_with(
        $filePath,
        $baseDir . DIRECTORY_SEPARATOR
    )
) {
    http_response_code(403);
    exit('Invalid file path.');
}

if (!is_file($filePath)) {
    http_response_code(404);
    exit('File does not exist.');
}

$mimeType =
    $file['file_type'] ??
    'application/octet-stream';

$inlineTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
];

$disposition =
    in_array($mimeType, $inlineTypes, true)
        ? 'inline'
        : 'attachment';

header('Content-Type: ' . $mimeType);

header(
    'Content-Disposition: ' .
    $disposition .
    '; filename="' .
    basename($file['file_name']) .
    '"'
);

header('Content-Length: ' . filesize($filePath));

header('X-Content-Type-Options: nosniff');

readfile($filePath);
exit;