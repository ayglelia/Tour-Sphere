<?php

$configPath = __DIR__ . '/api/config.php';
$config = file_exists($configPath) ? require $configPath : null;

$pdo = null;
$dbError = null;
if ($config) {
    try {
        $pdo = new PDO(
            "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
            $config['db_user'], $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    } catch (Throwable $e) {
        $dbError = $e->getMessage();
    }
} else {
    $dbError = 'Database is not configured on this server yet.';
}

$type = $_GET['type'] ?? '';
$id   = $_GET['id'] ?? '';

$TYPES = [
    'contract' => [
        'label' => 'Contract',
        'table' => 'contracts',
        'title' => fn($r) => $r['title'],
        'status' => fn($r) => $r['legal_hold'] ? 'Hold' : $r['status'],
        'details' => fn($r) => [
            'Contract ID' => $r['id'],
            'Party'       => $r['party'],
            'Type'        => $r['type'],
            'Term'        => $r['start_date'] . '  →  ' . $r['end_date'],
            'Value'       => $r['value'] ?: '—',
            'Signed'      => $r['signed'] ? 'Yes' : 'No',
        ],
    ],
    'facility' => [
        'label' => 'Facility Booking',
        'table' => 'bookings',
        'title' => fn($r) => $r['facility'],
        'status' => fn($r) => $r['status'],
        'details' => fn($r) => [
            'Booking ID'   => $r['id'],
            'Purpose'      => $r['purpose'],
            'Requested By' => $r['requested_by'],
            'Date'         => $r['date'],
            'Time'         => $r['start_time'] . '  –  ' . $r['end_time'],
        ],
    ],
    'visitor' => [
        'label' => 'Visitor Pass',
        'table' => 'visitors',
        'title' => fn($r) => $r['name'],
        'status' => fn($r) => $r['status'],
        'details' => fn($r) => [
            'Visitor ID' => $r['id'],
            'Purpose'    => $r['purpose'],
            'Host'       => $r['host'],
            'Company'    => $r['company'] ?: '—',
            'Date'       => $r['date'],
        ],
    ],
    'document' => [
        'label' => 'Archived Document',
        'table' => 'documents',
        'title' => fn($r) => $r['title'],
        'status' => fn($r) => $r['status'],
        'details' => fn($r) => [
            'Document ID' => $r['id'],
            'Category'    => $r['category'],
            'Owner'       => $r['owner'],
            'Filed'       => $r['date_added'],
            'Version'     => $r['version'],
        ],
    ],
];

$record = null;
$badType = !isset($TYPES[$type]);

if ($pdo && !$badType && $id !== '') {
    $cfg = $TYPES[$type];
    $stmt = $pdo->prepare("SELECT * FROM {$cfg['table']} WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $record = $stmt->fetch();
}

function statusColors(string $status): array {
    $green = ['Active','Approved','Checked-in','Resolved','Renewed','Valid'];
    $amber = ['Pending','Draft','Under Review'];
    $red   = ['Expired','Rejected','Terminated','Overdue','Disposed','Flagged','Invalid','Hold'];
    // anything else (Completed, Checked-out, Archived, ...) falls through to gray
    if (in_array($status, $green, true)) return ['#27AE60', '#E7F8EF'];
    if (in_array($status, $amber, true)) return ['#F2994A', '#FDF0E5'];
    if (in_array($status, $red,   true)) return ['#EB5757', '#FDECEC'];
    return ['#6B7280', '#F1F3F5'];
}

$found = $pdo && !$badType && $record;
if ($found) {
    $cfg = $TYPES[$type];
    $title = ($cfg['title'])($record);
    $status = ($cfg['status'])($record);
    $details = ($cfg['details'])($record);
    [$color, $bg] = statusColors($status);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $found ? htmlspecialchars($title) . ' — TravelCore Verification' : 'TravelCore Verification' ?></title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap" rel="stylesheet">
<style>
  :root{ --ink:#2F80ED; --paper:#F8FAFC; --card:#FFFFFF; --line:#EEF2F7; --text:#1F2937; --muted:#6B7280; }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--paper);color:var(--text);font-family:'Poppins',sans-serif;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .wrap{max-width:420px;width:100%;}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;justify-content:center;}
  .brand .mark{width:34px;height:34px;border:1.5px dashed var(--ink);border-radius:50%;display:flex;
               align-items:center;justify-content:center;font-style:italic;font-weight:600;color:var(--ink);}
  .brand span{font-weight:600;color:var(--ink);font-size:16px;letter-spacing:0.3px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px;
        box-shadow:0 4px 20px rgba(31,41,55,0.06);}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;
         font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;}
  .badge::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;}
  .kind{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
  h1{font-size:19px;margin:0 0 16px;line-height:1.3;}
  table{width:100%;border-collapse:collapse;font-size:13.5px;}
  td{padding:8px 0;border-bottom:1px solid var(--line);vertical-align:top;}
  td.k{color:var(--muted);width:38%;}
  td.v{font-weight:500;text-align:right;}
  tr:last-child td{border-bottom:none;}
  .footnote{margin-top:16px;font-size:11.5px;color:var(--muted);text-align:center;line-height:1.6;}
  .error-icon{font-size:34px;margin-bottom:8px;}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand"><div class="mark">T</div><span>TravelCore</span></div>

  <?php if (!$pdo): ?>
    <div class="card" style="text-align:center;">
      <div class="error-icon">⚠️</div>
      <h1>Verification Unavailable</h1>
      <p style="color:var(--muted);font-size:13.5px;">This system's database couldn't be reached. Please contact the agency directly to confirm this record.</p>
    </div>

  <?php elseif ($badType || !$found): ?>
    <div class="card" style="text-align:center;">
      <span class="badge" style="color:#EB5757;background:#FDECEC;">Not Verified</span>
      <h1>This QR code isn't recognized</h1>
      <p style="color:var(--muted);font-size:13.5px;">
        No matching record was found for this code. It may have been removed, revoked, or the code may not be a genuine TravelCore QR.
        <?php if ($id !== ''): ?><br><br><span style="font-family:monospace;">Reference: <?= htmlspecialchars($id) ?></span><?php endif; ?>
      </p>
    </div>

  <?php else: ?>
    <div class="card">
      <div class="kind"><?= htmlspecialchars($TYPES[$type]['label']) ?> Verification</div>
      <h1><?= htmlspecialchars($title) ?></h1>
      <span class="badge" style="color:<?= $color ?>;background:<?= $bg ?>;"><?= htmlspecialchars($status) ?></span>
      <table>
        <?php foreach ($details as $k => $v): ?>
          <tr><td class="k"><?= htmlspecialchars($k) ?></td><td class="v"><?= htmlspecialchars((string)$v) ?></td></tr>
        <?php endforeach; ?>
      </table>
    </div>
    <p class="footnote">
      Verified live against TravelCore's database on <?= date('F j, Y \a\t g:i A') ?>.<br>
      This status updates automatically — it reflects the record's current state, not a fixed printout.
    </p>
  <?php endif; ?>
</div>
</body>
</html>