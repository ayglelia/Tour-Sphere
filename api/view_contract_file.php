
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

$contractId = trim((string)($_GET['id'] ?? ''));

if ($contractId === '') {
    http_response_code(400);
    exit('Invalid contract ID.');
}

$stmt = $pdo->prepare(
    'SELECT file_name, file_path
     FROM contracts
     WHERE id = ?
     LIMIT 1'
);

$stmt->execute([$contractId]);
$file = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$file || empty($file['file_path'])) {
    http_response_code(404);
    exit('Contract attachment not found.');
}


$storageDir = getenv('CONTRACT_STORAGE_DIR');

if (!$storageDir || !str_starts_with($storageDir, '/')) {
    http_response_code(500);
    exit('Private contract storage is not configured.');
}

$baseDir = realpath($storageDir);


if (!$baseDir) {
    http_response_code(404);
    exit('Contract storage directory not found.');
}

// Only allow a stored filename, never a directory path.
$storedName = (string)$file['file_path'];

if (
    $storedName !== basename($storedName) ||
    !preg_match('/^CT_[a-zA-Z0-9_-]+_[0-9]{8}_[0-9]{6}_[a-f0-9]{16}\.(pdf|doc|docx|jpg|jpeg|png)$/', $storedName)
) {
    http_response_code(403);
    exit('Invalid file path.');
}

$filePath = realpath($baseDir . DIRECTORY_SEPARATOR . $storedName);

if (
    !$filePath ||
    !str_starts_with($filePath, $baseDir . DIRECTORY_SEPARATOR) ||
    !is_file($filePath)
) {
    http_response_code(404);
    exit('File not found.');
}

$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

$mimeTypes = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png'
];

$mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

$disposition = in_array($extension, ['pdf', 'jpg', 'jpeg', 'png'], true)
    ? 'inline'
    : 'attachment';

$originalName = basename((string)($file['file_name'] ?? 'contract.' . $extension));
$originalName = str_replace(["\r", "\n", '"', '\\'], '_', $originalName);

header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $disposition . '; filename="' . $originalName . '"');
header('Content-Length: ' . filesize($filePath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

readfile($filePath);
exit;
