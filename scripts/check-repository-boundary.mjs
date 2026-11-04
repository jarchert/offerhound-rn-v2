// Independent native repository boundary check. See AGENTS.md.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const expected = 'jarchert/offerhound-rn-v2';
const failures = [];
if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== expected) failures.push('Unexpected GitHub repository: ' + process.env.GITHUB_REPOSITORY);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const name of ["expo","react-native"]) if (!deps[name]) failures.push('Missing native dependency: ' + name);
for (const name of ["vite","react-router-dom"]) if (deps[name]) failures.push('Opposite-platform dependency: ' + name);
for (const path of ["index.html","vite.config.ts","src/main.tsx","src/pages"]) if (existsSync(join(root, path))) failures.push('Opposite-platform entry point: ' + path);
if (pkg.workspaces) failures.push('Application monorepos are prohibited');
if (existsSync(join(root, '.gitmodules'))) failures.push('Submodule-based source sharing is prohibited');
for (const [name, value] of Object.entries(deps)) {
  if (/^(?:workspace:|link:|file:)/.test(value)) failures.push('Local/workspace dependency requires removal: ' + name);
}
function scan(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) { failures.push('Source symlink is prohibited: ' + path); continue; }
    if (entry.isDirectory()) {
      if (existsSync(join(path, 'package.json'))) failures.push('Nested source package is prohibited: ' + path);
      scan(path);
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      const source = readFileSync(path, 'utf8');
      for (const name of ["vite","react-router-dom"]) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('(?:from\\s*|import\\s*\\(\\s*|require\\(\\s*)[\\"\\\']' + escaped + '(?:/[^\"\\\']*)?[\\"\\\']').test(source)) failures.push('Opposite-platform import in ' + path + ': ' + name);
      }
    }
  }
}
scan(join(root, 'src'));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('native repository boundary: PASS (' + expected + ')');
