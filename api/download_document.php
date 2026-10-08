<?php

require __DIR__ . '/db.php';

$user = require_login();

$id = trim($_GET['id'] ?? '');

if ($id === '') {
    http_response_code(400);
    exit('Document ID is required.');
}

$stmt = $pdo->prepare("
    SELECT file_name, file_path, file_type
    FROM documents
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$id]);

$document = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$document) {
    http_response_code(404);
    exit('Document not found.');
}

if (empty($document['file_path'])) {
    http_response_code(404);
    exit('This document has no attachment.');
}


$storageDir = getenv('DOCUMENT_STORAGE_DIR');

if (!$storageDir || !str_starts_with($storageDir, '/')) {
    http_response_code(500);
    exit('Private document storage is not configured.');
}

$baseDir = realpath($storageDir);

if (!$baseDir) {
    http_response_code(404);
    exit('Document storage directory not found.');
}

$storedName = (string)$document['file_path'];

if (
    $storedName !== basename($storedName) ||
    !preg_match(
        '/^DOC_[a-f0-9]{32}\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/',
        $storedName
    )
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
    !str_starts_with($filePath, $baseDir . DIRECTORY_SEPARATOR) ||
    !is_file($filePath)
) {
    http_response_code(404);
    exit('File not found.');
}

$downloadName = $document['file_name'] ?: basename($filePath);

header('Content-Type: ' . ($document['file_type'] ?: 'application/octet-stream'));
header('Content-Length: ' . filesize($filePath));
header(
    'Content-Disposition: attachment; filename="' .
    str_replace('"', '', basename($downloadName)) .
    '"'
);

readfile($filePath);
exit;