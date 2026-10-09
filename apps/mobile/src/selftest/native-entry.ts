import { backend, keyStore, makeDbFiles } from '../secure/native';
import { formatResult, runSelfTest, type SelfTestResult } from './run';

/** Runs the device self-test once, logs one line for CI (adb logcat) and returns the result for the screen. */
export async function runNativeSelfTest(): Promise<SelfTestResult> {
  const result = await runSelfTest({ backend, keyStore, files: makeDbFiles('facto-selftest.db'), now: () => performance.now() });
  console.log(formatResult(result));
  return result;
}
