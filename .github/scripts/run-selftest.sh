#!/usr/bin/env bash
# Installs the self-test build on the running emulator, launches it, and waits for the one
# FACTO_SELFTEST line. Fails unless every check passed. Output contains no secrets.
set -euo pipefail

APK="$1"
PACKAGE="app.facto.mobile"
TIMEOUT_S="${SELFTEST_TIMEOUT_S:-300}"
OUT="selftest-logcat.txt"

adb wait-for-device
adb install -r "$APK"
adb logcat -c
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null

line=""
for _ in $(seq 1 "$TIMEOUT_S"); do
  line="$(adb logcat -d -s ReactNativeJS:V | grep -m1 'FACTO_SELFTEST ' || true)"
  [ -n "$line" ] && break
  sleep 1
done

adb logcat -d -s ReactNativeJS:V AndroidRuntime:E > "$OUT" || true

if [ -z "$line" ]; then
  echo "No FACTO_SELFTEST line within ${TIMEOUT_S}s. Last log lines:"
  tail -n 80 "$OUT"
  exit 1
fi

json="${line#*FACTO_SELFTEST }"
echo "$json" > selftest-result.json
node -e '
  const r = JSON.parse(require("fs").readFileSync("selftest-result.json", "utf8"));
  for (const c of r.checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? "  " + c.detail : ""}`);
  console.log(`Argon2id INTERACTIVE wrap: ${r.argon2idMs} ms`);
  process.exit(r.ok ? 0 : 1);
'
