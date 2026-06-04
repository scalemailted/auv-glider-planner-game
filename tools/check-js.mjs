import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function* walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())yield* walk(path);else if(path.endsWith('.js'))yield path;}}
let failed=false;for(const file of walk('src')){const res=spawnSync('node',['--check',file],{stdio:'inherit'});if(res.status!==0)failed=true;}process.exit(failed?1:0);
