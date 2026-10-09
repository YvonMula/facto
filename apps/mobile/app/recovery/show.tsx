import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { radius, space, type, useTheme } from '../../src/theme';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Shows one case's recovery code (PRD 4.7). Linked from the case screens in Phase 3.
 * No copy button: nothing goes to the shared clipboard (PRD 7.2). The text is not selectable.
 */
export default function ShowCodeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { recoveryCode } = useSession();
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof caseId === 'string' && UUID.test(caseId)) void recoveryCode(caseId).then(setCode);
    return () => setCode(null);
  }, [caseId, recoveryCode]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ gap: space.md }}>
        <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t('recovery.showTitle')}</Text>
        <View style={[styles.warning, { borderColor: theme.danger }]}>
          <Text style={[type.body, { color: theme.text }]}>{t('recovery.showWarning')}</Text>
        </View>
        {code ? (
          <Text selectable={false} style={[styles.code, { color: theme.text, backgroundColor: theme.surface }]}>
            {code.split('-').join('  ')}
          </Text>
        ) : null}
        <Text style={[type.label, { color: theme.textMuted }]}>{t('recovery.showBody')}</Text>
      </ScrollView>
      <PillButton label={t('recovery.done')} onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md },
  warning: { borderWidth: 1, borderRadius: radius.md, padding: space.md },
  code: { fontFamily: 'monospace', fontSize: 20, lineHeight: 34, letterSpacing: 2, padding: space.md, borderRadius: radius.md },
});
