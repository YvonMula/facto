import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Chip, EmptyState, Screen } from '../../src/components/ui';
import { useSession } from '../../src/state/session';
import { contentTypeColors, space, type, useTheme } from '../../src/theme';

type ContentType = keyof typeof contentTypeColors;
const TYPES: ContentType[] = ['whistleblowing', 'community', 'news'];

/** Home feed (PRD 4.2). Category chips replace the reference's stories row (PRD 9.2). */
export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { wipe } = useSession();
  const [filter, setFilter] = useState<ContentType | null>(null);

  // Long-press on the logo asks, then runs the panic wipe (PRD 4.8, ADR 0009). Cancel is the default.
  const confirmWipe = () =>
    Alert.alert(t('wipe.title'), t('wipe.body'), [
      { text: t('wipe.cancel'), style: 'cancel' },
      { text: t('wipe.confirm'), style: 'destructive', onPress: () => void wipe() },
    ]);

  const logo = (
    <Pressable accessibilityRole="header" onLongPress={confirmWipe} delayLongPress={800}>
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
