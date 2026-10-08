<?php
require __DIR__ . '/db.php';

$user = require_login();
$body = json_input();
$email = trim($body['email'] ?? '');
$title = trim($body['title'] ?? 'TourSphere QR Code');
$code = trim($body['code'] ?? '');
$qrData = $body['qrData'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Please provide a valid recipient email address.'], 400);
}
if ($qrData === '' || !preg_match('#^data:image/png;base64,#', $qrData)) {
    respond(['error' => 'The QR image is missing or invalid.'], 400);
}

$encoded = substr($qrData, strpos($qrData, ',') + 1);
$image = base64_decode($encoded, true);
if ($image === false || strlen($image) < 50) {
    respond(['error' => 'The QR image could not be decoded.'], 400);
}


$from = getenv('MAIL_FROM');

if (!$from || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
    respond([
        'error' => 'MAIL_FROM is not configured.'
    ], 500);
}

$subject = 'TourSphere QR Code — ' . ($code ?: $title);
$boundary = 'b_' . bin2hex(random_bytes(12));
$cid = 'toursphere-qr-' . bin2hex(random_bytes(8));

$html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937">'
      . '<h2>TourSphere QR Code</h2>'
      . '<p><strong>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</strong></p>'
      . ($code !== '' ? '<p>Reference: ' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</p>' : '')
      . '<p>Present or scan this QR code as instructed by TourSphere.</p>'
      . '<p><img src="cid:' . $cid . '" alt="TourSphere QR Code" style="width:280px;height:280px"></p>'
      . '<p style="color:#6b7280">This message was sent by TourSphere.</p>'
      . '</body></html>';

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'From: TourSphere <' . $from . '>';
$headers[] = 'Content-Type: multipart/related; boundary="' . $boundary . '"';

$message = '--' . $boundary . "\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n\r\n" . $html . "\r\n";
$message .= '--' . $boundary . "\r\n";
$message .= 'Content-Type: image/png; name="toursphere-qr.png"' . "\r\n";
$message .= "Content-Transfer-Encoding: base64\r\n";
$message .= 'Content-ID: <' . $cid . ">\r\n";
$message .= "Content-Disposition: inline; filename=\"toursphere-qr.png\"\r\n\r\n";
$message .= chunk_split(base64_encode($image)) . "\r\n";
$message .= '--' . $boundary . "--\r\n";

$ok = mail($email, $subject, $message, implode("\r\n", $headers));
if (!$ok) {
    respond(['error' => 'PHP could not hand the email to the mail server. Configure SMTP/mail in XAMPP/PHP first.'], 500);
}

respond(['ok' => true]);
