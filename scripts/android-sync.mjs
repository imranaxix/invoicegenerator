import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const commands = [
  ['node_modules/typescript/bin/tsc', ['-b']],
  ['node_modules/vite/bin/vite.js', ['build']],
  ['node_modules/@capacitor/cli/bin/capacitor', ['sync', 'android']],
];
if (process.argv.includes('--run')) commands.push(['node_modules/@capacitor/cli/bin/capacitor', ['run', 'android']]);
for (const [file, args] of commands) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`../${file}`, import.meta.url)), ...args], { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
