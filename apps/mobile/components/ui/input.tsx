import { forwardRef } from "react";
import { View, Text, TextInput } from "react-native";
import type { TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, rightElement, className, ...props },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-label-caps uppercase tracking-wide text-text-muted">{label}</Text>
      )}
      <View className="relative justify-center">
        <TextInput
          ref={ref}
          placeholderTextColor="#8A8F98"
          className={`rounded-lg border px-3 py-2.5 text-body-md text-on-surface ${
            error ? "border-status-red" : "border-border-subtle focus:border-primary-container"
          } bg-surface-elevated ${rightElement ? "pr-10" : ""} ${className ?? ""}`}
          {...props}
        />
        {rightElement && <View className="absolute right-3">{rightElement}</View>}
      </View>
      {error && <Text className="text-body-sm text-status-red">{error}</Text>}
    </View>
  );
});
