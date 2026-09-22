<?php
/* Relay LAN: leitura curta, snapshots substituídos e comandos preservados. */
error_reporting(0);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if (isset($_GET['ping'])) { header('Content-Type: text/plain'); echo 'PHPRELAY_OK'; exit; }
header('Content-Type: application/json');
$dir = __DIR__ . '/srkx_data';
if (!is_dir($dir)) @mkdir($dir, 0777, true);
$room = substr(preg_replace('/[^a-z0-9]/', '', strtolower($_GET['room'] ?? '')), 0, 40);
if (!$room) { http_response_code(400); echo '{"err":"no room"}'; exit; }
$file = $dir . '/room_' . $room . '.json';
// Limpeza ocasional, não uma varredura do disco em cada snapshot.
if (mt_rand(1, 200) === 1) foreach (glob($dir.'/room_*.json') ?: [] as $f) {
    if (time() - filemtime($f) > 3600) @unlink($f);
}
$side = ($_GET['side'] ?? '') === 'b' ? 'b' : 'a';
$after = intval($_GET['after'] ?? -1);
$fp = fopen($file, 'c+');
if (!$fp) { http_response_code(503); echo '{"err":"io"}'; exit; }
$write = $_SERVER['REQUEST_METHOD'] === 'POST';
flock($fp, $write ? LOCK_EX : LOCK_SH);
$d = json_decode(stream_get_contents($fp), true);
if (!is_array($d)) $d = ['a'=>[], 'b'=>[], 'na'=>0, 'nb'=>0];
if ($write) {
    $raw = file_get_contents('php://input', false, null, 0, 2097153);
    $msg = strlen($raw) <= 2097152 ? json_decode($raw, true) : null;
    $batch = isset($msg['batch']) ? $msg['batch'] : [$msg];
    if (!is_array($batch) || count($batch) > 128) $batch = [];
    foreach ($batch as $m) {
        if (!is_array($m) || !isset($m['t'], $m['from'])) continue;
        if (in_array($m['t'], ['state', 'k', 'hb'], true)) {
            $d[$side] = array_values(array_filter($d[$side], function($old) use ($m) {
                return ($old['d']['t'] ?? '') !== $m['t'] || ($old['d']['from'] ?? '') !== $m['from'];
            }));
        }
        $d[$side][] = ['i'=>$d['n'.$side]++, 'd'=>$m];
    }
    $d[$side] = array_slice($d[$side], -128);
    rewind($fp); ftruncate($fp, 0); fwrite($fp, json_encode($d)); fflush($fp);
    $out = ['ok'=>1];
} else {
    $out = ['msgs'=>array_values(array_filter($d[$side], fn($m)=>$m['i'] > $after))];
}
flock($fp, LOCK_UN); fclose($fp);
echo json_encode($out);
