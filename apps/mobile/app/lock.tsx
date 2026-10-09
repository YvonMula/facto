import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinField } from '../src/components/PinField';
import { PillButton } from '../src/components/ui';
import { useSession } from '../src/state/session';
import { space, type, useTheme } from '../src/theme';

/**
 * Lock screen (PRD 7.2). The duress PIN is accepted like the real one: the app wipes itself
 * and opens empty, with nothing on screen that tells the two apart.
 */
export default function LockScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { unlock } = useSession();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async () => {
    if (busy || pin.length < 6) return;
    setBusy(true);
    setWrong(false);
    const r = await unlock(pin).catch(() => 'wrong' as const);
    setPin('');
    setBusy(false);
    if (r === 'wrong') setWrong(true);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={{ gap: space.md }}>
        <Text style={[type.title, { color: theme.text }]}>
          Facto<Text style={{ color: theme.accent }}>.</Text>
        </Text>
        <Text accessibilityRole="header" style={[type.heading, { color: theme.text }]}>{t('lock.title')}</Text>
        <PinField label={t('pin.enter')} value={pin} onChange={setPin} onSubmit={submit} />
        {wrong ? <Text accessibilityLiveRegion="polite" style={[type.label, { color: theme.danger }]}>{t('lock.wrong')}</Text> : null}
      </View>
      <PillButton label={busy ? t('lock.working') : t('lock.unlock')} onPress={submit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, justifyContent: 'space-between' },
});
