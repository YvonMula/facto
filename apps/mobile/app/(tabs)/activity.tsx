import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Segmented } from '../../src/components/ui';

/** My activity (PRD 9.2): replaces the profile tab; a local-only list of own cases, drafts and saved posts. */
export default function ActivityScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'cases' | 'drafts' | 'saved'>('cases');
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
    </Screen>
  );
}
