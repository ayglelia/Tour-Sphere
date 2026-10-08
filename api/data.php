<?php

require __DIR__ . '/db.php';

$user = require_login(); 

$RESOURCES = [
    'facilities' => [
        'table' => 'facilities', 'idField' => 'id', 'autoId' => false, 'order' => 'id ASC',
        'map' => ['id'=>'id','name'=>'name','type'=>'type','capacity'=>'capacity'],
        'writeRoles' => ['Admin','Facilities & Compliance Officer'],
    ],

    'bookings' => [
        'table' => 'bookings', 'idField' => 'id', 'autoId' => false, 'order' => 'date DESC, start_time DESC',
        'map' => ['id'=>'id','facility'=>'facility','purpose'=>'purpose','requestedBy'=>'requested_by','date'=>'date','start'=>'start_time','end'=>'end_time','status'=>'status'],
        'writeRoles' => ['Admin','Front Desk / Operations','Facilities & Compliance Officer'],
    ],

    'visitors' => [
        'table' => 'visitors', 'idField' => 'id', 'autoId' => false, 'order' => 'id DESC',
        'map' => ['id'=>'id','registrationMethod'=>'registration_method','name'=>'name','email'=>'email','purpose'=>'purpose','host'=>'host','company'=>'company',
                  'date'=>'date','status'=>'status','checkedInAt'=>'checked_in_at','checkedOutAt'=>'checked_out_at','notified'=>'notified'],
        'bools' => ['notified'],
        'writeRoles' => ['Admin','Front Desk / Operations','Records & Audit Officer'],
    ],

    'blacklist' => [
        'table' => 'blacklist', 'idField' => 'id', 'autoId' => true, 'order' => 'id DESC',
        'map' => ['id'=>'id','name'=>'name','reason'=>'reason','date'=>'date'],
        'writeRoles' => ['Admin','Front Desk / Operations','Records & Audit Officer'],
    ],

    'documents' => [
    'table' => 'documents',
    'idField' => 'id',
    'autoId' => false,
    'order' => 'date_added DESC',

    'map' => [
        'id' => 'id',
        'title' => 'title',
        'category' => 'category',
        'contractId' => 'contract_id',
        'owner' => 'owner',
        'fileName' => 'file_name',
        'filePath' => 'file_path',
        'fileSize' => 'file_size',
        'fileType' => 'file_type',
        'dateAdded' => 'date_added',
        'version' => 'version',
        'status' => 'status',
        'retentionYears' => 'retention_years',
        'legalHold' => 'legal_hold'
    ],

    'bools' => ['legalHold'],
    'ints' => ['retentionYears','fileSize'],

    'writeRoles' => [
        'Admin',
        'Facilities & Compliance Officer',
        'Legal & Contracts Officer',
        'Records & Audit Officer'
    ],
],

    'documentVersions' => [
        'table' => 'document_versions', 'idField' => 'id', 'autoId' => true, 'order' => 'edited_at DESC',
        'map' => ['id'=>'id', 'documentId'=>'document_id', 'version'=>'version', 'editedBy'=>'edited_by', 'editedAt'=>'edited_at', 'note'=>'note', 'fileName'=>'file_name', 'filePath'=>'file_path', 'fileSize'=>'file_size', 'fileType'=>'file_type'],
        'ints' => ['fileSize'],
        'writeRoles' => ['Admin','Facilities & Compliance Officer','Legal & Contracts Officer','Records & Audit Officer'],
    ],

    'retentionSchedule' => [
        'table' => 'retention_schedule', 'idField' => 'type', 'autoId' => false, 'order' => 'type ASC',
        'map' => ['type'=>'type','years'=>'years'], 'ints' => ['years'],
        'writeRoles' => ['Admin','Facilities & Compliance Officer','Records & Audit Officer'],
    ],

    'complianceChecklist' => [

    'table' => 'compliance_checklist',
    'idField' => 'id',
    'autoId' => true,
    'order' => 'id ASC',

    'map' => [
        'id' => 'id',
        'item' => 'item',
        'completed' => 'completed',
        'checkedBy' => 'checked_by',
        'checkedAt' => 'checked_at'
    ],

    'ints' => ['completed'],

    'bools' => ['completed'],

    'writeRoles' => [
        'Admin',
        'Facilities & Compliance Officer',
        'Records & Audit Officer'
    ],
],

    'legalCases' => [

    'table' => 'legal_cases',
    'idField' => 'id',
    'autoId' => false,
    'order' => 'deadline ASC',

    'map' => [
        'id' => 'id',
        'title' => 'title',
        'type' => 'type',
        'filed' => 'filed',
        'deadline' => 'deadline',
        'status' => 'status',
        'priority' => 'priority',
        'assignedOfficer' => 'assigned_officer',
        'description' => 'description',
        'fileName' => 'file_name',
        'filePath' => 'file_path',
        'fileSize' => 'file_size',
        'fileType' => 'file_type',
        'relatedContract' => 'related_contract'
    ],

    'ints' => ['fileSize'],

    'writeRoles' => [
        'Admin',
        'Legal & Contracts Officer',
        'Records & Audit Officer'
    ],

],

    'correspondence' => [

    'table' => 'correspondence',
    'idField' => 'id',
    'autoId' => false,
    'order' => 'date DESC',

    'map' => [
        'id' => 'id',
        'date' => 'date',
        'caseId' => 'case_id',
        'contractId' => 'contract_id',
        'withParty' => 'with_party',
        'direction' => 'direction',
        'type' => 'type',
        'subject' => 'subject',
        'message' => 'message',
        'fileName' => 'file_name',
        'filePath' => 'file_path',
        'fileSize' => 'file_size',
        'fileType' => 'file_type'
    ],

    'ints' => [
        'fileSize'
    ],

    'writeRoles' => [
        'Admin',
        'Legal & Contracts Officer',
        'Records & Audit Officer'
    ],

],

    'contracts' => [
    'table' => 'contracts',
    'idField' => 'id',
    'autoId' => false,
    'order' => 'end_date ASC',

    'map' => [
        'id' => 'id',
        'title' => 'title',
        'party' => 'party',
        'type' => 'type',
        'start' => 'start_date',
        'end' => 'end_date',
        'value' => 'value',
        'status' => 'status',
        'signed' => 'signed',
'signerName' => 'signer_name',
'signedAt' => 'signed_at',
'approvalLevel' => 'approval_level',
        'legalHold' => 'legal_hold',
'terminationReason' => 'termination_reason',
'terminatedAt' => 'terminated_at',
'previousEndDate' => 'previous_end_date',
'renewedAt' => 'renewed_at',
        'fileName' => 'file_name',
        'filePath' => 'file_path',
        'fileSize' => 'file_size',
        'fileType' => 'file_type'
    ],

    'bools' => ['signed', 'legalHold'],
    'ints' => ['approvalLevel', 'fileSize'],

    'writeRoles' => [
        'Admin',
        'Legal & Contracts Officer',
        'Records & Audit Officer'
    ],
],

    'auditLog' => [
        'table' => 'audit_log', 'idField' => 'id', 'autoId' => true, 'order' => 'logged_at DESC',
        'map' => ['id'=>'id','t'=>'t_label','d'=>'message'],
        'writeRoles' => [
            'Admin',
            'Front Desk / Operations',
            'Facilities & Compliance Officer',
            'Legal & Contracts Officer',
            'Records & Audit Officer'
        ],
    ],
];

