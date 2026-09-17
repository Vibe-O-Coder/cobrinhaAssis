<?php
error_reporting(0);
ignore_user_abort(true);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if(isset($_GET['ping'])){header('Content-Type: text/plain');echo 'PHPRELAY_OK';exit;}
header('Content-Type: application/json');

$dir=__DIR__.'/srkx_data';
if(!is_dir($dir))@mkdir($dir,0777,true);

$room=isset($_GET['room'])?preg_replace('/[^a-z0-9]/','',strtolower($_GET['room'])):'';
if($room===''){echo json_encode(['err'=>'no room']);exit;}
$file=$dir.'/room_'.$room.'.json';

foreach(@glob($dir.'/room_*.json') as $f){if(time()-@filemtime($f)>3600)@unlink($f);}

$side=(isset($_GET['side'])&&$_GET['side']==='b')?'b':'a'; // a = caixa do host, b = caixa do convidado
$after=isset($_GET['after'])?intval($_GET['after']):-1;

if($_SERVER['REQUEST_METHOD']==='POST'){
 $msg=json_decode(file_get_contents('php://input'),true);
 if(!is_array($msg)){echo json_encode(['err'=>'bad msg']);exit;}
 $fp=fopen($file,'c+');
 if(!$fp){echo json_encode(['err'=>'io']);exit;}
 flock($fp,LOCK_EX);
 $raw=stream_get_contents($fp);
 $d=$raw?json_decode($raw,true):null;
 if(!is_array($d))$d=['a'=>[],'b'=>[],'na'=>0,'nb'=>0];
 $d[$side][]=['i'=>$d['n'.$side],'d'=>$msg];
 $d['n'.$side]++;
 if(count($d[$side])>400)$d[$side]=array_slice($d[$side],-400);
 fseek($fp,0);ftruncate($fp,0);fwrite($fp,json_encode($d));
 fflush($fp);flock($fp,LOCK_UN);fclose($fp);
 echo json_encode(['ok'=>1]);exit;
}

$deadline=microtime(true)+4.0;
while(true){
 $fp=@fopen($file,'c+');
 if($fp){
  flock($fp,LOCK_SH);
  $raw=stream_get_contents($fp);
  flock($fp,LOCK_UN);fclose($fp);
  $d=$raw?json_decode($raw,true):null;
  if(!is_array($d))$d=['a'=>[],'b'=>[],'na'=>0,'nb'=>0];
  $out=[];
  foreach($d[$side] as $m)if($m['i']>$after)$out[]=$m;
  if(count($out)>0){echo json_encode(['msgs'=>$out]);exit;}
 }
 if(microtime(true)>=$deadline){echo json_encode(['msgs'=>[]]);exit;}
 usleep(40000);
}