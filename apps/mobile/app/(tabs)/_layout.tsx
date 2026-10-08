import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '../../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName, active: IconName) => ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={focused ? active : name} size={24} color={color} />
);

/** Five slots with a central "+" pill (PRD 9.1): Home · Search · + · Alerts · My activity. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background, paddingTop: insets.top },
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border, height: 64 + insets.bottom, paddingTop: 8 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarAccessibilityLabel: t('tabs.home'), tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search'), tabBarAccessibilityLabel: t('tabs.search'), tabBarIcon: icon('search-outline', 'search') }} />
      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          tabBarButton: () => (
            <View style={styles.plusSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tabs.create')}
                onPress={() => router.navigate('/(tabs)/create')}
                style={[styles.plus, { backgroundColor: theme.accent }]}
              >
                <Ionicons name="add" size={28} color={theme.onAccent} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="alerts" options={{ title: t('tabs.alerts'), tabBarAccessibilityLabel: t('tabs.alerts'), tabBarIcon: icon('notifications-outline', 'notifications') }} />
      <Tabs.Screen name="activity" options={{ title: t('tabs.activity'), tabBarAccessibilityLabel: t('tabs.activity'), tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 56, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
