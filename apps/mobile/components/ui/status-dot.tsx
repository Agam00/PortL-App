import { View, Text } from "react-native";

type Tone = "neutral" | "green" | "amber" | "red";

const DOT_COLOR: Record<Tone, string> = {
  neutral: "bg-text-muted",
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
};

export function StatusDot({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[tone]}`} />
      <Text className="text-meta-text text-on-surface-variant">{label}</Text>
    </View>
  );
}
