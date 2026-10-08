<?php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if (empty($_SESSION['user'])) {
    http_response_code(401);

    echo json_encode([
        'error' => 'Not signed in.'
    ]);

    exit;
}

/*
 * Only authorized roles may change the compliance checklist.
 */
$user = $_SESSION['user'];

$allowedRoles = [
    'Admin',
    'Facilities & Compliance Officer',
    'Records & Audit Officer'
];

$role = $user['role'] ?? '';

if (!in_array($role, $allowedRoles, true)) {
    http_response_code(403);

    echo json_encode([
        'error' => 'You are not authorized to change the compliance checklist.'
    ]);

    exit;
}


$body = json_decode(
    file_get_contents('php://input'),
    true
);

$id = (int)($body['id'] ?? 0);
$completed = !empty($body['completed']) ? 1 : 0;

if ($id < 1) {

    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid checklist item.'
    ]);

    exit;
}

/*
 * Determine who made the change.
 */
$checkedBy = $user['fullName'];

if ($completed) {

    $stmt = $pdo->prepare("
        UPDATE compliance_checklist
        SET
            completed = 1,
            checked_by = ?,
            checked_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $checkedBy,
        $id
    ]);

} else {

    $stmt = $pdo->prepare("
        UPDATE compliance_checklist
        SET
            completed = 0,
            checked_by = NULL,
            checked_at = NULL
        WHERE id = ?
    ");

    $stmt->execute([
        $id
    ]);
}

/*
 * Return the updated checklist item.
 */
$stmt = $pdo->prepare("
    SELECT
        id,
        item,
        completed,
        checked_by,
        checked_at
    FROM compliance_checklist
    WHERE id = ?
");

$stmt->execute([
    $id
]);

$result = $stmt->fetch();

if (!$result) {

    http_response_code(404);

    echo json_encode([
        'error' => 'Checklist item not found.'
    ]);

    exit;
}

/*
 * Return JavaScript-friendly field names.
 */
echo json_encode([
    'id' => $result['id'],
    'item' => $result['item'],
    'completed' => (int)$result['completed'],
    'checkedBy' => $result['checked_by'],
    'checkedAt' => $result['checked_at']
]);