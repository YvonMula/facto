import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { radius, space, type, useTheme } from '../theme';
import { runNativeSelfTest } from './native-entry';
import { summarise, type SelfTestResult } from './run';

/**
 * Shown instead of the app in self-test builds only (EXPO_PUBLIC_FACTO_SELFTEST=1), so results can be
 * read on an emulator such as BlueStacks without adb. Never part of a normal build.
 */
export default function SelfTestScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [result, setResult] = useState<SelfTestResult | null>(null);
  const [crash, setCrash] = useState<string | null>(null);

  useEffect(() => {
    runNativeSelfTest().then(setResult, (e: unknown) => setCrash(e instanceof Error ? e.message : String(e)));
  }, []);

  const s = result ? summarise(result) : null;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={{ gap: space.md }}>
          <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t('selftest.title')}</Text>
          {!s && !crash ? <Text style={[type.body, { color: theme.textMuted }]}>{t('selftest.running')}</Text> : null}
          {crash ? <Text style={[type.body, { color: theme.danger }]}>{t('selftest.crashed', { detail: crash })}</Text> : null}
          {s ? (
            <>
              <View style={[styles.banner, { backgroundColor: s.ok ? theme.accent : theme.danger }]}>
                <Text style={[type.heading, { color: theme.onAccent }]}>{s.ok ? t('selftest.allPass') : t('selftest.someFail', { count: s.failed })}</Text>
              </View>
              {s.lines.map((l) => (
                <View key={l.name} style={[styles.row, { backgroundColor: theme.surface }]}>
                  <Text style={[type.label, { color: l.ok ? theme.accent : theme.danger }]}>{l.ok ? t('selftest.pass') : t('selftest.fail')}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { color: theme.text }]}>{l.name}</Text>
                    {l.detail ? <Text style={[type.label, { color: theme.textMuted }]}>{l.detail}</Text> : null}
                  </View>
                </View>
              ))}
              {s.argon2idMs !== undefined ? (
                <Text style={[type.body, { color: theme.text }]}>{t('selftest.argon2', { ms: s.argon2idMs })}</Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg },
  banner: { borderRadius: radius.md, padding: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', borderRadius: radius.md, padding: space.md },
});
