import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const api = process.env.EXPO_PUBLIC_WEB_API_URL?.trim() || 'http://localhost:3000';
const env = { ...process.env, EXPO_PUBLIC_API_URL: api,
  EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WEB_WS_URL?.trim() || api };
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
const hijo = spawn(process.execPath, [cli, 'start', '--web', '--port', '8081', ...process.argv.slice(2)], {
  cwd: mobile, env, stdio: 'inherit',
});
hijo.on('error', error => { console.error('No se pudo iniciar la web:', error.message); process.exitCode = 1; });
hijo.on('exit', codigo => { process.exitCode = codigo ?? 1; });
