import { spawnSync } from 'child_process';
import { validateCommand } from './validate.js';

export async function buildCommand() {
  const tsc = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['tsc'];
  const res = spawnSync(tsc, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
  await validateCommand();
}

