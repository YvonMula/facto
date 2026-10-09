import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinField } from '../../src/components/PinField';
import { PillButton } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { space, type, useTheme } from '../../src/theme';

const VALID = /^[0-9]{6,12}$/;

/** PRD 4.1 step 3: optional app PIN, with an optional duress PIN (PRD 4.8). */
export default function PinScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setPin, finishOnboarding } = useSession();
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [withDuress, setWithDuress] = useState(false);
  const [duress, setDuress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!VALID.test(pin) || (withDuress && !VALID.test(duress))) return setError(t('pin.errors.format'));
    if (pin !== confirm) return setError(t('pin.errors.mismatch'));
    if (withDuress && duress === pin) return setError(t('pin.errors.sameAsPin'));
    setBusy(true);
    try {
      await setPin(pin, withDuress ? duress : null);
      await finishOnboarding();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t('pin.title')}</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>{t('pin.body')}</Text>
        <PinField label={t('pin.enter')} value={pin} onChange={setPinValue} />
        <PinField label={t('pin.confirm')} value={confirm} onChange={setConfirm} />
        <View style={styles.row}>
          <Text style={[type.label, { color: theme.text, flex: 1 }]}>{t('pin.duressToggle')}</Text>
          <Switch accessibilityLabel={t('pin.duressToggle')} value={withDuress} onValueChange={setWithDuress} trackColor={{ true: theme.accent }} />
        </View>
        {withDuress ? (
          <>
            <Text style={[type.body, { color: theme.textMuted }]}>{t('pin.duressBody')}</Text>
            <PinField label={t('pin.duressEnter')} value={duress} onChange={setDuress} />
          </>
        ) : null}
        {error ? <Text accessibilityLiveRegion="polite" style={[type.label, { color: theme.danger }]}>{error}</Text> : null}
      </ScrollView>
      <View style={{ gap: space.sm }}>
        <PillButton label={t('pin.save')} onPress={save} />
        <Pressable accessibilityRole="button" onPress={() => void finishOnboarding()} style={styles.skip}>
          <Text style={[type.label, { color: theme.textMuted }]}>{t('pin.skip')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
