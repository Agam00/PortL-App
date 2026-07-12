import { Pressable, Text, ActivityIndicator } from "react-native";
import type { PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_STYLES: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-primary-container active:bg-inverse-primary", text: "text-white" },
  secondary: {
    container: "bg-surface-elevated border border-border-subtle active:bg-white/5",
    text: "text-on-surface",
  },
  outline: {
    container: "bg-transparent border border-border-subtle active:bg-white/5",
    text: "text-on-surface",
  },
  danger: {
    container: "bg-transparent border border-status-red/40 active:bg-status-red/10",
    text: "text-status-red",
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
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-md px-3 py-2.5 ${styles.container} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : "#bdc2ff"}
          className="mr-2"
        />
      )}
      <Text className={`text-body-md font-medium ${styles.text}`}>{children}</Text>
    </Pressable>
  );
}
