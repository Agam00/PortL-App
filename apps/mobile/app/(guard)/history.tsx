import { useState } from "react";
import { View, Text, Image, FlatList, Pressable, TextInput, ScrollView, RefreshControl, ActivityIndicator, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { GuardNotificationBell } from "../../components/guard-notification-bell";
import { PhotoViewerModal } from "../../components/photo-viewer-modal";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "person",
  delivery: "local-shipping",
  cab: "local-taxi",
  service: "build",
  other: "more-horiz",
};
const TYPE_LABEL: Record<VisitorOutput["type"], string> = {
  guest: "Guest",
  delivery: "Delivery",
  cab: "Cab",
  service: "Service",
  other: "Visitor",
};

type Tab = "waiting" | "approved" | "inside" | "out";

const EMPTY: Record<Tab, { title: string; description: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }> = {
  waiting: { title: "No one waiting", description: "New visitors you add wait here for the resident to approve.", icon: "hourglass-empty" },
  approved: { title: "Nothing approved", description: "Approved visitors appear here — tap IN to check them in.", icon: "how-to-reg" },
  inside: { title: "Nobody's inside", description: "Visitors you check in appear here until they leave.", icon: "meeting-room" },
  out: { title: "No exits yet", description: "Visitors who have checked out today appear here.", icon: "logout" },
};

