import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { radius, space, type, useTheme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Full-width dark pill with an arrow, as in the reference layout (PRD 9.1). */
export function PillButton({ label, onPress, style }: { label: string; onPress(): void; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }, style]}
    >
      <Text style={[type.label, styles.pillLabel, { color: t.onAccent }]}>{label}</Text>
      <View style={[styles.pillArrow, { backgroundColor: t.onAccent }]}>
        <Ionicons name="arrow-forward" size={16} color={t.accent} />
      </View>
    </Pressable>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: t.surfaceRaised }]}>
        <Ionicons name={icon} size={28} color={t.textMuted} />
      </View>
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: t.textMuted, textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}

/** Segmented control ("All / Unread", "Feed / Map"). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: NoInfer<K>; label: string }[]; value: K; onChange(k: NoInfer<K>): void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: t.surface }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active && { backgroundColor: t.surfaceRaised }]}
          >
            <Text style={[type.label, { color: active ? t.text : t.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, color, selected, onPress }: { label: string; color?: string; selected?: boolean; onPress?(): void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? t.text : t.border, backgroundColor: selected ? t.surfaceRaised : 'transparent' }]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[type.label, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Screen({ title, subtitle, children, right }: { title: ReactNode; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {typeof title === 'string' ? <Text accessibilityRole="header" style={[type.title, { color: t.text }]}>{title}</Text> : title}
          {subtitle ? <Text style={[type.label, { color: t.textMuted, marginTop: space.xs }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minHeight: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  pillLabel: { fontSize: 16, flex: 1, textAlign: 'center' },
  pillArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: space.xs },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  screen: { flex: 1, paddingHorizontal: space.md, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.md },
});
