import { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { hapticTap } from "../../lib/haptics";
import { shadowCard } from "../../lib/shadows";

const TYPE_LABEL: Record<VisitorOutput["type"], string> = {
  guest: "Guest",
  delivery: "Delivery",
  cab: "Cab",
  service: "Service",
  other: "Visitor",
};

function formatWindow(visitor: VisitorOutput) {
  const from = visitor.validFrom ? new Date(visitor.validFrom) : null;
  const until = visitor.validUntil ? new Date(visitor.validUntil) : null;
  if (!from || !until) return "No time window";
  const day = from.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const isAllDay = from.getHours() === 0 && from.getMinutes() === 0 && until.getHours() === 23 && until.getMinutes() === 59;
  return isAllDay ? `${day} • All Day` : `${day} • ${from.toLocaleTimeString([], opts)} - ${until.toLocaleTimeString([], opts)}`;
}

export default function VisitorPass() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const { visitorId } = useLocalSearchParams<{ visitorId?: string }>();
  const ticketRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  // The list is already cached from My Pre-approvals — this resolves instantly.
  const query = trpc.visitors.listPreApprovedForResident.useQuery();
  const visitor = (query.data ?? []).find((v) => v.id === visitorId);

  async function share() {
    if (!visitor?.passCode) return;
    hapticTap();
    setSharing(true);
    try {
      const uri = await captureRef(ticketRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: `Gate pass for ${visitor.name}`, mimeType: "image/png" });
      } else {
        showToast("Sharing isn't available on this device", "error");
      }
    } catch {
      showToast("Couldn't share the pass", "error");
    } finally {
      setSharing(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Visitor Pass</Text>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F5821F" />
        </View>
      ) : !visitor || !visitor.passCode ? (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <MaterialIcons name="error-outline" size={40} color="#8A8A8A" />
          <Text className="text-center text-body-lg text-text-muted">This pass is no longer available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}>
          {/* Captured ticket */}
          <View ref={ticketRef} collapsable={false} style={{ backgroundColor: "#141118", borderRadius: 24, overflow: "hidden" }}>
            <View className="flex-row items-center justify-between px-6 pt-6">
              <View className="flex-row items-center gap-2">
                <View className="items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: "#F5821F" }}>
                  <MaterialIcons name="apartment" size={18} color="#141118" />
                </View>
                <Text className="text-body-lg font-extrabold text-on-surface">Portl</Text>
              </View>
              <Text className="text-label-caps font-bold uppercase tracking-widest" style={{ color: "#F5821F" }}>
                {visitor.keepAtGate ? "Collection Pass" : "Gate Pass"}
              </Text>
            </View>

            <View className="items-center gap-1 px-6 pt-5">
              <Text className="text-center text-headline-lg font-extrabold text-on-surface" numberOfLines={2}>
                {visitor.name}
              </Text>
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#242424" }}>
                <Text className="text-body-sm font-bold text-on-surface-variant">{TYPE_LABEL[visitor.type]}</Text>
              </View>
            </View>

            {/* QR on a white card for reliable scanning */}
            <View className="items-center py-6">
              <View className="items-center justify-center rounded-2xl bg-white p-4">
                <QRCode value={visitor.passCode} size={196} backgroundColor="#FFFFFF" color="#0D0D0D" />
              </View>
            </View>

            {/* Code */}
            <View className="items-center gap-1 px-6">
              <Text className="text-label-caps font-bold uppercase tracking-widest text-text-muted">
                {visitor.keepAtGate ? "Collection Code" : "Gate Code"}
              </Text>
              <Text className="font-extrabold" style={{ fontSize: 40, letterSpacing: 8, color: "#F5821F" }}>
                {visitor.passCode}
              </Text>
            </View>

            {/* Details */}
            <View className="mt-5 gap-px" style={{ borderTopWidth: 1, borderColor: "#242424" }}>
              <DetailRow icon="apartment" label={visitor.keepAtGate ? "Package for" : "Visiting"} value={visitor.flatNumber ? `Unit ${visitor.flatNumber}` : "—"} />
              <DetailRow icon="event" label="Valid" value={formatWindow(visitor)} />
            </View>

            <Text className="px-6 pb-6 pt-4 text-center text-body-sm text-text-muted">
              {visitor.keepAtGate
                ? "Read this code to security to collect your package held at the gate."
                : "Scan this QR or enter the gate code at the security desk."}
            </Text>
          </View>

          <Pressable
            onPress={share}
            disabled={sharing}
            className="h-14 flex-row items-center justify-center gap-2 rounded-full"
            style={[{ backgroundColor: "#F5821F" }, shadowCard]}
            accessibilityLabel="Share pass"
            accessibilityRole="button"
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#141118" />
            ) : (
              <>
                <MaterialIcons name="ios-share" size={20} color="#141118" />
                <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                  Share Pass
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-6 py-3">
      <MaterialIcons name={icon} size={18} color="#8A8A8A" />
      <Text className="text-body-md text-text-muted">{label}</Text>
      <Text className="flex-1 text-right text-body-md font-bold text-on-surface" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
