import type { PressableProps } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PressableScale } from "./pressable-scale";

interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  color?: string;
  size?: number;
  accessibilityLabel: string;
}

/** Small icon-only action button (edit/delete/etc.) used throughout list rows — same tap target and hitSlop everywhere. */
export function IconButton({ icon, color = "#8A8F98", size = 18, className, ...props }: IconButtonProps) {
  return (
    <PressableScale hitSlop={8} scaleTo={0.9} className={`p-1 ${className ?? ""}`} accessibilityRole="button" {...props}>
      <MaterialIcons name={icon} size={size} color={color} />
    </PressableScale>
  );
}
