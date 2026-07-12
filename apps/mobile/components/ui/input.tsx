import { forwardRef } from "react";
import { View, Text, TextInput } from "react-native";
import type { TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className, ...props },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label && <Text className="text-sm font-medium text-slate-700">{label}</Text>}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border px-4 py-3 text-base text-slate-900 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className ?? ""}`}
        {...props}
      />
      {error && <Text className="text-sm text-red-600">{error}</Text>}
    </View>
  );
});
