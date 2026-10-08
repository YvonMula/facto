import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../src/components/ui';
import { useOnboarding } from '../../src/state/onboarding';
import { space, type, useTheme } from '../../src/theme';

/** PRD 4.1 step 2: what Facto protects, what it cannot protect, and the panic wipe. */
const PAGES: { key: 'protects' | 'limits' | 'panic'; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'protects', icon: 'eye-off-outline' },
  { key: 'limits', icon: 'alert-circle-outline' },
  { key: 'panic', icon: 'flash-outline' },
];

export default function SafetyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { finish } = useOnboarding();
  const [index, setIndex] = useState(0);
  const page = PAGES[index]!;
  const last = index === PAGES.length - 1;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <Text style={[type.label, { color: theme.textMuted }]}>{t('safety.step', { current: index + 1, total: PAGES.length })}</Text>
      <View style={styles.body}>
        <Ionicons name={page.icon} size={48} color={theme.accent} />
        <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t(`safety.${page.key}.title`)}</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>{t(`safety.${page.key}.body`)}</Text>
      </View>
      <PillButton label={last ? t('safety.start') : t('safety.next')} onPress={() => (last ? finish() : setIndex(index + 1))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg },
  body: { flex: 1, justifyContent: 'center', gap: space.md },
});
