import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '../../src/components/ui';

/** Create case (PRD 4.3). Phase 3 builds the two-step flow; the shell shows what is coming. */
export default function CreateScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('create.title')}>
      <EmptyState icon="create-outline" title={t('create.empty.title')} body={t('create.empty.body')} />
    </Screen>
  );
}
