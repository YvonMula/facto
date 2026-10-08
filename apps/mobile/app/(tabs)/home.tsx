import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Chip, EmptyState, Screen } from '../../src/components/ui';
import { useOnboarding } from '../../src/state/onboarding';
import { contentTypeColors, space, type, useTheme } from '../../src/theme';

type ContentType = keyof typeof contentTypeColors;
const TYPES: ContentType[] = ['whistleblowing', 'community', 'news'];

/** Home feed (PRD 4.2). Category chips replace the reference's stories row (PRD 9.2). */
export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { wipe } = useOnboarding();
  const [filter, setFilter] = useState<ContentType | null>(null);

  // Long-press on the logo triggers the panic wipe (PRD 4.8). No confirmation by design.
  const logo = (
    <Pressable accessibilityRole="header" onLongPress={wipe} delayLongPress={800}>
      <Text style={[type.title, { color: theme.text }]}>
        {t('home.title')}
        <Text style={{ color: theme.accent }}>.</Text>
      </Text>
    </Pressable>
  );

  return (
    <Screen title={logo}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {TYPES.map((k) => (
            <Chip
              key={k}
              label={t(`home.chips.${k}`)}
              color={contentTypeColors[k]}
              selected={filter === k}
              onPress={() => setFilter(filter === k ? null : k)}
            />
          ))}
        </ScrollView>
      </View>
      <EmptyState icon="newspaper-outline" title={t('home.empty.title')} body={t('home.empty.body')} />
    </Screen>
  );
}
