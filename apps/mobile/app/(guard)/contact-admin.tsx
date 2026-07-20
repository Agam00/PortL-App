import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Avatar } from "../../components/ui/avatar";
import { shadowCard } from "../../lib/shadows";

type ReportType = "incident" | "gate_issue" | "maintenance" | "suspicious" | "other";

const REPORT_TYPES: { type: ReportType; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; urgent?: boolean }[] = [
  { type: "incident", label: "Security Incident", icon: "gpp-maybe", urgent: true },
  { type: "suspicious", label: "Suspicious Activity", icon: "visibility", urgent: true },
  { type: "gate_issue", label: "Gate / Equipment Issue", icon: "sensor-door" },
  { type: "maintenance", label: "Maintenance Needed", icon: "handyman" },
  { type: "other", label: "General Report", icon: "note-add" },
];

export default function GuardContactAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [note, setNote] = useState("");

  const staffQuery = trpc.chat.staffContacts.useQuery();
  const admins = staffQuery.data ?? [];

  const reportMutation = trpc.alerts.guardReport.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Report sent to admin ✓", "success");
      setSelected(null);
      setNote("");
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  function submit() {
    if (!selected) return;
    reportMutation.mutate({ type: selected, note: note.trim() || undefined });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View
        className="flex-row items-center gap-3 px-4 pb-3"
        style={{ paddingTop: insets.top + 10, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="flex-1 text-body-lg font-extrabold text-on-surface">Contact Admin</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Direct message the admin */}
          <View className="gap-2">
            <Text className="px-1 text-label-caps font-bold uppercase tracking-widest text-text-muted">Message the Admin</Text>
            {staffQuery.isLoading ? (
              <ActivityIndicator className="py-4" color="#F5821F" />
            ) : admins.length === 0 ? (
              <View className="rounded-2xl bg-surface p-4" style={shadowCard}>
                <Text className="text-body-md text-text-muted">No admin is assigned to your society yet.</Text>
              </View>
            ) : (
              admins.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push(`/(guard)/chat?peerId=${a.id}&name=${encodeURIComponent(a.name)}`)}
                  className="flex-row items-center gap-3 rounded-2xl bg-surface p-3.5"
                  style={shadowCard}
                  accessibilityLabel={`Message ${a.name}`}
                  accessibilityRole="button"
                >
                  <Avatar name={a.name} size={46} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text className="text-body-sm text-text-muted">Society Admin</Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#F5821F" }}>
                    <MaterialIcons name="chat" size={20} color="#141118" />
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* File a report */}
          <View className="gap-2">
            <Text className="px-1 text-label-caps font-bold uppercase tracking-widest text-text-muted">File a Report</Text>
            <View className="gap-2">
              {REPORT_TYPES.map((r) => {
                const active = selected === r.type;
                return (
                  <Pressable
                    key={r.type}
                    onPress={() => setSelected(active ? null : r.type)}
                    className="flex-row items-center gap-3 rounded-2xl p-3.5"
                    style={[{ backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: active ? "#F5821F" : "transparent" }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: r.urgent ? "#3A1A1A" : "#242424" }}
                    >
                      <MaterialIcons name={r.icon} size={20} color={r.urgent ? "#FF5F5F" : "#F5821F"} />
                    </View>
                    <Text className="flex-1 text-body-md font-bold text-on-surface">{r.label}</Text>
                    {r.urgent && (
                      <Text className="text-label-caps font-bold uppercase" style={{ color: "#FF5F5F", fontSize: 10 }}>
                        Urgent
                      </Text>
                    )}
                    <MaterialIcons name={active ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={active ? "#F5821F" : "#4A4A4A"} />
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              placeholder="Add details (optional)…"
              placeholderTextColor="#7E7E7E"
              value={note}
              onChangeText={setNote}
              multiline
              className="min-h-[90px] rounded-2xl p-4 text-body-md text-on-surface"
              style={{ backgroundColor: "#242424", textAlignVertical: "top" }}
            />

            <Pressable
              onPress={submit}
              disabled={!selected || reportMutation.isPending}
              className="mt-1 items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: selected ? "#F5821F" : "#4A3416" }}
              accessibilityLabel="Send report to admin"
              accessibilityRole="button"
            >
              <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                {reportMutation.isPending ? "Sending…" : "Send Report to Admin"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
