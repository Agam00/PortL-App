import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { ServiceRequestOutput } from "@repo/services/service-request/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Avatar } from "../../components/ui/avatar";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

const SERVICES: { key: string; img: ImageSourcePropType }[] = [
  { key: "Home Cleaning", img: require("../../assets/services/cleaning.png") },
  { key: "Appliances Repair", img: require("../../assets/services/appliances.png") },
  { key: "Carpenter Service", img: require("../../assets/services/carpenter.png") },
  { key: "Home Painting", img: require("../../assets/services/painting.png") },
  { key: "Plumbing Service", img: require("../../assets/services/plumbing.png") },
  { key: "Packer & Movers", img: require("../../assets/services/movers.png") },
  { key: "Home Sanitize", img: require("../../assets/services/sanitize.png") },
  { key: "Hair & Beauty", img: require("../../assets/services/beauty.png") },
];

const IMG_BY_CATEGORY: Record<string, ImageSourcePropType> = Object.fromEntries(SERVICES.map((s) => [s.key, s.img]));

function statusPill(status: ServiceRequestOutput["status"]): { label: string; color: string } {
  switch (status) {
    case "requested":
      return { label: "SERVICE BOOKED", color: "#F5821F" };
    case "confirmed":
      return { label: "CONFIRMED", color: "#27C96D" };
    case "completed":
      return { label: "COMPLETED", color: "#8A8A8A" };
    default:
      return { label: "CANCELLED", color: "#8A8A8A" };
  }
}

function whenLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} | ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase()}`;
}

export default function ResidentServices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [category, setCategory] = useState<string | null>(null);

  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const unread = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;
  const bookingsQuery = trpc.serviceRequests.mine.useQuery();

  const cancelMutation = trpc.serviceRequests.cancel.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Booking cancelled", "success");
      utils.serviceRequests.mine.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  function confirmCancel(id: string, category: string) {
    Alert.alert("Cancel booking?", `Cancel your ${category} booking?`, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel Booking", style: "destructive", onPress: () => cancelMutation.mutate({ requestId: id }) },
    ]);
  }

  const bookings = bookingsQuery.data ?? [];
  // "Active" = still open (requested/confirmed). Cancelled/completed drop into history below.
  const active = bookings.filter((b) => b.status === "requested" || b.status === "confirmed");

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable
          onPress={() => router.push("/(resident)/notifications")}
          hitSlop={8}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
          {unread > 0 && (
            <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
              <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-headline-md font-extrabold text-on-surface">Services</Text>
        <Pressable onPress={() => router.push("/(resident)/profile")} hitSlop={8} accessibilityLabel="Profile" accessibilityRole="button">
          <View className="rounded-full" style={shadowCard}>
            <Avatar name={user?.fullName ?? "Resident"} size={44} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={bookingsQuery.isRefetching} onRefresh={() => bookingsQuery.refetch()} />}
      >
        {/* Your Bookings */}
        <View className="gap-3">
          <Text className="text-headline-md font-extrabold text-on-surface">Your Bookings</Text>
          {bookingsQuery.isLoading ? (
            <ListLoading />
          ) : active.length === 0 ? (
            <View className="rounded-2xl bg-surface p-5" style={shadowCard}>
              <Text className="text-body-md text-text-muted">No bookings yet — pick a service below to book one.</Text>
            </View>
          ) : (
            active.map((b) => {
              const pill = statusPill(b.status);
              return (
                <View key={b.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
                  <Image source={IMG_BY_CATEGORY[b.category] ?? SERVICES[1].img} style={{ width: 52, height: 52 }} resizeMode="contain" />
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                      {b.category}
                    </Text>
                    {b.note ? (
                      <Text className="text-body-sm text-on-surface-variant" numberOfLines={1}>
                        {b.note}
                      </Text>
                    ) : (
                      <Text className="text-body-sm font-extrabold" style={{ color: pill.color }}>
                        {pill.label}
                      </Text>
                    )}
                    {whenLabel(b.scheduledAt) && (
                      <View className="flex-row items-center gap-1.5">
                        <MaterialIcons name="calendar-today" size={13} color="#8A8A8A" />
                        <Text className="text-body-sm text-text-muted">{whenLabel(b.scheduledAt)}</Text>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={() => confirmCancel(b.id, b.category)}
                    hitSlop={8}
                    disabled={cancelMutation.isPending}
                    accessibilityLabel={`Cancel ${b.category} booking`}
                    accessibilityRole="button"
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#242424" }}
                  >
                    <MaterialIcons name="close" size={18} color="#FF5F5F" />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* Nearby Service providers */}
        <View className="gap-3">
          <Text className="text-headline-md font-extrabold text-on-surface">Nearby Service providers</Text>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {SERVICES.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setCategory(s.key)}
                className="flex-row items-center gap-2 rounded-2xl bg-surface p-3"
                style={[{ width: "48.5%" }, shadowCard]}
                accessibilityLabel={s.key}
                accessibilityRole="button"
              >
                <Image source={s.img} style={{ width: 44, height: 44 }} resizeMode="contain" />
                <Text className="min-w-0 flex-1 text-body-md font-bold text-on-surface">{s.key}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <BookServiceModal category={category} onClose={() => setCategory(null)} />
    </View>
  );
}

function BookServiceModal({ category, onClose }: { category: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const showToast = useUiStore((s) => s.showToast);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [step, setStep] = useState<"none" | "date" | "time">("none");

  const createMutation = trpc.serviceRequests.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Service booked", "success");
      setNote("");
      utils.serviceRequests.mine.invalidate();
      onClose();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  const img = category ? (IMG_BY_CATEGORY[category] ?? SERVICES[1].img) : SERVICES[1].img;

  return (
    <Modal visible={!!category} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="gap-4 rounded-t-3xl bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center gap-3">
              <Image source={img} style={{ width: 56, height: 56 }} resizeMode="contain" />
              <Text className="flex-1 text-headline-md font-extrabold text-on-surface">{category}</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                <MaterialIcons name="close" size={24} color="#C4C4C4" />
              </Pressable>
            </View>

            <TextInput
              placeholder="What do you need? (e.g. AC not cooling)"
              placeholderTextColor="#7E7E7E"
              value={note}
              onChangeText={setNote}
              multiline
              className="min-h-[80px] rounded-2xl p-4 text-body-md text-on-surface"
              style={{ backgroundColor: "#242424", textAlignVertical: "top" }}
            />

            <Pressable
              onPress={() => setStep("date")}
              className="flex-row items-center justify-between rounded-2xl p-4"
              style={{ backgroundColor: "#242424" }}
              accessibilityLabel="Preferred time"
              accessibilityRole="button"
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="schedule" size={20} color="#F5821F" />
                <Text className="text-body-md text-on-surface">Preferred time</Text>
              </View>
              <Text className="text-body-md font-bold text-on-surface">{whenLabel(when.toISOString())}</Text>
            </Pressable>

            {step === "date" && (
              <DateTimePicker
                value={when}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, sel) => {
                  if (e.type !== "set" || !sel) {
                    setStep("none");
                    return;
                  }
                  const next = new Date(when);
                  next.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate());
                  setWhen(next);
                  setStep("time");
                }}
              />
            )}
            {step === "time" && (
              <DateTimePicker
                value={when}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, sel) => {
                  setStep("none");
                  if (e.type !== "set" || !sel) return;
                  const next = new Date(when);
                  next.setHours(sel.getHours(), sel.getMinutes(), 0, 0);
                  setWhen(next);
                }}
              />
            )}

            <Pressable
              onPress={() => category && createMutation.mutate({ category, note: note.trim() || undefined, scheduledAt: when.toISOString() })}
              disabled={createMutation.isPending}
              className="items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: "#F5821F", opacity: createMutation.isPending ? 0.7 : 1 }}
              accessibilityLabel="Book service"
              accessibilityRole="button"
            >
              <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                {createMutation.isPending ? "Booking..." : "Book Service"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