function timeOf(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

/** Date + time, e.g. "12 Jul, 3:20 PM" — used in the Out tab so exits carry a date. */
function dateTimeOf(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

/** The relevant timestamp for each tab: requested / approved / entered / exited. */
function rowTime(v: VisitorOutput, tab: Tab): string {
  if (tab === "waiting") return v.createdAt ? `Requested ${timeOf(v.createdAt)}` : "";
  if (tab === "approved") return v.decidedAt ? `Approved ${timeOf(v.decidedAt)}` : "";
  if (tab === "inside") return v.entryAt ? `In ${timeOf(v.entryAt)}` : "";
  return v.exitAt ? `Out ${timeOf(v.exitAt)}` : "";
}

/** The timestamp a date filter should match for the active tab. */
function filterTime(v: VisitorOutput, tab: Tab): string | null {
  if (tab === "waiting") return v.createdAt;
  if (tab === "approved") return v.decidedAt;
  if (tab === "inside") return v.entryAt;
  return v.exitAt;
}

export default function GuardInOut() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("waiting");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; name: string; flat: string } | null>(null);

  // Poll so a resident's approval (and the push you already receive) flips a Waiting
  // row into the Approved tab within a few seconds without a manual refresh.
  const query = trpc.visitors.listForGuard.useQuery(undefined, { refetchInterval: 4000 });
  const all = query.data ?? [];

  const buckets: Record<Tab, VisitorOutput[]> = {
    waiting: all.filter((v) => v.source === "guard_initiated" && v.status === "pending"),
    approved: all.filter((v) => v.source === "guard_initiated" && v.status === "approved"),
    inside: all.filter((v) => v.status === "checked_in"),
    out: all.filter((v) => v.status === "checked_out"),
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "waiting", label: "Waiting" },
    { key: "approved", label: "Approved" },
    { key: "inside", label: "Inside" },
    { key: "out", label: "Out" },
  ];

  const matches = (v: VisitorOutput) =>
    search.trim().length === 0 ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.flatNumber ?? "").toLowerCase().includes(search.toLowerCase());

  const inDateRange = (v: VisitorOutput) => {
    if (!fromDate && !toDate) return true;
    const iso = filterTime(v, tab);
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      if (t < start.getTime()) return false;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (t > end.getTime()) return false;
    }
    return true;
  };

  const rows = buckets[tab].filter((v) => matches(v) && inDateRange(v));
  const dateLabel = (d: Date | null, fallback: string) => (d ? d.toLocaleDateString([], { day: "numeric", month: "short" }) : fallback);

  const markExit = trpc.visitors.markExit.useMutation({
    onSuccess: (v) => {
      hapticSuccess();
      showToast(`${v.name} checked out ✓`, "success");
      utils.visitors.listForGuard.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });
  const markEntry = trpc.visitors.markEntry.useMutation({
    onSuccess: (v) => {
      hapticSuccess();
      showToast(`${v.name} checked in ✓`, "success");
      utils.visitors.listForGuard.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Dark header: location + Home / In-Out / Settings */}
      <View style={{ backgroundColor: "#141118", paddingTop: insets.top + 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View style={{ position: "absolute", right: 12, top: insets.top + 4, zIndex: 10, elevation: 10 }}>
          <GuardNotificationBell color="#B9B4C4" />
        </View>
        <Text className="pb-4 text-center text-body-md font-bold" style={{ color: "#B9B4C4" }}>
          Main Gate · {user?.fullName?.split(" ")[0] ?? "Guard"}
        </Text>
        <View className="flex-row justify-around px-6 pb-6">
          <HeaderTab icon="home-filled" label="Home" onPress={() => router.replace("/(guard)/gate")} />
          <HeaderTab icon="swap-vert" label="In-Out" active onPress={() => {}} />
          <HeaderTab icon="settings" label="Settings" onPress={() => router.push("/(guard)/profile")} />
        </View>
      </View>

      {/* Tab bar: search · Waiting · Approved · Inside · Out */}
      <View className="flex-row items-center gap-3 pl-5 pt-4">
        <Pressable onPress={() => setSearchOpen((o) => !o)} hitSlop={8} accessibilityLabel="Search" accessibilityRole="button">
          <MaterialIcons name="search" size={24} color={searchOpen ? "#F5821F" : "#8A8A8A"} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 20 }}>
          {TABS.map((t) => (
            <TabButton key={t.key} label={t.label} count={buckets[t.key].length} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>
      </View>

      {searchOpen && (
        <View className="mx-5 mt-3 flex-row items-center gap-3 rounded-xl px-4" style={{ backgroundColor: "#242424" }}>
          <MaterialIcons name="search" size={20} color="#8A8A8A" />
          <TextInput
            placeholder="Search by name or flat"
            placeholderTextColor="#8A8A8A"
            value={search}
            onChangeText={setSearch}
            autoFocus
            className="flex-1 py-2.5 text-body-md text-on-surface"
            accessibilityLabel="Search visitors"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color="#8A8A8A" />
            </Pressable>
          )}
        </View>
      )}

      {/* Date range filter — narrows the active tab by its relevant timestamp. */}
      <View className="flex-row items-center gap-2 px-5 pt-3">
        <MaterialIcons name="date-range" size={18} color="#8A8A8A" />
        <Pressable
          onPress={() => setPicker("from")}
          className="flex-1 flex-row items-center justify-center rounded-lg py-2"
          style={{ backgroundColor: "#242424" }}
          accessibilityLabel="From date"
          accessibilityRole="button"
        >
          <Text className="text-body-sm font-bold" style={{ color: fromDate ? "#F5F5F5" : "#8A8A8A" }}>
            {dateLabel(fromDate, "From")}
          </Text>
        </Pressable>
        <MaterialIcons name="arrow-forward" size={14} color="#8A8A8A" />
        <Pressable
          onPress={() => setPicker("to")}
          className="flex-1 flex-row items-center justify-center rounded-lg py-2"
          style={{ backgroundColor: "#242424" }}
          accessibilityLabel="To date"
          accessibilityRole="button"
        >
          <Text className="text-body-sm font-bold" style={{ color: toDate ? "#F5F5F5" : "#8A8A8A" }}>
            {dateLabel(toDate, "To")}
          </Text>
        </Pressable>
        {(fromDate || toDate) && (
          <Pressable
            onPress={() => {
              setFromDate(null);
              setToDate(null);
            }}
            hitSlop={8}
            accessibilityLabel="Clear date filter"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={18} color="#FF5F5F" />
          </Pressable>
        )}
      </View>

      {picker && (
        <DateTimePicker
          value={(picker === "from" ? fromDate : toDate) ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, sel) => {
            const which = picker;
            setPicker(null);
            if (e.type !== "set" || !sel) return;
            if (which === "from") setFromDate(sel);
            else setToDate(sel);
          }}
        />
      )}

      <View className="mt-3 h-px" style={{ backgroundColor: "#242424" }} />

      <PhotoViewerModal
        uri={photo?.uri ?? null}
        title={photo?.name}
        subtitle={photo?.flat}
        onClose={() => setPhoto(null)}
      />

      <FlatList
        data={rows}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VisitorRow
            visitor={item}
            tab={tab}
            busy={
              (markExit.isPending && markExit.variables?.visitorId === item.id) ||
              (markEntry.isPending && markEntry.variables?.visitorId === item.id)
            }
            onOut={() => markExit.mutate({ visitorId: item.id })}
            onIn={() => markEntry.mutate({ visitorId: item.id })}
            onOpenPhoto={() =>
              item.photoUrl &&
              setPhoto({ uri: item.photoUrl, name: item.name, flat: `Flat ${item.flatNumber ?? "—"}` })
            }
          />
        )}
        contentContainerClassName="pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor="#F5821F" />}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="px-4 pt-6">
              <ListLoading />
            </View>
          ) : (
            <View className="mx-4 mt-6 rounded-xl bg-surface">
              <EmptyState title={EMPTY[tab].title} description={EMPTY[tab].description} icon={EMPTY[tab].icon} />
            </View>
          )
        }
      />
    </View>
  );
}

