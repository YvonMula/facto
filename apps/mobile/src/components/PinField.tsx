import { StyleSheet, TextInput } from 'react-native';
import { radius, space, useTheme } from '../theme';

/** Numeric PIN input. Never autofilled, never suggested, never shown. */
export function PinField({ label, value, onChange, onSubmit }: { label: string; value: string; onChange(v: string): void; onSubmit?(): void }) {
  const t = useTheme();
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={t.textMuted}
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
      onSubmitEditing={onSubmit}
      keyboardType="number-pad"
      secureTextEntry
      maxLength={12}
      autoComplete="off"
      autoCorrect={false}
      importantForAutofill="no"
      textContentType="none"
      style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.border }]}
    />
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.md, fontSize: 20, letterSpacing: 6 },
});
