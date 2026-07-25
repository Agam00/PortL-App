import { View, Text, ScrollView, RefreshControl, Pressable, Image, Alert, LayoutAnimation, Platform, UIManager } from "react-native";
import type { ImageSourcePropType } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { trpc } from "../../lib/trpc";
import { EmptyState } from "../../components/ui/empty-state";
import { Avatar } from "../../components/ui/avatar";
import { VisitorRequestCard } from "../../components/visitor-request-card";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

// 3D character art (assets/characters) fronts each action, per the reference design.
const PRE_APPROVE_ACTIONS: {
  label: string;
  type: "guest" | "delivery" | "service" | "cab";
  img: ImageSourcePropType;
}[] = [
  { label: "Add\nGuest", type: "guest", img: require("../../assets/characters/guest.png") },
  { label: "Add\nDelivery", type: "delivery", img: require("../../assets/characters/delivery.png") },
  { label: "Add\nService", type: "service", img: require("../../assets/characters/service.png") },
  { label: "Add\nCab", type: "cab", img: require("../../assets/characters/cab.png") },
];

const COMMUNITY_ACTIONS: {
  label: string;
  subtitle: string;
  img: ImageSourcePropType;
  route: "/(resident)/helpdesk" | "/(resident)/notices" | "/(resident)/dues" | "/(resident)/amenities";
  badgeKey?: "notices";
}[] = [
  { label: "HelpDesk", subtitle: "Complaint & suggestion", img: require("../../assets/characters/helpdesk.png"), route: "/(resident)/helpdesk" },
  { label: "Notice Board", subtitle: "Society announcements", img: require("../../assets/characters/notice.png"), route: "/(resident)/notices", badgeKey: "notices" },
  { label: "Do society payment", subtitle: "Direct payment of society dues", img: require("../../assets/characters/dues.png"), route: "/(resident)/dues" },
  { label: "Book Amenities", subtitle: "Pre book society amenities", img: require("../../assets/characters/amenities.png"), route: "/(resident)/amenities" },
];

