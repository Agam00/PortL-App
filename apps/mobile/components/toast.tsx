import { useEffect } from "react";
import { View, Text } from "react-native";
import { useUiStore } from "../stores/ui-store";

const TONE_STYLES: Record<string, string> = {
  error: "bg-red-600",
  success: "bg-emerald-600",
  info: "bg-slate-900",
};

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-4 top-14 z-50 items-center"
    >
      <View className={`rounded-xl px-4 py-3 ${TONE_STYLES[toast.type] ?? TONE_STYLES.info}`}>
        <Text className="text-center text-sm font-medium text-white">{toast.message}</Text>
      </View>
    </View>
  );
}
