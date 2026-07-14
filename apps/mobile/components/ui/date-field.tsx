import { useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View className="flex-1 gap-1.5">
      <Text className="text-label-caps uppercase tracking-wide text-text-muted">{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2.5"
      >
        <Text className="text-body-md text-on-surface">
          {value.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) onChange(selected);
          }}
        />
      )}
    </View>
  );
}
