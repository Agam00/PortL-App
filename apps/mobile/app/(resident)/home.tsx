import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { VisitorRequestCard } from "../../components/visitor-request-card";

const QUICK_ACTIONS: {
  label: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { label: "Pre-Approve", meta: "Generate pass", icon: "qr-code-scanner" },
  { label: "Help Desk", meta: "Raise ticket", icon: "support-agent" },
  { label: "Dues", meta: "View balance", icon: "payments" },
  { label: "Bookings", meta: "Amenities", icon: "event" },
];

export default function ResidentHome() {
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const pendingQuery = trpc.visitors.listPendingForResident.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const decideMutation = trpc.visitors.decide.useMutation({
    onSuccess: () => {
      utils.visitors.listPendingForResident.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
    onSettled: () => setDecidingId(null),
  });

  const pending = pendingQuery.data ?? [];

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
          <Text className="text-body-sm text-text-muted">
            Good morning, {user.fullName.split(" ")[0]}
          </Text>
        )}

        <View className="gap-3">
          <Text className="text-headline-md font-semibold text-on-surface">
            Pending Approvals
          </Text>

          {pending.length === 0 ? (
            <View className="rounded-lg border border-border-subtle bg-surface-elevated">
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
                  onReject={() => {
                    setDecidingId(visitor.id);
                    decideMutation.mutate({ visitorId: visitor.id, decision: "rejected" });
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <View
              key={action.label}
              className="min-w-[45%] flex-1 gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4"
            >
              <MaterialIcons name={action.icon} size={20} color="#5e6ad2" />
              <View>
                <Text className="text-body-md font-medium text-on-surface">{action.label}</Text>
                <Text className="text-meta-text text-text-muted">{action.meta}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
