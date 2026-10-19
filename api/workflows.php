<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_same_origin();

const WORKFLOW_STEP_TYPES = ['merge', 'compress', 'watermark', 'pagenumbers', 'rotate', 'protect', 'unlock', 'repair', 'metadata'];
const MAX_WORKFLOWS_PER_USER = 25;
const MAX_STEPS = 15;

$user = require_user();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Passwords are never persisted; they are asked when the workflow runs.
function sanitize_steps($steps): ?array
{
    if (!is_array($steps) || count($steps) < 1 || count($steps) > MAX_STEPS) {
        return null;
    }
    $clean = [];
    foreach ($steps as $s) {
        if (!is_array($s) || !in_array($s['type'] ?? '', WORKFLOW_STEP_TYPES, true)) {
            return null;
        }
        $opts = [];
        foreach ((array)($s['options'] ?? []) as $k => $v) {
            if (!is_string($k) || !preg_match('/^[a-z_]{1,30}$/', $k) || stripos($k, 'password') !== false) {
                continue;
            }
            if (is_string($v) && mb_strlen($v) <= 200) {
                $opts[$k] = $v;
            } elseif (is_int($v) || is_float($v)) {
                $opts[$k] = $v;
            }
        }
        $clean[] = ['type' => $s['type'], 'options' => (object)$opts];
    }
    return $clean;
}

function read_payload(): array
{
    $in = json_in();
    $name = trim((string)($in['name'] ?? ''));
    $steps = sanitize_steps($in['steps'] ?? null);
    if ($name === '' || mb_strlen($name) > 100 || $steps === null) {
        json_out(['error' => 'invalid_workflow'], 422);
    }
    return [$name, json_encode($steps, JSON_UNESCAPED_UNICODE)];
}

function row_out(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'steps' => json_decode($r['steps'], true) ?: [],
        'updated_at' => $r['updated_at'],
    ];
}

$pdo = db();

if ($method === 'GET') {
    $st = $pdo->prepare('SELECT id, name, steps, updated_at FROM workflows WHERE user_id = ? ORDER BY updated_at DESC');
    $st->execute([$user['id']]);
    json_out(['workflows' => array_map('row_out', $st->fetchAll())]);
}

if ($method === 'POST') {
    [$name, $steps] = read_payload();
    $st = $pdo->prepare('SELECT COUNT(*) FROM workflows WHERE user_id = ?');
    $st->execute([$user['id']]);
    if ((int)$st->fetchColumn() >= MAX_WORKFLOWS_PER_USER) {
        json_out(['error' => 'limit_reached'], 403);
    }
    $now = date('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO workflows (user_id, name, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$user['id'], $name, $steps, $now, $now]);
    json_out(['id' => (int)$pdo->lastInsertId()], 201);
}

if ($method === 'PUT' && $id > 0) {
    [$name, $steps] = read_payload();
    $chk = $pdo->prepare('SELECT id FROM workflows WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $user['id']]);
    if (!$chk->fetch()) {
        json_out(['error' => 'not_found'], 404);
    }
    $pdo->prepare('UPDATE workflows SET name = ?, steps = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        ->execute([$name, $steps, date('Y-m-d H:i:s'), $id, $user['id']]);
    json_out(['ok' => true]);
}

if ($method === 'DELETE' && $id > 0) {
    $st = $pdo->prepare('DELETE FROM workflows WHERE id = ? AND user_id = ?');
    $st->execute([$id, $user['id']]);
    if ($st->rowCount() === 0) {
        json_out(['error' => 'not_found'], 404);
    }
    json_out(['ok' => true]);
}

json_out(['error' => 'method_not_allowed'], 405);
