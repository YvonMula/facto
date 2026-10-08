import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Segmented } from '../../src/components/ui';

/** Alerts (4th slot): urgent public-safety alerts and updates on the user's own cases. Local only, no push (PRD 5.5). */
export default function AlertsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  return (
    <Screen title={t('alerts.title')}>
      <Segmented
        options={[
          { key: 'all', label: t('alerts.all') },
          { key: 'unread', label: t('alerts.unread') },
        ]}
        value={tab}
        onChange={setTab}
      />
      <EmptyState icon="notifications-off-outline" title={t('alerts.empty.title')} body={t('alerts.empty.body')} />
    </Screen>
  );
}
