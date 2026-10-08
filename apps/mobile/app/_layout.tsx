import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider, useOnboarding } from '../src/state/onboarding';
import { useTheme } from '../src/theme';

function RootStack() {
  const { done } = useOnboarding();
  const t = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.background } }}>
      <Stack.Protected guard={!done}>
        <Stack.Screen name="onboarding/language" />
        <Stack.Screen name="onboarding/safety" />
      </Stack.Protected>
      <Stack.Protected guard={done}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <StatusBar style="auto" />
        <RootStack />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}
