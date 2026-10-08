<?php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

function uploadError($message, $status = 400) {
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    uploadError('Invalid request method.', 405);
}

$user = $_SESSION['user'] ?? null;

if (!$user) {
    uploadError('Not authenticated.', 401);
}

$allowedRoles = [
    'Admin',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
];

if (!in_array($user['role'] ?? '', $allowedRoles, true)) {
    uploadError('You do not have permission to upload contract files.', 403);
}

$contractId = trim((string)($_POST['contractId'] ?? ''));

if ($contractId === '') {
    uploadError('Contract ID is required.');
}

$stmt = $pdo->prepare('SELECT id FROM contracts WHERE id = ? LIMIT 1');
$stmt->execute([$contractId]);

if (!$stmt->fetch()) {
    uploadError('Contract not found.', 404);
}

if (!isset($_FILES['file'])) {
    uploadError('No file was uploaded.');
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    uploadError('File upload failed.');
}

$maxSize = 10 * 1024 * 1024;

if ($file['size'] <= 0 || $file['size'] > $maxSize) {
    uploadError('File must be between 1 byte and 10 MB.');
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

$allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

if (!in_array($extension, $allowedExtensions, true)) {
    uploadError('File type is not allowed.');
}

// Store contract files outside the public web directory.

$uploadDir = getenv('CONTRACT_STORAGE_DIR');

if (!is_absolute_storage_path($uploadDir)) {
    uploadError('Private contract storage is not configured.', 500);
}

$uploadDir = rtrim($uploadDir, '/') . '/';


if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
    uploadError('Unable to create contract upload directory.', 500);
}

$safeName = 'CT_' .
    preg_replace('/[^a-zA-Z0-9_-]/', '_', $contractId) .
    '_' . date('Ymd_His') .
    '_' . bin2hex(random_bytes(8)) .
    '.' . $extension;

$destination = $uploadDir . $safeName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    uploadError('Unable to save uploaded file.', 500);
}

$mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($destination);

$stmt = $pdo->prepare(
    'UPDATE contracts
     SET file_name = ?, file_path = ?, file_size = ?, file_type = ?
     WHERE id = ?'
);

try {
    $stmt->execute([
        basename($file['name']),
        $safeName,
        $file['size'],
        $mimeType,
        $contractId
    ]);
} catch (Throwable $e) {
    unlink($destination);
    uploadError('Unable to save attachment details.', 500);
}

echo json_encode([
    'ok' => true,
    'contractId' => $contractId,
    'fileName' => basename($file['name']),
    'fileSize' => $file['size'],
    'fileType' => $mimeType
]);
