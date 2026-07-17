import { View, Text, ScrollView, RefreshControl, Pressable, Alert, LayoutAnimation, Platform, UIManager } from "react-native";

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
import { VisitorRequestCard } from "../../components/visitor-request-card";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard, shadowElevated } from "../../lib/shadows";

// home_dashboard mockup: 2×2 quick-action tiles, icon in a soft tinted circle.
const QUICK_ACTIONS: {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  iconColor: string;
  route: "/(resident)/pre-approve" | "/(resident)/helpdesk" | "/(resident)/dues" | "/(resident)/amenities";
}[] = [
  { label: "Pre-Approve Guest", icon: "person-add", tint: "rgba(98,68,205,0.10)", iconColor: "#6244CD", route: "/(resident)/pre-approve" },
  { label: "Help Desk", icon: "support-agent", tint: "rgba(132,84,0,0.10)", iconColor: "#845400", route: "/(resident)/helpdesk" },
  { label: "Pay Dues", icon: "payments", tint: "rgba(132,84,0,0.10)", iconColor: "#845400", route: "/(resident)/dues" },
  { label: "Book Amenities", icon: "chair", tint: "rgba(98,68,205,0.10)", iconColor: "#6244CD", route: "/(resident)/amenities" },
];

export default function ResidentHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const pendingQuery = trpc.visitors.listPendingForResident.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 15_000 });
  const unreadNotifications = (notificationsQuery.data ?? []).filter((n) => !n.readAt).length;

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

  return (
    <View className="flex-1" style={{ backgroundColor: "#FAFAFB" }}>
      <ScrollView
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl refreshing={pendingQuery.isRefetching} onRefresh={() => pendingQuery.refetch()} />
        }
      >
        {/* Greeting hero on a soft violet wash (mockup's primary/10 → transparent gradient). */}
        <View
          className="px-5 pb-6"
          style={{ paddingTop: insets.top + 48, backgroundColor: "rgba(98,68,205,0.08)" }}
        >
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1">
              <Text className="text-headline-lg font-extrabold text-on-surface">
                Hello, {user?.fullName.split(" ")[0] ?? "Resident"}!
              </Text>
              <Text className="pt-2 text-body-lg text-on-surface-variant">
                Welcome back to your community portal.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(resident)/notifications")}
              hitSlop={8}
              className="relative h-10 w-10 items-center justify-center"
              accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
              accessibilityRole="button"
            >
              <MaterialIcons name="notifications-none" size={24} color="#48454F" />
              {unreadNotifications > 0 && (
                <View className="absolute right-0.5 top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-status-red-strong px-1">
                  <Text className="font-bold text-white" style={{ fontSize: 10, lineHeight: 12 }}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View className="gap-6 px-5 pt-10">
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="notifications-active" size={24} color="#FEB246" />
                <Text className="text-headline-md font-extrabold text-on-surface">Pending Approvals</Text>
              </View>
              <Pressable onPress={() => router.push("/(resident)/visitor-history")}>
                <Text className="text-body-md font-bold text-primary">View All</Text>
              </Pressable>
            </View>

            {pendingQuery.isLoading ? (
              <ListLoading />
            ) : pendingQuery.isError ? (
              <View className="rounded-xl bg-surface">
                <EmptyState
                  title="Couldn't load pending requests"
                  description="Pull down to refresh and try again."
                  icon="error-outline"
                />
              </View>
            ) : pending.length === 0 ? (
              <View className="rounded-xl bg-surface">
                <EmptyState
                  title="No pending requests"
                  description="You're all caught up — new visitor and delivery requests will show up here."
                  icon="notifications-none"
                />
              </View>
            ) : (
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
            )}
          </View>

          <View className="gap-4">
            <Text className="text-headline-md font-extrabold text-on-surface">Quick Actions</Text>
            {[QUICK_ACTIONS.slice(0, 2), QUICK_ACTIONS.slice(2, 4)].map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-4">
                {row.map((action) => (
                  <PressableScale
                    key={action.label}
                    scaleTo={0.97}
                    onPress={() => router.push(action.route)}
                    className="flex-1 items-center justify-center gap-3 rounded-xl bg-surface p-6"
                    style={shadowCard}
                    accessibilityLabel={action.label}
                    accessibilityRole="button"
                  >
                    <View
                      className="h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: action.tint }}
                    >
                      <MaterialIcons name={action.icon} size={24} color={action.iconColor} />
                    </View>
                    <Text className="text-center text-body-md font-bold text-on-surface">{action.label}</Text>
                  </PressableScale>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating quick-add (mockup FAB) — solid primary; the mockup's gradient needs
          expo-linear-gradient, which isn't linked into the installed dev client. */}
      <PressableScale
        scaleTo={0.9}
        onPress={() => router.push("/(resident)/pre-approve")}
        className="items-center justify-center"
        style={[
          { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#6244CD" },
          shadowElevated,
        ]}
        accessibilityLabel="New pre-approval"
        accessibilityRole="button"
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </PressableScale>
    </View>
  );
}