$resource = $_GET['resource'] ?? '';
if (!isset($RESOURCES[$resource])) {
    respond(['error' => "Unknown resource: $resource"], 404);
}
$cfg = $RESOURCES[$resource];

function mapRowOut(array $row, array $cfg): array {
    $out = [];
    foreach ($cfg['map'] as $jsKey => $col) {
        $out[$jsKey] = $row[$col] ?? null;
    }
    foreach ($cfg['bools'] ?? [] as $field) { $out[$field] = (bool)($out[$field] ?? false); }
    foreach ($cfg['ints']  ?? [] as $field) { $out[$field] = (int)($out[$field] ?? 0); }
    return $out;
}

function fetchOne(PDO $pdo, array $cfg, $idValue): ?array {
    $dbCol = $cfg['map'][$cfg['idField']];
    $stmt = $pdo->prepare("SELECT * FROM {$cfg['table']} WHERE {$dbCol} = ? LIMIT 1");
    $stmt->execute([$idValue]);
    $row = $stmt->fetch();
    return $row ? mapRowOut($row, $cfg) : null;
}

function checkWriteAllowed(array $cfg, array $user): void {
    $allowed = $cfg['writeRoles'] ?? ['Admin'];
    require_role($user, $allowed);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM {$cfg['table']} ORDER BY {$cfg['order']}");
    $rows = array_map(fn($r) => mapRowOut($r, $cfg), $stmt->fetchAll());
    respond($rows);
}

