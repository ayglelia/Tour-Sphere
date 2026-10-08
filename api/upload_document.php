<?php

require __DIR__ . '/db.php';

$user = require_login();

$allowedRoles = [
    'Admin',
    'Facilities & Compliance Officer',
    'Legal & Contracts Officer',
    'Records & Audit Officer'
];

if (!in_array($user['role'], $allowedRoles, true)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'You are not allowed to upload documents.'
    ]);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => 'POST required.'
    ]);
    exit;
}

$title = trim($_POST['title'] ?? '');
$category = trim($_POST['category'] ?? '');
$contractId = trim($_POST['contractId'] ?? '');
$owner = trim($_POST['owner'] ?? '');
$id = trim($_POST['id'] ?? '');
$dateAdded = trim($_POST['dateAdded'] ?? '');
$retentionYears = (int)($_POST['retentionYears'] ?? 1);

if (
    $title === '' ||
    $category === '' ||
    $owner === '' ||
    $id === '' ||
    $dateAdded === ''
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Title, category, owner, document ID, and filed date are required.'
    ]);

    exit;
}

if ($contractId !== '') {

    $contractStmt = $pdo->prepare("
        SELECT id
        FROM contracts
        WHERE id = ?
        LIMIT 1
    ");

    $contractStmt->execute([
        $contractId
    ]);

    if (!$contractStmt->fetch()) {

        http_response_code(400);

        echo json_encode([
            'error' => 'Selected contract was not found.'
        ]);

        exit;
    }
}

/*
 * Validate the supplied filing date.
 */

date_default_timezone_set('Asia/Manila');

$dateObject = DateTime::createFromFormat(
    '!Y-m-d',
    $dateAdded
);

if (
    !$dateObject ||
    $dateObject->format('Y-m-d') !== $dateAdded
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid filed date.'
    ]);

    exit;
}

/*
 * Prevent future filing dates.
 */
$today = new DateTime('today');

if ($dateObject > $today) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Filed date cannot be in the future.'
    ]);

    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Please select a file.'
    ]);

    exit;
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);

    echo json_encode([
        'error' => 'File upload failed.'
    ]);

    exit;
}

/*
 * Maximum file size: 10 MB
 */
$maxSize = 10 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    http_response_code(400);

    echo json_encode([
        'error' => 'File is too large. Maximum size is 10 MB.'
    ]);

    exit;
}

/*
 * Allowed file types
 */
$allowedExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'jpg',
    'jpeg',
    'png'
];

$originalName = basename($file['name']);

$extension = strtolower(
    pathinfo(
        $originalName,
        PATHINFO_EXTENSION
    )
);

if (!in_array($extension, $allowedExtensions, true)) {

    http_response_code(400);

    echo json_encode([
        'error' => 'Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.'
    ]);

    exit;
}

/*
 * Generate a safe stored filename.
 */
$safeBase = preg_replace(
    '/[^A-Za-z0-9_-]/',
    '_',
    pathinfo(
        $originalName,
        PATHINFO_FILENAME
    )
);

$safeBase = trim(
    $safeBase,
    '_'
);

if ($safeBase === '') {
    $safeBase = 'document';
}


$storedName = 'DOC_' .
    bin2hex(random_bytes(16)) .
    '.' . $extension;



$uploadDir = getenv('DOCUMENT_STORAGE_DIR');

if (!is_absolute_storage_path($uploadDir)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Private document storage is not configured.'
    ]);
    exit;
}

$uploadDir = rtrim($uploadDir, '/');


if (!is_dir($uploadDir)) {

    if (!mkdir($uploadDir, 0755, true)) {

        http_response_code(500);

        echo json_encode([
            'error' => 'Could not create document upload directory.'
        ]);

        exit;
    }
}

$destination =
    $uploadDir .
    '/' .
    $storedName;

if (!move_uploaded_file(
    $file['tmp_name'],
    $destination
)) {

    http_response_code(500);

    echo json_encode([
        'error' => 'Could not save uploaded file.'
    ]);

    exit;
}

$version = 'v1.0';
$status = 'Active';


$relativePath = $storedName;


try {

    $pdo->beginTransaction();

$sql = "
    INSERT INTO documents
    (
        id,
        title,
        category,
        contract_id,
        owner,
        file_name,
        file_path,
        file_size,
        file_type,
        date_added,
        version,
        retention_years,
        status
    )
    VALUES
    (
        :id,
        :title,
        :category,
        :contract_id,
        :owner,
        :file_name,
        :file_path,
        :file_size,
        :file_type,
        :date_added,
        :version,
        :retention_years,
        :status
    )
";

    $stmt = $pdo->prepare($sql);

   $stmt->execute([
    ':id' => $id,
    ':title' => $title,
    ':category' => $category,
    ':contract_id' => $contractId !== '' ? $contractId : null,
    ':owner' => $owner,
        ':file_name' => $originalName,
        ':file_path' => $relativePath,
        ':file_size' => $file['size'],
        ':file_type' => $file['type'],
        ':date_added' => $dateAdded,
        ':version' => $version,
        ':retention_years' => $retentionYears,
        ':status' => $status
    ]);

    $pdo->commit();

    echo json_encode([
    'id' => $id,
    'title' => $title,
    'category' => $category,
    'contractId' => $contractId !== '' ? $contractId : null,
    'owner' => $owner,
    'fileName' => $originalName,
    'filePath' => $relativePath,
    'fileSize' => (int)$file['size'],
    'fileType' => $file['type'],
    'dateAdded' => $dateAdded,
    'version' => $version,
    'retentionYears' => $retentionYears,
    'status' => $status
]);

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (is_file($destination)) {
        unlink($destination);
    }

    http_response_code(500);

    echo json_encode([
        'error' => 'Could not save document to the database.',
        'details' => $e->getMessage()
    ]);
}