/**
 * Facto color tokens (PRD 9.3). Dark is the default theme; the accent is used sparingly
 * (primary buttons, the + pill, the active tab, positive scores), never as a large background.
 */
export const palette = {
  dark: {
    background: '#030F08',
    surface: '#0A1A11',
    surfaceRaised: '#11241A',
    border: '#1C3326',
    text: '#EAF5EE',
    textMuted: '#9DB5A6',
    accent: '#00FF9D',
    onAccent: '#030F08',
    danger: '#FF6B6B',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F3F6F4',
    surfaceRaised: '#E7EDE9',
    border: '#D5DFD9',
    text: '#0B1A12',
    textMuted: '#4F6357',
    // Accent darkened for contrast on white (WCAG 2.1 AA for text and controls).
    accent: '#00804F',
    onAccent: '#FFFFFF',
    danger: '#B42318',
  },
} as const;

/** Content-type hues, color-blind safe (Okabe–Ito), always shown with a text label. */
export const contentTypeColors = {
  whistleblowing: '#E69F00',
  community: '#56B4E9',
  news: '#CC79A7',
} as const;

export type Theme = { [K in keyof (typeof palette)['dark']]: string };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const type = {
  title: { fontSize: 28, fontWeight: '800' as const },
  heading: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '600' as const },
};
