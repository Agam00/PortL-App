import { useEffect } from "react";
import { View, Text } from "react-native";
import { useUiStore } from "../stores/ui-store";
import { shadowElevated } from "../lib/shadows";

const TONE_STYLES: Record<string, string> = {
  error: "bg-status-red",
  success: "bg-status-green",
  info: "bg-primary-container",
};

const TONE_ICON_BG: Record<string, string> = {
  error: "bg-surface/20",
  success: "bg-surface/20",
  info: "bg-surface/20",
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
    <View pointerEvents="none" className="absolute inset-x-4 top-14 z-50 items-center">
      <View
        className={`flex-row items-center gap-2 rounded-full px-5 py-3.5 ${TONE_STYLES[toast.type] ?? TONE_STYLES.info}`}
        style={shadowElevated}
      >
        <View className={`h-2 w-2 rounded-full ${TONE_ICON_BG[toast.type] ?? TONE_ICON_BG.info}`} />
        <Text className="text-body-sm font-bold text-white">{toast.message}</Text>
      </View>
    </View>
  );
}
