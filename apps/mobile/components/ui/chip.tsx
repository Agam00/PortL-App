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
      className={`flex-row items-center gap-1.5 rounded-full border-2 px-4 py-2 ${
        selected ? "border-primary-container bg-primary-container" : "border-outline-variant bg-surface active:bg-surface-container"
      } ${className ?? ""}`}
      {...props}
    >
      {icon && <MaterialIcons name={icon} size={16} color={selected ? "#fff" : "#48454F"} />}
      <Text className={`text-body-sm font-bold ${selected ? "text-white" : "text-on-surface-variant"}`}>
        {label}
      </Text>
    </PressableScale>
  );
}