function VisitorRow({
  visitor,
  tab,
  busy,
  onOut,
  onIn,
  onOpenPhoto,
}: {
  visitor: VisitorOutput;
  tab: Tab;
  busy: boolean;
  onOut: () => void;
  onIn: () => void;
  onOpenPhoto: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-5 py-3.5" style={{ borderBottomWidth: 1, borderColor: "#1C1C1C" }}>
      {visitor.photoUrl ? (
        <Pressable onPress={onOpenPhoto} accessibilityLabel={`View photo of ${visitor.name}`} accessibilityRole="imagebutton">
          <Image source={{ uri: visitor.photoUrl }} style={{ width: 46, height: 46, borderRadius: 23 }} />
          <View
            className="absolute bottom-0 right-0 items-center justify-center rounded-full"
            style={{ width: 18, height: 18, backgroundColor: "#141118", borderWidth: 1, borderColor: "#2A2320" }}
          >
            <MaterialIcons name="zoom-in" size={12} color="#FF9A3D" />
          </View>
        </Pressable>
      ) : (
        <View className="items-center justify-center" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#2A2320" }}>
          <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color="#FF9A3D" />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
          {visitor.name}
        </Text>
        <Text className="text-body-sm text-text-muted" numberOfLines={1}>
          {TYPE_LABEL[visitor.type]} · {visitor.flatNumber ?? "—"}
        </Text>
        {tab === "out" ? (
          <View className="mt-0.5 gap-0.5">
            {visitor.entryAt && (
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="login" size={12} color="#22A559" />
                <Text className="text-body-sm" style={{ color: "#6E6E6E" }}>In {dateTimeOf(visitor.entryAt)}</Text>
              </View>
            )}
            {visitor.exitAt && (
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="logout" size={12} color="#E5484D" />
                <Text className="text-body-sm" style={{ color: "#6E6E6E" }}>Out {dateTimeOf(visitor.exitAt)}</Text>
              </View>
            )}
          </View>
        ) : rowTime(visitor, tab) ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <MaterialIcons name="schedule" size={12} color="#6E6E6E" />
            <Text className="text-body-sm" style={{ color: "#6E6E6E" }}>
              {rowTime(visitor, tab)}
            </Text>
          </View>
        ) : null}
      </View>

      {tab === "inside" ? (
        <ActionButton label="OUT" bg="#E5484D" fg="#FFFFFF" busy={busy} onPress={onOut} />
      ) : tab === "approved" ? (
        <ActionButton label="IN" bg="#22A559" fg="#FFFFFF" busy={busy} onPress={onIn} />
      ) : tab === "waiting" ? (
        <View className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2" style={{ backgroundColor: "#3A2E12" }}>
          <MaterialIcons name="hourglass-top" size={15} color="#FEB246" />
          <Text className="text-body-sm font-bold" style={{ color: "#FEB246" }}>
            Waiting
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2" style={{ backgroundColor: "#242424" }}>
          <MaterialIcons name="check" size={15} color="#8A8A8A" />
          <Text className="text-body-sm font-bold" style={{ color: "#8A8A8A" }}>
            Left
          </Text>
        </View>
      )}
    </View>
  );
}

function ActionButton({
  label,
  bg,
  fg,
  busy,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="items-center justify-center rounded-xl"
      style={{ minWidth: 68, height: 40, backgroundColor: bg, opacity: busy ? 0.6 : 1 }}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text className="text-body-md font-extrabold" style={{ color: fg }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function TabButton({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5" accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Text className="text-body-lg font-bold" style={{ color: active ? "#F5F5F5" : "#8A8A8A" }}>
        {label} ({count})
      </Text>
      <View style={{ height: 3, width: 28, borderRadius: 2, backgroundColor: active ? "#F5821F" : "transparent" }} />
    </Pressable>
  );
}

function HeaderTab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active ? "#F5821F" : "#8A8A8A";
  return (
    <Pressable onPress={onPress} className="items-center gap-1" accessibilityRole="button" accessibilityLabel={label}>
      <MaterialIcons name={icon} size={26} color={color} />
      <Text className="text-body-sm font-bold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
