import { Redirect } from 'expo-router';
import { useSession } from '../src/state/session';

export default function Index() {
  const { phase } = useSession();
  if (phase.name === 'locked') return <Redirect href="/lock" />;
  if (phase.name === 'ready' && !phase.onboardingDone) return <Redirect href="/onboarding/language" />;
  return <Redirect href="/(tabs)/home" />;
}
