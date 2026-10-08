<?php

require_once __DIR__ . '/db.php';

$user = require_login();

require_role($user, [
    'Admin',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
]);

$caseId = trim((string)($_GET['id'] ?? ''));

if (
    $caseId === '' ||
    !preg_match('/^[A-Za-z0-9_-]{1,10}$/', $caseId)
) {
    http_response_code(400);
    exit('Invalid legal case ID.');
}

$stmt = $pdo->prepare(
    'SELECT file_name, file_path
     FROM legal_cases
     WHERE id = ?
     LIMIT 1'
);

$stmt->execute([$caseId]);
$file = $stmt->fetch();

if (!$file || empty($file['file_path'])) {
    http_response_code(404);
    exit('Legal case attachment not found.');
}

// Private storage location
$storageDir = getenv('LEGAL_CASE_STORAGE_DIR');

if (!is_absolute_storage_path($storageDir)) {
    http_response_code(500);
    exit('Private legal case storage is not configured.');
}

$baseDir = realpath($storageDir);

if (!$baseDir) {
    http_response_code(404);
    exit('Legal case storage directory not found.');
}

// Validate the stored filename
$storedName = (string)$file['file_path'];

if (
    $storedName !== basename($storedName) ||
    !preg_match(
        '/^[A-Za-z0-9_-]{1,10}_[0-9]{8}_[0-9]{6}_[a-f0-9]{8}\.(pdf|doc|docx|jpg|jpeg|png)$/',
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
    !$filePath ||
    !str_starts_with($filePath, $baseDir . DIRECTORY_SEPARATOR) ||
    !is_file($filePath)
) {
    http_response_code(404);
    exit('Attachment file not found.');
}

$extension = strtolower(
    pathinfo($filePath, PATHINFO_EXTENSION)
);

$mimeTypes = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png'
];

$mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

$disposition = in_array(
    $extension,
    ['pdf', 'jpg', 'jpeg', 'png'],
    true
) ? 'inline' : 'attachment';

$downloadName = basename(
    (string)($file['file_name'] ?? 'legal_case.' . $extension)
);

$downloadName = str_replace(
    ["\r", "\n", '"', '\\'],
    '_',
    $downloadName
);

header('Content-Type: ' . $mimeType);

header(
    'Content-Disposition: ' .
    $disposition .
    '; filename="' . $downloadName . '"'
);

header('Content-Length: ' . filesize($filePath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

readfile($filePath);
exit;
