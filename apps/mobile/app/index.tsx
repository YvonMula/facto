import { Redirect } from 'expo-router';
import { useOnboarding } from '../src/state/onboarding';

export default function Index() {
  const { done } = useOnboarding();
  return <Redirect href={done ? '/(tabs)/home' : '/onboarding/language'} />;
}
