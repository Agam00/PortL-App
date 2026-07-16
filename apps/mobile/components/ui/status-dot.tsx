import { View, Text } from "react-native";

type Tone = "neutral" | "green" | "amber" | "red";

const PILL_STYLE: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: "bg-outline-variant", text: "text-on-surface-variant" },
  green: { bg: "bg-status-green", text: "text-white" },
  amber: { bg: "bg-status-amber", text: "text-on-surface" },
  red: { bg: "bg-status-red", text: "text-white" },
};

/** A bold, fully-saturated status pill — replaces the old system's small status dot. Same
 * component name kept for import stability across the app; the rendering changed entirely. */
export function StatusDot({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const style = PILL_STYLE[tone];
  return (
    <View className={`rounded-full px-3 py-1 ${style.bg}`}>
      <Text className={`text-label-caps uppercase tracking-wide ${style.text}`}>{label}</Text>
    </View>
  );
}
