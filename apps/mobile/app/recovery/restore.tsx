import type { RecoveryError } from '@facto/crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { radius, space, type, useTheme } from '../../src/theme';

/** Restore one case from its recovery code (PRD 4.7, ADR 0010). */
export default function RestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { restoreCase } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<RecoveryError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await restoreCase(code);
      if (r.ok) {
        setCode('');
        setDone(true);
      } else setError(r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t('recovery.restoreTitle')}</Text>
        {done ? (
          <Text accessibilityLiveRegion="polite" style={[type.body, { color: theme.text }]}>{t('recovery.restored')}</Text>
        ) : (
          <>
            <Text style={[type.body, { color: theme.textMuted }]}>{t('recovery.restoreBody')}</Text>
            <TextInput
              accessibilityLabel={t('recovery.codeLabel')}
              placeholder={t('recovery.codeLabel')}
              placeholderTextColor={theme.textMuted}
              value={code}
              onChangeText={setCode}
              multiline
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              spellCheck={false}
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            />
            {error ? <Text accessibilityLiveRegion="polite" style={[type.label, { color: theme.danger }]}>{t(`recovery.errors.${error}`)}</Text> : null}
          </>
        )}
      </ScrollView>
      <PillButton label={done ? t('recovery.done') : t('recovery.restore')} onPress={done ? () => router.back() : submit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md },
  input: { minHeight: 120, borderRadius: radius.md, borderWidth: 1, padding: space.md, fontSize: 18, fontFamily: 'monospace', letterSpacing: 1, textAlignVertical: 'top' },
});
