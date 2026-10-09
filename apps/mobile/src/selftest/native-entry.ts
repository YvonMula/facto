import { backend, keyStore, makeDbFiles } from '../secure/native';
import { formatResult, runSelfTest } from './run';

/** Runs the device self-test once and logs one line for CI (adb logcat). */
export async function runNativeSelfTest(): Promise<void> {
  const result = await runSelfTest({ backend, keyStore, files: makeDbFiles('facto-selftest.db'), now: () => performance.now() });
  console.log(formatResult(result));
}
