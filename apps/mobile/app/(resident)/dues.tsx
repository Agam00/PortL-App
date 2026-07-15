import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

function statusTone(status: string, isOverdue: boolean) {
  if (status === "paid") return { label: "PAID", color: "text-status-green", border: "border-status-green/40" };
  if (isOverdue) return { label: "OVERDUE", color: "text-status-red", border: "border-status-red/40" };
  return { label: "PENDING", color: "text-status-amber", border: "border-status-amber/40" };
}

export default function ResidentDues() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const duesQuery = trpc.dues.mine.useQuery();
  const payMutation = trpc.dues.payMock.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Marked as paid (demo)", "success");
      utils.dues.mine.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmPay(dueId: string, amount: string) {
    Alert.alert("Confirm payment", `Pay ₹${amount} now? (demo mode — no real charge)`, [
      { text: "Cancel", style: "cancel" },
      { text: "Pay", onPress: () => payMutation.mutate({ dueId }) },
    ]);
  }

  const dues = duesQuery.data ?? [];
  const outstanding = dues
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Maintenance Dues" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={duesQuery.isRefetching} onRefresh={() => duesQuery.refetch()} />}
      >
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-body-sm text-text-muted">Manage your society monthly statements.</Text>
          <View className="items-end">
            <Text className="text-meta-text text-text-muted">Total Outstanding</Text>
            <Text className="text-headline-lg font-semibold text-status-red">₹{outstanding.toFixed(2)}</Text>
          </View>
        </View>

        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load dues" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : dues.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No dues yet" description="Maintenance statements will show up here." icon="payments" />
          </View>
        ) : (
          <View className="gap-2">
            {dues.map((due) => {
              const tone = statusTone(due.status, due.isOverdue);
              return (
                <View key={due.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1">
                      <Text className="text-body-md font-medium text-on-surface">{periodLabel(due.period)} Dues</Text>
                      <Text className="text-meta-text text-text-muted">
                        {due.status === "paid" && due.paidAt ? `Paid on ${new Date(due.paidAt).toLocaleDateString()}` : `Due ${new Date(due.dueDate).toLocaleDateString()}`}
                      </Text>
                    </View>
                    <View className={`rounded-md border px-2 py-0.5 ${tone.border}`}>
                      <Text className={`text-meta-text ${tone.color}`}>{tone.label}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-headline-md font-semibold ${due.status === "paid" ? "text-text-muted line-through" : "text-on-surface"}`}>
                      ₹{Number(due.amount).toFixed(2)}
                    </Text>
                    {due.status === "paid" ? (
                      <View className="flex-row items-center gap-1.5">
                        <MaterialIcons name="check-circle" size={16} color="#4ADE80" />
                        <Text className="text-body-sm text-text-muted">Paid</Text>
                      </View>
                    ) : (
                      <Button loading={payMutation.isPending} onPress={() => confirmPay(due.id, Number(due.amount).toFixed(2))}>
                        Pay Now
                      </Button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
