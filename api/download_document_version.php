
<?php

require_once __DIR__ . '/db.php';

if (empty($_SESSION['user'])) {
    http_response_code(401);
    exit('Not signed in.');
}

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id || $id < 1) {
    http_response_code(400);
    exit('Invalid version ID.');
}

$stmt = $pdo->prepare("
    SELECT file_name, file_path, file_type
    FROM document_versions
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$id]);
$version = $stmt->fetch();

if (!$version || empty($version['file_path'])) {
    http_response_code(404);
    exit('Document version not found.');
}

// Read private storage location.
$storageDir = getenv('DOCUMENT_VERSION_STORAGE_DIR');

if (!$storageDir || !str_starts_with($storageDir, '/')) {
    http_response_code(500);
    exit('Private document version storage is not configured.');
}

$baseDir = realpath($storageDir);

if (!$baseDir) {
    http_response_code(404);
    exit('Document version storage directory not found.');
}

// Validate the stored filename.
$storedName = (string)$version['file_path'];

if (
    $storedName !== basename($storedName) ||
    !preg_match(
        '/^DV_[a-f0-9]{32}\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/',
        $storedName
    )
) {
    http_response_code(403);
    exit('Invalid stored filename.');
}

$filePath = realpath(
    $baseDir . DIRECTORY_SEPARATOR . $storedName
);

// Prevent access outside private storage.
if (
    !$filePath ||
    !str_starts_with($filePath, $baseDir . DIRECTORY_SEPARATOR) ||
    !is_file($filePath)
) {
    http_response_code(404);
    exit('Version file not found.');
}

$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

$mimeTypes = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png'
];

$mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

$downloadName = basename(
    (string)($version['file_name'] ?? 'document_version.' . $extension)
);

$downloadName = str_replace(
    ["\r", "\n", '"', '\\'],
    '_',
    $downloadName
);

header('Content-Type: ' . $mimeType);

header(
    'Content-Disposition: attachment; filename="' .
    $downloadName . '"'
);

header('Content-Length: ' . filesize($filePath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

readfile($filePath);
exit;
