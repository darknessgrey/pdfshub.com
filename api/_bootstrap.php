<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    json_out(['error' => 'server_not_configured'], 500);
}
$CONFIG = require $configFile;

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_in(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function config(string $key, $default = null)
{
    global $CONFIG;
    return $CONFIG[$key] ?? $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    try {
        $pdo = new PDO(
            'mysql:host=' . config('db_host', 'localhost') . ';dbname=' . config('db_name') . ';charset=utf8mb4',
            config('db_user'),
            config('db_pass'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        ensure_schema($pdo);
    } catch (Throwable $e) {
        error_log('pdfshub db error: ' . $e->getMessage());
        json_out(['error' => 'server_error'], 500);
    }
    return $pdo;
}

function ensure_schema(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NULL,
        google_sub VARCHAR(64) NULL UNIQUE,
        plan VARCHAR(20) NOT NULL DEFAULT "free",
        created_at DATETIME NOT NULL
    ) CHARACTER SET utf8mb4');
    $pdo->exec('CREATE TABLE IF NOT EXISTS workflows (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        name VARCHAR(100) NOT NULL,
        steps TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4');
    $pdo->exec('CREATE TABLE IF NOT EXISTS auth_attempts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        kind VARCHAR(16) NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_ip_kind (ip, kind, created_at)
    ) CHARACTER SET utf8mb4');
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_name('pdfshub_sid');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.gc_maxlifetime', (string)(60 * 60 * 24 * 30));
    session_start();
}

// CSRF defence for state-changing requests: custom header + same-origin check.
function require_same_origin(): void
{
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'pdfshub') {
        json_out(['error' => 'forbidden'], 403);
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $originHost = parse_url($origin, PHP_URL_HOST);
        $originPort = parse_url($origin, PHP_URL_PORT);
        $host = $originPort ? $originHost . ':' . $originPort : $originHost;
        if (!hash_equals(strtolower((string)($_SERVER['HTTP_HOST'] ?? '')), strtolower((string)$host))) {
            json_out(['error' => 'forbidden'], 403);
        }
    }
}

function current_user(): ?array
{
    if (session_status() !== PHP_SESSION_ACTIVE && !isset($_COOKIE['pdfshub_sid'])) {
        return null;
    }
    start_session();
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $st = db()->prepare('SELECT id, email, name, plan FROM users WHERE id = ?');
    $st->execute([(int)$_SESSION['uid']]);
    $u = $st->fetch();
    return $u ?: null;
}

function require_user(): array
{
    $u = current_user();
    if (!$u) {
        json_out(['error' => 'unauthorized'], 401);
    }
    return $u;
}

function public_user(array $u): array
{
    return [
        'id' => (int)$u['id'],
        'email' => $u['email'],
        'name' => $u['name'],
        'plan' => $u['plan'],
    ];
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function rate_limit(string $kind, int $max, int $windowSeconds, bool $record = true): void
{
    $pdo = db();
    $since = date('Y-m-d H:i:s', time() - $windowSeconds);
    $st = $pdo->prepare('SELECT COUNT(*) FROM auth_attempts WHERE ip = ? AND kind = ? AND created_at >= ?');
    $st->execute([client_ip(), $kind, $since]);
    if ((int)$st->fetchColumn() >= $max) {
        json_out(['error' => 'too_many_attempts'], 429);
    }
    if ($record) {
        $pdo->prepare('INSERT INTO auth_attempts (ip, kind, created_at) VALUES (?, ?, ?)')
            ->execute([client_ip(), $kind, date('Y-m-d H:i:s')]);
        $pdo->prepare('DELETE FROM auth_attempts WHERE created_at < ?')
            ->execute([date('Y-m-d H:i:s', time() - 86400)]);
    }
}