if ($method === 'POST') {
    checkWriteAllowed($cfg, $user);
    $body = json_input();
    $dbCol = $cfg['map'][$cfg['idField']];

    $cols = []; $placeholders = []; $values = [];
    foreach ($cfg['map'] as $jsKey => $col) {
        if ($cfg['autoId'] && $jsKey === $cfg['idField']) continue; 
        if (!array_key_exists($jsKey, $body)) continue;
        $val = $body[$jsKey];
        if (in_array($jsKey, $cfg['bools'] ?? [], true)) $val = $val ? 1 : 0;
        $cols[] = $col; $placeholders[] = '?'; $values[] = $val;
    }
    if (empty($cols)) respond(['error' => 'No recognized fields in request body.'], 400);

    $sql = "INSERT INTO {$cfg['table']} (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
    $pdo->prepare($sql)->execute($values);

    $newId = $cfg['autoId'] ? $pdo->lastInsertId() : $body[$cfg['idField']];
    respond(fetchOne($pdo, $cfg, $newId), 201);
}

if ($method === 'PUT') {
    checkWriteAllowed($cfg, $user);
    $idValue = $_GET['id'] ?? null;
    if ($idValue === null) respond(['error' => 'Missing ?id=… on PUT request.'], 400);

    $body = json_input();
    $dbCol = $cfg['map'][$cfg['idField']];

    $sets = []; $values = [];
    foreach ($cfg['map'] as $jsKey => $col) {
        if ($jsKey === $cfg['idField']) continue; 
        if (!array_key_exists($jsKey, $body)) continue;
        $val = $body[$jsKey];
        if (in_array($jsKey, $cfg['bools'] ?? [], true)) $val = $val ? 1 : 0;
        $sets[] = "$col = ?"; $values[] = $val;
    }
    if (empty($sets)) respond(['error' => 'No recognized fields in request body.'], 400);

    $values[] = $idValue;
    $sql = "UPDATE {$cfg['table']} SET " . implode(',', $sets) . " WHERE $dbCol = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    $updated = fetchOne($pdo, $cfg, $idValue);
    if (!$updated) respond(['error' => 'Row not found after update.'], 404);
    respond($updated);
}

if ($method === 'DELETE') {
    if (empty($cfg['deletable'])) {
        respond(['error' => "$resource records can't be deleted — this system keeps them as history. Change the record's status instead."], 403);
    }
    checkWriteAllowed($cfg, $user);
    $idValue = $_GET['id'] ?? null;
    if ($idValue === null) respond(['error' => 'Missing ?id=… on DELETE request.'], 400);

    $dbCol = $cfg['map'][$cfg['idField']];
    $stmt = $pdo->prepare("DELETE FROM {$cfg['table']} WHERE $dbCol = ?");
    $stmt->execute([$idValue]);
    respond(['ok' => true]);
}

respond(['error' => 'Unsupported method.'], 405);