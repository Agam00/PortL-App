import { useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
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
          {value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="time"
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
