import { View, Text } from "react-native";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const classes = TONE_STYLES[tone];
  const [bg, text] = classes.split(" ");

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
