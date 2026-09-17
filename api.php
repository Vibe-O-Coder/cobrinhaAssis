<?php
/* Leaderboard — XAMPP: MySQL (auto-cria o banco snake_ultra).
   Se o MySQL não estiver disponível, usa arquivo JSON. */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

$DB_HOST='localhost'; $DB_USER='root'; $DB_PASS=''; $DB_NAME='snake_ultra';

$action=isset($_GET['action'])?$_GET['action']:'top';

function out($a){echo json_encode($a);exit;}

function parseEntry(){
 if($_SERVER['REQUEST_METHOD']!=='POST')return null;
 $j=json_decode(file_get_contents('php://input'),true);
 if(!is_array($j))return null;
 $name=trim(strval(isset($j['name'])?$j['name']:''));
 $name=substr(preg_replace('/[^\p{L}\p{N} _\-.]/u','',$name),0,16);
 if($name==='')$name='Viajante';
 $score=intval(isset($j['score'])?$j['score']:0);
 $wave=intval(isset($j['wave'])?$j['wave']:0);
 $cls=intval(isset($j['cls'])?$j['cls']:0);
 if($score<0||$score>999999||$wave<0||$wave>999||$cls<0||$cls>99)return null;
 return ['name'=>$name,'score'=>$score,'wave'=>$wave,'cls'=>$cls,'ts'=>time()];
}

function fileDb($action,$entry){
 $dir=__DIR__.'/srkx_data';
 if(!is_dir($dir))@mkdir($dir,0777,true);
 $f=$dir.'/scores.json';
 $fp=fopen($f,'c+');
 if(!$fp)return ['ok'=>false,'err'=>'io'];
 flock($fp,LOCK_EX);
 $raw=stream_get_contents($fp);
 $list=$raw?json_decode($raw,true):[];
 if(!is_array($list))$list=[];
 if($action==='submit'&&$entry){
  $list[]=$entry;
  usort($list,function($a,$b){return $b['score']-$a['score'];});
  $list=array_slice($list,0,200);
  fseek($fp,0);ftruncate($fp,0);fwrite($fp,json_encode($list));
 }
 flock($fp,LOCK_UN);fclose($fp);
 return ['ok'=>true,'source'=>'arquivo (sem MySQL)','list'=>array_slice($list,0,50)];
}

$entry=parseEntry();
$mi=null;
if(function_exists('mysqli_connect')){
 $mi=@mysqli_connect($DB_HOST,$DB_USER,$DB_PASS);
}
if($mi){
 @mysqli_query($mi,"CREATE DATABASE IF NOT EXISTS `$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
 @mysqli_select_db($mi,$DB_NAME);
 @mysqli_query($mi,"CREATE TABLE IF NOT EXISTS scores(
   id INT AUTO_INCREMENT PRIMARY KEY,
   name VARCHAR(32) NOT NULL,
   score INT NOT NULL,
   wave INT NOT NULL,
   cls INT NOT NULL,
   ts INT NOT NULL,
   INDEX idx_score (score)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 if($action==='submit'){
  if(!$entry)out(['ok'=>false,'err'=>'dados inválidos']);
  $st=mysqli_prepare($mi,"INSERT INTO scores(name,score,wave,cls,ts) VALUES(?,?,?,?,?)");
  mysqli_stmt_bind_param($st,'siiii',$entry['name'],$entry['score'],$entry['wave'],$entry['cls'],$entry['ts']);
  mysqli_stmt_execute($st);
  mysqli_stmt_close($st);
  out(['ok'=>true,'source'=>'MySQL']);
 }
 $r=mysqli_query($mi,"SELECT name,score,wave,cls,ts FROM scores ORDER BY score DESC, ts ASC LIMIT 50");
 $list=[];
 if($r)while($row=mysqli_fetch_assoc($r)){
  $row['score']=intval($row['score']);$row['wave']=intval($row['wave']);$row['cls']=intval($row['cls']);$row['ts']=intval($row['ts']);
  $list[]=$row;
 }
 out(['ok'=>true,'source'=>'MySQL','list'=>$list]);
}

// fallback sem MySQL
$r=fileDb($action,$entry);
if($action==='submit')out(['ok'=>isset($r['ok'])?$r['ok']:false,'source'=>'arquivo (sem MySQL)']);
out($r);