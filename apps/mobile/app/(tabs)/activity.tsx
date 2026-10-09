import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { EmptyState, Screen, Segmented } from '../../src/components/ui';
import { radius, space, type, useTheme } from '../../src/theme';

/** My activity (PRD 9.2): replaces the profile tab; a local-only list of own cases, drafts and saved posts. */
export default function ActivityScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'cases' | 'drafts' | 'saved'>('cases');
  const router = useRouter();
  const theme = useTheme();
  return (
    <Screen title={t('activity.title')} subtitle={t('activity.subtitle')}>
      <Segmented
        options={[
          { key: 'cases', label: t('activity.cases') },
          { key: 'drafts', label: t('activity.drafts') },
          { key: 'saved', label: t('activity.saved') },
        ]}
        value={tab}
        onChange={setTab}
      />
      <EmptyState icon="lock-closed-outline" title={t('activity.empty.title')} body={t('activity.empty.body')} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recovery/restore')}
        style={{ minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginBottom: space.md }}
      >
        <Text style={[type.label, { color: theme.text }]}>{t('recovery.restoreLink')}</Text>
      </Pressable>
    </Screen>
  );
}