export default function ResidentHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const pendingQuery = trpc.visitors.listPendingForResident.useQuery(undefined, { refetchInterval: 5000 });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const noticesQuery = trpc.notices.listForResident.useQuery({ limit: 50 });
  const dutyQuery = trpc.duty.guards.useQuery(undefined, { refetchInterval: 30_000 });
  const guardsOnDuty = (dutyQuery.data ?? []).filter((g) => g.onDuty);

  const unreadNotifications = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;
  const unreadNotices = (noticesQuery.data ?? []).filter((n) => !n.isRead).length;

  const decideMutation = trpc.visitors.decide.useMutation({
    onSuccess: () => {
      hapticSuccess();
      LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
      utils.visitors.listPendingForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
    onSettled: () => setDecidingId(null),
  });

  const pending = pendingQuery.data ?? [];

  function confirmReject(visitorId: string, name: string) {
    Alert.alert("Reject visitor?", `${name} will be turned away at the gate. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          setDecidingId(visitorId);
          decideMutation.mutate({ visitorId, decision: "rejected" });
        },
      },
    ]);
  }

  function badgeFor(key?: "notices") {
    if (key === "notices") return unreadNotices;
    return 0;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Top bar: notifications (left) · brand (center) · profile (right) */}
      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{ paddingTop: insets.top + 10, backgroundColor: "#0D0D0D" }}
      >
        <Pressable
          onPress={() => router.push("/(resident)/notifications")}
          hitSlop={8}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={shadowCard}
          accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
          accessibilityRole="button"
        >
          <MaterialIcons name="notifications-none" size={24} color="#C4C4C4" />
          {unreadNotifications > 0 && (
            <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
              <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>

        <Text className="text-headline-md font-extrabold text-on-surface">Portl</Text>

        <Pressable
          onPress={() => router.push("/(resident)/profile")}
          hitSlop={8}
          accessibilityLabel="Profile"
          accessibilityRole="button"
        >
          <View className="rounded-full" style={shadowCard}>
            <Avatar name={user?.fullName ?? "Resident"} size={44} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={pendingQuery.isRefetching || noticesQuery.isRefetching}
            onRefresh={() => {
              pendingQuery.refetch();
              noticesQuery.refetch();
              notificationsQuery.refetch();
            }}
          />
        }
      >
        {/* Security duty status — residents can see who's guarding the gate. */}
        {dutyQuery.data && dutyQuery.data.length > 0 && (
          <View className="mx-5 mt-2 flex-row items-center gap-3 rounded-xl bg-surface p-3.5" style={shadowCard}>
            <View
              className="items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: guardsOnDuty.length > 0 ? "#153A24" : "#242424" }}
            >
              <MaterialIcons name="shield" size={20} color={guardsOnDuty.length > 0 ? "#27C96D" : "#8A8A8A"} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-body-md font-extrabold text-on-surface">
                {guardsOnDuty.length > 0 ? "Security on duty" : "No security on duty"}
              </Text>
              <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                {guardsOnDuty.length > 0
                  ? guardsOnDuty.map((g) => g.name.split(" ")[0]).join(", ")
                  : "Guards are currently off duty"}
              </Text>
            </View>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: guardsOnDuty.length > 0 ? "#27C96D" : "#8A8A8A" }} />
          </View>
        )}

        {/* Pending approvals surface only when there's something to act on. */}
        {pending.length > 0 && (
          <View className="gap-3 px-5 pt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="notifications-active" size={22} color="#FEB246" />
                <Text className="text-headline-md font-extrabold text-on-surface">Pending Approvals</Text>
              </View>
              <Pressable onPress={() => router.push("/(resident)/visitor-history")}>
                <Text className="text-body-md font-bold text-primary">View All</Text>
              </Pressable>
            </View>
            <View className="gap-4">
              {pending.map((visitor) => (
                <VisitorRequestCard
                  key={visitor.id}
                  visitor={visitor}
                  isDeciding={decidingId === visitor.id && decideMutation.isPending}
                  onApprove={() => {
                    setDecidingId(visitor.id);
                    decideMutation.mutate({ visitorId: visitor.id, decision: "approved" });
                  }}
                  onReject={() => confirmReject(visitor.id, visitor.name)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Pre Approve Visitors — horizontal scroll of 3D-avatar action cards */}
        <View className="gap-3 pt-6">
          <View className="px-5">
            <Text className="text-headline-md font-extrabold text-on-surface">Pre Approve Visitors</Text>
            <Text className="pt-1 text-body-md text-on-surface-variant">Add visitor details for quick entries</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-4 px-5 pb-1"
          >
            {PRE_APPROVE_ACTIONS.map((action) => (
              <PressableScale
                key={action.type}
                scaleTo={0.96}
                onPress={() => router.push(`/(resident)/pre-approve?type=${action.type}`)}
                className="justify-between rounded-xl bg-surface p-4"
                style={[{ width: 128, height: 150 }, shadowCard]}
                accessibilityLabel={action.label.replace("\n", " ")}
                accessibilityRole="button"
              >
                <Text className="text-body-md font-extrabold text-on-surface">{action.label}</Text>
                <Image source={action.img} style={{ width: 74, height: 74, alignSelf: "flex-end" }} resizeMode="contain" />
              </PressableScale>
            ))}
          </ScrollView>
        </View>

        {/* Community — vertical list of 3D-avatar cards */}
        <View className="gap-3 px-5 pt-8">
          <View>
            <Text className="text-headline-md font-extrabold text-on-surface">Community</Text>
            <Text className="pt-1 text-body-md text-on-surface-variant">Everything about society management</Text>
          </View>

          {noticesQuery.isLoading && pending.length === 0 && notificationsQuery.isLoading ? (
            <ListLoading />
          ) : (
            <View className="gap-3">
              {COMMUNITY_ACTIONS.map((action) => {
                const badge = badgeFor(action.badgeKey);
                return (
                  <PressableScale
                    key={action.label}
                    scaleTo={0.98}
                    onPress={() => router.push(action.route)}
                    className="flex-row items-center rounded-xl bg-surface p-4"
                    style={shadowCard}
                    accessibilityLabel={action.label}
                    accessibilityRole="button"
                  >
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-body-lg font-extrabold text-on-surface">{action.label}</Text>
                        {badge > 0 && (
                          <View className="h-5 min-w-5 items-center justify-center rounded-full bg-status-red-strong px-1.5">
                            <Text className="font-bold text-white" style={{ fontSize: 11, lineHeight: 14 }}>
                              {badge > 9 ? "9+" : badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="pt-1 text-body-sm text-on-surface-variant">{action.subtitle}</Text>
                    </View>
                    <Image source={action.img} style={{ width: 64, height: 64 }} resizeMode="contain" />
                  </PressableScale>
                );
              })}
            </View>
          )}

          {noticesQuery.isError && (
            <View className="rounded-xl bg-surface">
              <EmptyState title="Couldn't load community updates" description="Pull down to refresh and try again." icon="error-outline" />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
