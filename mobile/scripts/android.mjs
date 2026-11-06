import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
const windows = process.platform === 'win32';
const ejecutable = nombre => windows ? `${nombre}.exe` : nombre;
const localAppData = env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
const sdkPredeterminado = process.platform === 'darwin'
  ? join(homedir(), 'Library', 'Android', 'sdk')
  : windows ? join(localAppData, 'Android', 'Sdk') : join(homedir(), 'Android', 'Sdk');
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || sdkPredeterminado;

if (!existsSync(join(sdk, 'platform-tools', ejecutable('adb')))) {
  console.error('No se encontró el SDK de Android. Instalá Android Studio y configurá ANDROID_HOME con la ruta de su SDK.');
  process.exit(1);
}
env.ANDROID_HOME = sdk;
env.ANDROID_SDK_ROOT = sdk;

// Preferir el JDK de Android Studio si no hay uno configurado explícitamente.
const jdkStudio = windows
  ? [join(env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr'),
    join(localAppData, 'Programs', 'Android Studio', 'jbr')]
  : process.platform === 'darwin'
    ? ['/Applications/Android Studio.app/Contents/jbr/Contents/Home']
    : ['/opt/android-studio/jbr'];
env.JAVA_HOME ||= jdkStudio.find(ruta => existsSync(join(ruta, 'bin', ejecutable('javac'))));
const rutas = [join(sdk, 'emulator'), join(sdk, 'platform-tools')];
if (env.JAVA_HOME) {
  if (!existsSync(join(env.JAVA_HOME, 'bin', ejecutable('javac')))) {
    console.error('JAVA_HOME no apunta a un JDK válido. Revisá la configuración de Java.');
    process.exit(1);
  }
  rutas.unshift(join(env.JAVA_HOME, 'bin'));
}
// Windows trata Path/PATH sin distinguir mayúsculas; enviar una sola clave.
const clavePath = Object.keys(env).find(clave => windows ? clave.toLowerCase() === 'path' : clave === 'PATH') || 'PATH';
env[clavePath] = [...rutas, env[clavePath] || ''].join(delimiter);
if (windows) {
  for (const clave of Object.keys(env)) {
    if (clave.toLowerCase() === 'path' && clave !== clavePath) delete env[clave];
  }
}

const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
const hijo = spawn(process.execPath, [cli, 'run:android', ...process.argv.slice(2)], {
  cwd: mobile, env, stdio: 'inherit',
});
hijo.on('error', error => {
  console.error('No se pudo iniciar Expo para Android:', error.message);
  process.exitCode = 1;
});
hijo.on('exit', codigo => { process.exitCode = codigo ?? 1; });
