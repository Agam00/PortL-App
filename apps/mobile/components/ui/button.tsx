import { Text, ActivityIndicator } from "react-native";
import type { PressableProps } from "react-native";
import { PressableScale } from "./pressable-scale";
import { shadowCard } from "../../lib/shadows";

type Variant = "primary" | "secondary" | "outline" | "danger" | "success";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: string;
  variant?: Variant;
  loading?: boolean;
}

// NOTE: primary uses a solid bg-primary-container instead of the designed violet gradient.
// expo-linear-gradient is a native module not yet linked into the installed dev-client APK
// (would need a fresh EAS build first) — using it now would crash every screen with a
// primary button. Swap to LinearGradient once a native rebuild happens; see DESIGN_SYSTEM.md.
const VARIANT_STYLES: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-primary-container active:bg-inverse-primary", text: "text-white" },
  secondary: {
    container: "bg-surface-container border border-outline-variant active:bg-surface-container-high",
    text: "text-on-surface",
  },
  outline: {
    container: "bg-transparent border-2 border-primary-container active:bg-surface-container",
    text: "text-primary-container",
  },
  danger: {
    container: "bg-transparent border-2 border-status-red active:bg-status-red/10",
    text: "text-status-red-strong",
  },
  success: {
    container: "bg-status-green active:bg-status-green/80",
    text: "text-white",
  },
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps & { className?: string }) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={isDisabled}
      scaleTo={0.97}
      style={isDisabled ? undefined : shadowCard}
      className={`flex-row items-center justify-center rounded-full px-5 py-3.5 ${styles.container} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading && (
        <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : "#7B5FE8"} className="mr-2" />
      )}
      <Text className={`text-label-md font-bold ${styles.text}`}>{children}</Text>
    </PressableScale>
  );
}
