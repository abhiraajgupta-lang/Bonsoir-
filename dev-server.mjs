import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const nodeBinDir = dirname(process.execPath);
const currentPath = process.env.PATH || '';
process.env.PATH = `${nodeBinDir}:${currentPath}`;

const nextBin = join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', '--port', '3000', '--webpack'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env },
});
child.on('exit', (code) => process.exit(code));
