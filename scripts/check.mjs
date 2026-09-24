import fs from 'node:fs';
import vm from 'node:vm';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
let errors=0;
for(const path of walk('src').filter(f=>f.endsWith('.js'))){
 try{new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{identifier:path});}catch(e){console.error(path,e.message);errors++;}
}
console.log(errors ? `${errors} arquivos com erro de sintaxe` : 'Todos os módulos têm sintaxe válida');
process.exitCode=errors?1:0;
