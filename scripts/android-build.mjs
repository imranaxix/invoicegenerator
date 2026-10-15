import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const task = process.argv[2] || 'assembleDebug';
if (!['assembleDebug', 'assembleRelease', 'bundleRelease'].includes(task)) {
  console.error('Allowed tasks: assembleDebug, assembleRelease, bundleRelease');
  process.exit(1);
}
const android = fileURLToPath(new URL('../android/', import.meta.url));
const java = process.env.JAVA_HOME;
const executable = process.platform === 'win32' ? 'java.exe' : 'java';
const javaPath = java ? `${java}/bin/${executable}` : executable;
const probe = spawnSync(javaPath, ['-version'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) {
  console.error('Java is unavailable. Install Android Studio and use its bundled JDK 21. Set JAVA_HOME to its jbr directory and install Android SDK 36 in SDK Manager. See ANDROID.md.');
  process.exit(1);
}
if (!existsSync(`${android}/local.properties`) && !process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  console.error('Android SDK is not configured. Open android/ in Android Studio, or set ANDROID_HOME to your SDK location. See ANDROID.md.');
  process.exit(1);
}
// Windows uses a fixed, repository-owned batch file and an allowlisted task.
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [task], {
  cwd: android, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
