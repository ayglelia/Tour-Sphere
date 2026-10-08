<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$user = require_login();

require_role($user, [
    'Admin',
    'Facilities & Compliance Officer',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
]);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Invalid request method.'], 405);
}

$documentId = trim($_POST['documentId'] ?? '');
$version    = trim($_POST['version'] ?? '');
$note       = trim($_POST['note'] ?? '');

if ($documentId === '' || $version === '' || $note === '') {
    respond(['error' => 'Document, version, and change description are required.'], 400);
}

if (!isset($_FILES['file'])) {
    respond(['error' => 'Please select a version file.'], 400);
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(['error' => 'File upload failed.'], 400);
}

if ($file['size'] > 10 * 1024 * 1024) {
    respond(['error' => 'The version file must not exceed 10 MB.'], 400);
}

/* Check that the document exists */
$stmt = $pdo->prepare("SELECT id FROM documents WHERE id = ?");
$stmt->execute([$documentId]);

if (!$stmt->fetch()) {
    respond(['error' => 'The selected document does not exist.'], 404);
}

/* Allowed file types */
$allowed = [
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls'  => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png'
];

$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!isset($allowed[$extension])) {
    respond(['error' => 'This file type is not allowed.'], 400);
}


/* Private document version storage */
$uploadDir = getenv('DOCUMENT_VERSION_STORAGE_DIR');

if (!is_absolute_storage_path($uploadDir)) {
    respond([
        'error' => 'Private document version storage is not configured.'
    ], 500);
}

$uploadDir = rtrim($uploadDir, '/') . '/';


if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        respond(['error' => 'Could not create the version upload folder.'], 500);
    }
}


/* Generate a private, unique filename */
$storedName = 'DV_' .
    bin2hex(random_bytes(16)) .
    '.' . $extension;


$targetPath = $uploadDir . $storedName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respond(['error' => 'Could not save the uploaded version file.'], 500);
}

/* Path stored in the database */
$dbPath = $storedName;

try {

    $stmt = $pdo->prepare("
        INSERT INTO document_versions
        (
            document_id,
            version,
            edited_by,
            edited_at,
            note,
            file_name,
            file_path,
            file_size,
            file_type
        )
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $documentId,
        $version,
        $user['fullName'],
        $note,
        $originalName,
        $dbPath,
        $file['size'],
        $allowed[$extension]
    ]);

    respond([
        'ok' => true,
        'message' => 'Document version uploaded successfully.',
        'id' => $pdo->lastInsertId()
    ]);

} catch (Throwable $e) {

    /* Remove uploaded file if database insert failed */
    if (file_exists($targetPath)) {
        unlink($targetPath);
    }

    respond([
        'error' => 'Could not save document version to the database.'
    ], 500);
}