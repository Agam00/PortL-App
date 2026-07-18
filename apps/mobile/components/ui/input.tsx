import { forwardRef } from "react";
import { View, Text, TextInput } from "react-native";
import type { TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leftElement, rightElement, className, ...props },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-label-caps uppercase tracking-wide text-text-muted">{label}</Text>
      )}
      <View className="relative justify-center">
        {leftElement && <View className="absolute left-4 z-10">{leftElement}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor="#8A8A8A"
          className={`rounded-md border-2 px-4 py-3 text-body-md text-on-surface ${
            error ? "border-status-red" : "border-outline-variant focus:border-primary-container"
          } bg-surface ${leftElement ? "pl-11" : ""} ${rightElement ? "pr-11" : ""} ${className ?? ""}`}
          {...props}
        />
        {rightElement && <View className="absolute right-4">{rightElement}</View>}
      </View>
      {error && <Text className="text-body-sm text-status-red-strong">{error}</Text>}
    </View>
  );
});
