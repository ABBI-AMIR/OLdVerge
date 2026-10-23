// Builds a disposable, loopback-only reference database. Never connects to hosted Supabase.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { readManifest } from './schema-manifest.mjs';

const root = new URL('../', import.meta.url);
const out = new URL('scripts/out/', root);
await fs.mkdir(out, { recursive:true });
const directory = await fs.mkdtemp(path.join(os.tmpdir(),'oldverge-schema-'));
const port = await new Promise((resolve,reject) => {
  const listener=net.createServer();
  listener.on('error',reject);
  listener.listen(0,'127.0.0.1',()=>{const {port}=listener.address();listener.close(()=>resolve(port));});
});
const server = new EmbeddedPostgres({ databaseDir:directory,user:'postgres',password:'postgres',port,persistent:false,
  postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:()=>{} });
let client;
try {
  await server.initialise(); await server.start();
  client=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres'});
  await client.connect();
  await client.query(await fs.readFile(new URL('supabase/tests/support/shim.sql',root),'utf8'));
  const names=(await fs.readdir(new URL('supabase/migrations/',root))).filter(n=>n.endsWith('.sql')).sort();
  const sources=[];
  for(const name of names){
    const sql=await fs.readFile(new URL(`supabase/migrations/${name}`,root),'utf8');
    await client.query(sql);
    sources.push({name,sha256:createHash('sha256').update(sql.replaceAll('\r\n','\n')).digest('hex')});
  }
  const manifest=await readManifest(client);
  await fs.writeFile(new URL('schema-reference.json',out),JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(new URL('schema-migration-sources.json',out),JSON.stringify(sources,null,2)+'\n');
  console.log(`Reference: ${names.length} migrations, ${manifest.length} schema/permission entries; disposable local DB only.`);
} finally {
  await client?.end();
  await server.stop();
  await fs.rm(directory,{recursive:true,force:true});
}
