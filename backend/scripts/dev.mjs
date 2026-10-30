// Development runner: TypeScript 7 recompiles src/ into dist/ on change while
// `node --watch` restarts the app whenever dist/ changes. If either process
// exits, the other is stopped too, so no orphaned watcher is left behind.
// Usage: node scripts/dev.mjs [--inspect]   (expects an initial `npm run build`)
import { spawn } from 'node:child_process';

const nodeFlags = process.argv.includes('--inspect') ? ['--inspect'] : [];

const children = [
  spawn(
    'tsc',
    ['-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
    { stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [...nodeFlags, '--watch', '--enable-source-maps', 'dist/main.js'],
    { stdio: 'inherit' },
  ),
];

let stopping = false;

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (stopping) return;
    stopping = true;
    for (const other of children) {
      if (other !== child) other.kill('SIGTERM');
    }
    process.exitCode = code ?? (signal === 'SIGINT' ? 0 : 1);
  });
}

// Ctrl-C reaches the children directly via the process group; forward other
// termination signals explicitly.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => {
  for (const child of children) child.kill('SIGTERM');
});
