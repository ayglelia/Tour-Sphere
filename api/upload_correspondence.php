<?php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'ok' => false,
        'error' => 'Invalid request method.'
    ]);
    exit;
}

$user = $_SESSION['user'] ?? null;

if (!$user) {
    echo json_encode([
        'ok' => false,
        'error' => 'Not authenticated.'
    ]);
    exit;
}

$allowedRoles = [
    'Admin',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
];

if (!in_array($user['role'] ?? '', $allowedRoles, true)) {
    echo json_encode([
        'ok' => false,
        'error' => 'You do not have permission to upload correspondence files.'
    ]);
    exit;
}

$correspondenceId =
    (int)($_POST['correspondenceId'] ?? 0);

if ($correspondenceId <= 0) {
    echo json_encode([
        'ok' => false,
        'error' => 'Correspondence ID is required.'
    ]);
    exit;
}

if (!isset($_FILES['file'])) {
    echo json_encode([
        'ok' => false,
        'error' => 'No file was uploaded.'
    ]);
    exit;
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'ok' => false,
        'error' => 'File upload failed.'
    ]);
    exit;
}

$maxSize = 10 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    echo json_encode([
        'ok' => false,
        'error' => 'File is too large. Maximum size is 10 MB.'
    ]);
    exit;
}

$extension = strtolower(
    pathinfo($file['name'], PATHINFO_EXTENSION)
);

$allowedExtensions = [
    'pdf',
    'doc',
    'docx',
    'jpg',
    'jpeg',
    'png'
];

if (!in_array($extension, $allowedExtensions, true)) {
    echo json_encode([
        'ok' => false,
        'error' => 'File type is not allowed.'
    ]);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT id FROM correspondence WHERE id = ? LIMIT 1'
);

$stmt->execute([$correspondenceId]);

if (!$stmt->fetch()) {
    echo json_encode([
        'ok' => false,
        'error' => 'Correspondence entry not found.'
    ]);
    exit;
}


$uploadDir = getenv('CORRESPONDENCE_STORAGE_DIR');

if (!$uploadDir || !str_starts_with($uploadDir, '/')) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Private correspondence storage is not configured.'
    ]);
    exit;
}

$uploadDir = rtrim($uploadDir, '/') . '/';


if (!is_dir($uploadDir)) {

    if (!mkdir($uploadDir, 0775, true)) {

        echo json_encode([
            'ok' => false,
            'error' => 'Unable to create upload directory.'
        ]);

        exit;
    }
}

$safeName =
    'CO_' .
    $correspondenceId . '_' .
    date('Ymd_His') . '_' .
    bin2hex(random_bytes(4)) .
    '.' .
    $extension;

$destination =
    $uploadDir . $safeName;

if (!move_uploaded_file(
    $file['tmp_name'],
    $destination
)) {

    echo json_encode([
        'ok' => false,
        'error' => 'Unable to save uploaded file.'
    ]);

    exit;
}


$relativePath = $safeName;


$mimeType =
    $file['type'] ??
    'application/octet-stream';

$stmt = $pdo->prepare(
    'UPDATE correspondence
     SET file_name = ?,
         file_path = ?,
         file_size = ?,
         file_type = ?
     WHERE id = ?'
);

$stmt->execute([
    $file['name'],
    $relativePath,
    $file['size'],
    $mimeType,
    $correspondenceId
]);

echo json_encode([
    'ok' => true,
    'correspondenceId' => $correspondenceId,
    'fileName' => $file['name'],
    'filePath' => $relativePath,
    'fileSize' => $file['size'],
    'fileType' => $mimeType
]);