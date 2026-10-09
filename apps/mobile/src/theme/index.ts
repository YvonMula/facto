import { useColorScheme } from 'react-native';
import { palette, type Theme } from './tokens';

export * from './tokens';

/** Dark by default (PRD 9.3); light follows the system setting until Settings exists. */
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? palette.light : palette.dark;
}
