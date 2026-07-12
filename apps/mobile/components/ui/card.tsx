import { View } from "react-native";
import type { ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-lg border border-border-subtle bg-surface-elevated p-4 ${className ?? ""}`}
      {...props}
    />
  );
}
