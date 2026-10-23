import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { containsSecret } from './secret-patterns.mjs';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const failures = [];
let scanned = 0;
function scan(file, text) {
  scanned++;
  if (containsSecret(text)) failures.push(file);
}
// Ignored env/CLI/report state is not read. Tracked env files and test fixtures
// are checked; untracked, nonignored source is included before it is staged.
for (const file of new Set(files)) {
  if (existsSync(file)) scan(file, readFileSync(file, 'utf8'));
}
function buildFiles(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) buildFiles(file);
    else if (entry.isFile() && /\.(?:[cm]?js|jsx|json|css|html|map|txt)$/.test(file)) scan(file, readFileSync(file, 'utf8'));
  }
}
for (const directory of ['dist', 'server-dist']) buildFiles(directory);
if (process.argv.includes('--history')) {
  // Every reachable text blob, not only the latest version; no remote fetch.
  const seen = new Set();
  for (const entry of git(['rev-list', '--objects', '--all']).trim().split('\n')) {
    const space = entry.indexOf(' ');
    if (space < 0) continue;
    const sha = entry.slice(0, space); const file = entry.slice(space + 1);
    if (seen.has(sha) || !/(?:\.(?:[cm]?js|jsx|tsx?|json|css|html|md|txt|ya?ml|sql|toml|sh|pem|key)|(?:^|\/)\.env[^/]*)$/.test(file)) continue;
    seen.add(sha);
    scan(`history:${sha.slice(0, 12)}:${file}`, git(['cat-file', 'blob', sha]));
  }
}
if (failures.length) {
  console.error('Potential secrets (locations only):\n' + failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Secret pattern scan passed (${scanned} source/build${process.argv.includes('--history') ? '/reachable-history' : ''} files). Arbitrary credentials may not match these patterns.`);
