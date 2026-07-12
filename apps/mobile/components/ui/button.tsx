import { Pressable, Text, ActivityIndicator } from "react-native";
import type { PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps extends Omit<PressableProps, "children"> {
  children: string;
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_STYLES: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-slate-900 active:bg-slate-800", text: "text-white" },
  secondary: { container: "bg-slate-100 active:bg-slate-200", text: "text-slate-900" },
  outline: { container: "border border-slate-300 active:bg-slate-50", text: "text-slate-900" },
  danger: { container: "bg-red-600 active:bg-red-700", text: "text-white" },
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
      className={`flex-row items-center justify-center rounded-xl px-4 py-3.5 ${styles.container} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#0f172a"}
          className="mr-2"
        />
      )}
      <Text className={`text-base font-semibold ${styles.text}`}>{children}</Text>
    </Pressable>
  );
}
