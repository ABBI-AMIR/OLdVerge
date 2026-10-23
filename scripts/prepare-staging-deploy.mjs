import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Upload only application sources/assets. Never include env files, Git history,
// local reports, conversation files, database data, or unrelated working files.
const source = process.cwd();
const destination = path.resolve(source, 'scripts/out/staging-deploy');
const files = ['package.json','package-lock.json','vite.config.js','vercel.json','index.html','postcss.config.js','tailwind.config.js','supabase/functions/_shared/http.js'];
async function walk(directory) {
  for (const entry of await fs.readdir(path.join(source,directory),{withFileTypes:true})) {
    if (entry.isSymbolicLink()) throw new Error('Deployment source must not contain symlinks');
    const relative=path.posix.join(directory,entry.name);
    if(entry.isDirectory()) await walk(relative);
    else if(entry.isFile()&&!/\.test\.[jt]sx?$/.test(entry.name)) files.push(relative);
  }
}
for (const directory of ['src','public','server','api']) await walk(directory);
const manifest=[];
for(const file of files) {
  const bytes=await fs.readFile(path.join(source,file));
  if(/\.(?:[cm]?js|jsx|json|css|html|txt)$/.test(file)) {
    const text=bytes.toString('utf8');
    if(/sb_secret_[A-Za-z0-9_-]{24,}|(?:ghp|github_pat)_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/.test(text)) throw new Error('Potential secret in deployment source: '+file);
    for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
      let role; try {role=JSON.parse(Buffer.from(match[1],'base64url').toString()).role;} catch { /* not a JWT */ }
      if(role==='service_role') throw new Error('Privileged token in deployment source: '+file);
    }
  }
  const target=path.join(destination,file);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,bytes);
  manifest.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
// Explicit upload exclusions also protect credentials pulled locally by the CLI.
await fs.writeFile(path.join(destination,'.vercelignore'),'.env*\n.vercel\nnode_modules\ndist\nserver-dist\n');
await fs.writeFile(path.resolve(source,'scripts/out/staging-deploy-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({directory:destination,files:files.length,bytes:manifest.reduce((sum,file)=>sum+file.bytes,0),secretScan:'passed'}));
