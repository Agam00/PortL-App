import { View, Text, ScrollView, RefreshControl, Pressable, Alert, LayoutAnimation, Platform, UIManager } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { VisitorRequestCard } from "../../components/visitor-request-card";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS: {
  label: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  iconColor: string;
  route?: "/(resident)/pre-approve" | "/(resident)/helpdesk" | "/(resident)/dues" | "/(resident)/amenities";
}[] = [
  { label: "Pre-Approve Guest", meta: "Generate pass", icon: "qr-code-scanner", tint: "bg-surface-container", iconColor: "#6244CD", route: "/(resident)/pre-approve" },
  { label: "Help Desk", meta: "Raise ticket", icon: "support-agent", tint: "bg-secondary-container/30", iconColor: "#845400", route: "/(resident)/helpdesk" },
  { label: "Pay Dues", meta: "View balance", icon: "payments", tint: "bg-secondary-container/30", iconColor: "#845400", route: "/(resident)/dues" },
  { label: "Book Amenities", meta: "Facilities", icon: "event", tint: "bg-surface-container", iconColor: "#6244CD", route: "/(resident)/amenities" },
];

export default function ResidentHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const pendingQuery = trpc.visitors.listPendingForResident.useQuery(undefined, {
    refetchInterval: 5000,
  });

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
    <View className="flex-1 bg-background">
      <ScreenHeader title="Home" role="resident" />
      <ScrollView
        contentContainerClassName="gap-6 p-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={pendingQuery.isRefetching} onRefresh={() => pendingQuery.refetch()} />
        }
      >
        {user && (
          <Text className="text-headline-md font-extrabold text-on-surface">
            Hello, {user.fullName.split(" ")[0]}! 👋
          </Text>
        )}

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="notifications-none" size={20} color="#FEB246" />
              <Text className="text-headline-md font-extrabold text-on-surface">Pending Approvals</Text>
            </View>
            <Pressable onPress={() => router.push("/(resident)/visitor-history")}>
              <Text className="text-body-sm font-bold text-primary-container">View All</Text>
            </Pressable>
          </View>

          {pendingQuery.isLoading ? (
            <ListLoading />
          ) : pendingQuery.isError ? (
            <View className="rounded-card bg-surface">
              <EmptyState
                title="Couldn't load pending requests"
                description="Pull down to refresh and try again."
                icon="error-outline"
              />
            </View>
          ) : pending.length === 0 ? (
            <View className="rounded-card bg-surface">
              <EmptyState
                title="No pending requests"
                description="You're all caught up — new visitor and delivery requests will show up here."
                icon="notifications-none"
              />
            </View>
          ) : (
            <View className="gap-3">
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

        <View className="gap-3">
          <Text className="text-headline-md font-extrabold text-on-surface">Quick Actions</Text>
          {[QUICK_ACTIONS.slice(0, 2), QUICK_ACTIONS.slice(2, 4)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-3">
              {row.map((action) => (
                <PressableScale
                  key={action.label}
                  scaleTo={0.97}
                  disabled={!action.route}
                  onPress={() => action.route && router.push(action.route)}
                  className="flex-1 items-center gap-3 rounded-card bg-surface p-5"
                  style={shadowCard}
                >
                  <View className={`h-12 w-12 items-center justify-center rounded-full ${action.tint}`}>
                    <MaterialIcons name={action.icon} size={22} color={action.iconColor} />
                  </View>
                  <Text className="text-center text-body-sm font-bold text-on-surface">{action.label}</Text>
                </PressableScale>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
