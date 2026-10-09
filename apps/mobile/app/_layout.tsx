import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/state/session';
import { space, type, useTheme } from '../src/theme';

function RootStack() {
  const { phase } = useSession();
  const { t } = useTranslation();
  const theme = useTheme();

  if (phase.name === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (phase.name === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, backgroundColor: theme.background }}>
        <Text style={[type.body, { color: theme.text, textAlign: 'center' }]}>{t('error.storage')}</Text>
      </View>
    );
  }

  const locked = phase.name === 'locked';
  const onboarding = phase.name === 'ready' && !phase.onboardingDone;
  const ready = phase.name === 'ready' && phase.onboardingDone;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Protected guard={locked}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={onboarding}>
        <Stack.Screen name="onboarding/language" />
        <Stack.Screen name="onboarding/safety" />
        <Stack.Screen name="onboarding/pin" />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recovery/restore" />
        <Stack.Screen name="recovery/show" />
      </Stack.Protected>
    </Stack>
  );
}

// Device self-test builds (EXPO_PUBLIC_FACTO_SELFTEST=1, for CI and emulator checks) show only the
// self-test screen. The variable is inlined at build time, so normal builds drop this code entirely.
const SelfTestScreen: (() => React.JSX.Element) | null =
  process.env.EXPO_PUBLIC_FACTO_SELFTEST === '1' ? require('../src/selftest/SelfTestScreen').default : null;

export default function RootLayout() {
  if (SelfTestScreen) return <SelfTestScreen />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
