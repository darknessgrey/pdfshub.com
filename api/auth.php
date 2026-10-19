<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_same_origin();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function login_session(int $uid): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;
}

function valid_email(string $email): bool
{
    return strlen($email) <= 190 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function verify_google_token(string $idToken): ?array
{
    $clientId = config('google_client_id');
    if (!$clientId || $idToken === '' || strlen($idToken) > 4096) {
        return null;
    }
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code !== 200) {
        return null;
    }
    $p = json_decode($body, true);
    if (!is_array($p)) {
        return null;
    }
    $issOk = in_array($p['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
    $verified = ($p['email_verified'] ?? '') === 'true' || ($p['email_verified'] ?? false) === true;
    if (!$issOk || ($p['aud'] ?? '') !== $clientId || (int)($p['exp'] ?? 0) < time() || !$verified || empty($p['sub']) || empty($p['email'])) {
        return null;
    }
    return $p;
}

if ($action === 'me' && $method === 'GET') {
    $u = current_user();
    json_out([
        'user' => $u ? public_user($u) : null,
        'google_client_id' => config('google_client_id') ?: null,
    ]);
}

if ($method !== 'POST') {
    json_out(['error' => 'method_not_allowed'], 405);
}

$in = json_in();

if ($action === 'register') {
    rate_limit('register', 10, 3600);
    $name = trim((string)($in['name'] ?? ''));
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $password = (string)($in['password'] ?? '');
    if ($name === '' || mb_strlen($name) > 100) {
        json_out(['error' => 'invalid_name'], 422);
    }
    if (!valid_email($email)) {
        json_out(['error' => 'invalid_email'], 422);
    }
    if (strlen($password) < 8 || strlen($password) > 200) {
        json_out(['error' => 'weak_password'], 422);
    }
    $pdo = db();
    $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) {
        json_out(['error' => 'email_taken'], 409);
    }
    $pdo->prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT), date('Y-m-d H:i:s')]);
    login_session((int)$pdo->lastInsertId());
    json_out(['user' => public_user(current_user())], 201);
}

if ($action === 'login') {
    rate_limit('login_fail', 10, 900, false);
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $password = (string)($in['password'] ?? '');
    $st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $st->execute([$email]);
    $row = $st->fetch();
    // Always run a hash verification so response time does not reveal whether the email exists.
    if ($row && $row['password_hash'] !== null) {
        $ok = password_verify($password, $row['password_hash']);
    } else {
        password_hash($password, PASSWORD_DEFAULT);
        $ok = false;
    }
    if (!$ok) {
        rate_limit('login_fail', 10, 900);
        json_out(['error' => 'invalid_credentials'], 401);
    }
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
    }
    login_session((int)$row['id']);
    json_out(['user' => public_user(current_user())]);
}

if ($action === 'google') {
    rate_limit('google', 30, 900);
    $p = verify_google_token((string)($in['credential'] ?? ''));
    if (!$p) {
        json_out(['error' => 'google_failed'], 401);
    }
    $pdo = db();
    $email = strtolower($p['email']);
    $sub = (string)$p['sub'];
    $st = $pdo->prepare('SELECT id FROM users WHERE google_sub = ?');
    $st->execute([$sub]);
    $row = $st->fetch();
    if (!$row) {
        // Link to an existing account with the same Google-verified email, otherwise create one.
        $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $st->execute([$email]);
        $row = $st->fetch();
        if ($row) {
            $pdo->prepare('UPDATE users SET google_sub = ? WHERE id = ?')->execute([$sub, $row['id']]);
        } else {
            $name = trim((string)($p['name'] ?? '')) ?: explode('@', $email)[0];
            $pdo->prepare('INSERT INTO users (email, name, google_sub, created_at) VALUES (?, ?, ?, ?)')
                ->execute([$email, mb_substr($name, 0, 100), $sub, date('Y-m-d H:i:s')]);
            $row = ['id' => $pdo->lastInsertId()];
        }
    }
    login_session((int)$row['id']);
    json_out(['user' => public_user(current_user())]);
}

if ($action === 'logout') {
    start_session();
    $_SESSION = [];
    $c = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $c['path'], $c['domain'] ?? '', (bool)$c['secure'], true);
    session_destroy();
    json_out(['ok' => true]);
}

json_out(['error' => 'not_found'], 404);
