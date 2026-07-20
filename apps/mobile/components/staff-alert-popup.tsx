import { useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { hapticSuccess, hapticError } from "../lib/haptics";

type Responder = "security" | "management";

/**
 * Full-screen popup that fires when a resident raises a staff alert / "reach us"
 * message, or (for management) a guard files a report. Tapping OK auto-replies to
 * the sender and marks the alert read. Mounted on the guard gate (responder=security)
 * and across the admin tabs (responder=management).
 */
export function StaffAlertPopup({ responder = "security" }: { responder?: Responder }) {
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const query = trpc.notifications.list.useQuery(undefined, { refetchInterval: 8000 });
  const sendMutation = trpc.chat.send.useMutation();
  const markReadMutation = trpc.notifications.markRead.useMutation();

  // Staff-alert notifications carry data.fromUserId; direct chat messages use data.peerId.
  const pending = (query.data ?? []).find((n) => {
    const from = (n.data as Record<string, unknown> | null)?.fromUserId;
    return !n.readAt && !dismissed.has(n.id) && typeof from === "string";
  });

  if (!pending) return null;

  const data = (pending.data as Record<string, unknown>) ?? {};
  const fromUserId = data.fromUserId as string;
  const fromName = (data.fromName as string) ?? "Resident";
  const alertLabel = typeof data.alert === "string" ? data.alert : null;
  const isEmergency = pending.type === "alert";
  const who = responder === "security" ? "Security" : "The management";

  async function acknowledge() {
    setBusy(true);
    try {
      const reply = isEmergency
        ? `🚨 ${who} has received your "${alertLabel ?? "emergency"}" alert and is responding immediately.`
        : `${who} here — we received your message and will assist you shortly.`;
      await sendMutation.mutateAsync({ recipientId: fromUserId, body: reply });
      await markReadMutation.mutateAsync({ notificationId: pending!.id });
      setDismissed((prev) => new Set(prev).add(pending!.id));
      utils.notifications.list.invalidate();
      utils.chat.conversations.invalidate();
      hapticSuccess();
      showToast(`Response sent to ${fromName}`, "success");
    } catch (e) {
      hapticError();
      showToast(getErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setDismissed((prev) => new Set(prev).add(pending!.id));
  }

  const accent = isEmergency ? "#E5484D" : "#5B8DEF";

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
        <View className="w-full items-center gap-4 rounded-3xl p-6" style={{ backgroundColor: "#141118" }}>
          <View className="items-center justify-center rounded-full" style={{ width: 72, height: 72, backgroundColor: isEmergency ? "#3A1416" : "#16233A" }}>
            <MaterialIcons name={isEmergency ? "warning" : "forum"} size={38} color={accent} />
          </View>

          <Text className="text-center text-headline-md font-extrabold text-on-surface">
            {isEmergency ? pending.title : "New message"}
          </Text>
          <Text className="text-center text-body-md text-text-muted">{pending.body}</Text>

          <View className="w-full flex-row items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#242424" }}>
            <MaterialIcons name="person" size={18} color="#8A8A8A" />
            <Text className="flex-1 text-body-sm text-on-surface" numberOfLines={1}>
              From {fromName}
            </Text>
          </View>

          <Pressable
            onPress={acknowledge}
            disabled={busy}
            className="w-full flex-row items-center justify-center gap-2 rounded-full"
            style={{ height: 52, backgroundColor: accent, opacity: busy ? 0.7 : 1 }}
            accessibilityLabel="Acknowledge and respond"
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text className="text-body-lg font-bold text-white">OK — Responding</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={dismiss} hitSlop={8} accessibilityLabel="Dismiss" accessibilityRole="button">
            <Text className="text-body-sm font-bold text-text-muted">Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
