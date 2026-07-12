import { useEffect } from "react";
import { View, Text } from "react-native";
import { useUiStore } from "../stores/ui-store";

const TONE_STYLES: Record<string, string> = {
  error: "border-status-red/40 bg-surface-elevated",
  success: "border-status-green/40 bg-surface-elevated",
  info: "border-border-subtle bg-surface-elevated",
};

const TONE_DOT: Record<string, string> = {
  error: "bg-status-red",
  success: "bg-status-green",
  info: "bg-primary-container",
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
      <View
        className={`flex-row items-center gap-2 rounded-lg border px-4 py-3 ${TONE_STYLES[toast.type] ?? TONE_STYLES.info}`}
      >
        <View className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[toast.type] ?? TONE_DOT.info}`} />
        <Text className="text-body-sm text-on-surface">{toast.message}</Text>
      </View>
    </View>
  );
}
