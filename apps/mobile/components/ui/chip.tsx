import { Text } from "react-native";
import type { PressableProps } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PressableScale } from "./pressable-scale";

interface ChipProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  selected?: boolean;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
}

export function Chip({ label, selected = false, icon, className, ...props }: ChipProps & { className?: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      scaleTo={0.95}
      className={`flex-row items-center gap-1.5 rounded-md border px-3 py-1.5 ${
        selected ? "border-primary-container bg-white/5" : "border-border-subtle active:bg-white/5"
      } ${className ?? ""}`}
      {...props}
    >
      {icon && <MaterialIcons name={icon} size={16} color={selected ? "#5e6ad2" : "#c6c5d5"} />}
      <Text className={`text-body-sm ${selected ? "text-primary-container" : "text-on-surface-variant"}`}>
        {label}
      </Text>
    </PressableScale>
  );
}
