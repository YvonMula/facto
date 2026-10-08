import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../src/components/ui';
import { LANGUAGES } from '../../src/i18n';
import { radius, space, type, useTheme } from '../../src/theme';

/** PRD 4.1 step 1. */
export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={{ gap: space.sm }}>
        <Text accessibilityRole="header" style={[type.title, { color: theme.text }]}>{t('language.title')}</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>{t('language.subtitle')}</Text>
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
        {LANGUAGES.map((lng) => {
          const selected = i18n.language === lng;
          return (
            <Pressable
              key={lng}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => void i18n.changeLanguage(lng)}
              style={[styles.option, { backgroundColor: theme.surface, borderColor: selected ? theme.accent : theme.border }]}
            >
              <Text style={[type.heading, { color: theme.text }]}>{t(`language.${lng}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <PillButton label={t('safety.next')} onPress={() => router.push('/onboarding/safety')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg, justifyContent: 'space-between' },
  option: { minHeight: 64, borderRadius: radius.md, borderWidth: 2, justifyContent: 'center', paddingHorizontal: space.lg },
});
