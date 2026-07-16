import { View } from "react-native";
import type { ViewProps } from "react-native";
import { shadowCard } from "../../lib/shadows";

export function Card({ className, style, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-card bg-surface p-5 ${className ?? ""}`}
      style={[shadowCard, style]}
      {...props}
    />
  );
}
