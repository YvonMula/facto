import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { EmptyState, Screen, Segmented } from '../../src/components/ui';
import { radius, space, useTheme } from '../../src/theme';

/** Search (PRD 4.2, 9.1): search field, filter button, Feed / Map segments. Map shows areas only (PRD 9.5). */
export default function SearchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [mode, setMode] = useState<'feed' | 'map'>('feed');
  return (
    <Screen title={t('search.title')}>
      <View style={styles.row}>
        <View style={[styles.field, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            accessibilityLabel={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text }]}
            autoCorrect={false}
            // Keep queries out of the keyboard's learning and suggestion history.
            autoComplete="off"
            keyboardType="default"
            importantForAutofill="no"
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('search.filter')} style={[styles.filter, { backgroundColor: theme.surface }]}>
          <Ionicons name="options-outline" size={20} color={theme.text} />
        </Pressable>
      </View>
      <Segmented
        options={[
          { key: 'feed', label: t('search.feed') },
          { key: 'map', label: t('search.map') },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'feed' ? (
        <EmptyState icon="search-outline" title={t('search.empty.title')} body={t('search.empty.body')} />
      ) : (
        <EmptyState icon="map-outline" title={t('search.mapEmpty.title')} body={t('search.mapEmpty.body')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 48 },
  input: { flex: 1, fontSize: 16 },
  filter: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
