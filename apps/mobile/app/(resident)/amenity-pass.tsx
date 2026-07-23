import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useAuthStore } from "../../stores/auth-store";

function fmtDate(date: string) {
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Amenity booking pass — the amenity equivalent of a gate pass. Residents show this at
 * the facility; it carries the booking reference (as a QR), the slot, and the flat.
 */
export default function AmenityPass() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { id, name, date, start, end, flat } = useLocalSearchParams<{
    id?: string;
    name?: string;
    date?: string;
    start?: string;
    end?: string;
    flat?: string;
  }>();

  const slot = start && end ? `${start.slice(0, 5)} – ${end.slice(0, 5)}` : "—";

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Amenity Pass</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}>
        <View style={{ backgroundColor: "#141118", borderRadius: 24, overflow: "hidden" }}>
          <View className="flex-row items-center justify-between px-6 pt-6">
            <View className="flex-row items-center gap-2">
              <View className="items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: "#F5821F" }}>
                <MaterialIcons name="apartment" size={18} color="#141118" />
              </View>
              <Text className="text-body-lg font-extrabold text-on-surface">Portl</Text>
            </View>
            <Text className="text-label-caps font-bold uppercase tracking-widest" style={{ color: "#F5821F" }}>
              Amenity Pass
            </Text>
          </View>

          <View className="items-center gap-1 px-6 pt-5">
            <Text className="text-center text-headline-lg font-extrabold text-on-surface" numberOfLines={2}>
              {name ?? "Amenity"}
            </Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#242424" }}>
              <Text className="text-body-sm font-bold text-on-surface-variant">{slot}</Text>
            </View>
          </View>

          <View className="items-center py-6">
            <View className="items-center justify-center rounded-2xl bg-white p-4">
              <QRCode value={id ?? "amenity-pass"} size={188} backgroundColor="#FFFFFF" color="#0D0D0D" />
            </View>
          </View>

          <View className="gap-px" style={{ borderTopWidth: 1, borderColor: "#242424" }}>
            <DetailRow icon="event" label="Date" value={date ? fmtDate(date) : "—"} />
            <DetailRow icon="schedule" label="Time" value={slot} />
            <DetailRow icon="home" label="Flat" value={flat ? `Unit ${flat}` : "—"} />
            <DetailRow icon="person" label="Booked by" value={user?.fullName ?? "—"} />
          </View>

          <Text className="px-6 pb-6 pt-4 text-center text-body-sm text-text-muted">
            Show this pass at the facility. Booking ref #{(id ?? "").slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </ScrollView>
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
