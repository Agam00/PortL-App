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
import { StatusDot } from "../../components/ui/status-dot";
import { shadowCard, shadowElevated } from "../../lib/shadows";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

function statusTone(status: string, isOverdue: boolean): { label: string; tone: "green" | "amber" | "red" } {
  if (status === "paid") return { label: "PAID", tone: "green" };
  if (isOverdue) return { label: "OVERDUE", tone: "red" };
  return { label: "PENDING", tone: "amber" };
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
  const unpaid = dues.filter((d) => d.status !== "paid");
  const outstanding = unpaid.reduce((sum, d) => sum + Number(d.amount), 0);
  const nextDue = unpaid.slice().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Maintenance Dues" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={duesQuery.isRefetching} onRefresh={() => duesQuery.refetch()} />}
      >
        <View className="items-center gap-2 rounded-card bg-primary-container p-6" style={shadowElevated}>
          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="account-balance-wallet" size={16} color="#fff" />
            <Text className="text-label-caps uppercase tracking-wide text-white/80">Total Outstanding Dues</Text>
          </View>
          <Text className="text-headline-xl font-extrabold text-white">₹{outstanding.toFixed(2)}</Text>
          {nextDue && (
            <Text className="text-body-sm text-white/80">Due {new Date(nextDue.dueDate).toLocaleDateString()}</Text>
          )}
        </View>

        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load dues" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : dues.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No dues yet" description="Maintenance statements will show up here." icon="payments" />
          </View>
        ) : (
          <View className="gap-3">
            {dues.map((due) => {
              const tone = statusTone(due.status, due.isOverdue);
              const isPaid = due.status === "paid";
              return (
                <View key={due.id} className="gap-3 rounded-card bg-surface p-4" style={shadowCard}>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                        <MaterialIcons name="receipt-long" size={18} color="#6244CD" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className={`text-body-md font-bold ${isPaid ? "text-text-muted line-through" : "text-on-surface"}`}>
                          {periodLabel(due.period)} Dues
                        </Text>
                        <Text className="text-body-sm text-text-muted">
                          {isPaid && due.paidAt ? `Paid on ${new Date(due.paidAt).toLocaleDateString()}` : `Due ${new Date(due.dueDate).toLocaleDateString()}`}
                        </Text>
                      </View>
                    </View>
                    <StatusDot label={tone.label} tone={tone.tone} />
                  </View>
                  <View className="flex-row items-center justify-between border-t border-outline-variant pt-3">
                    <Text className="text-body-sm text-text-muted">Amount Due</Text>
                    <Text className={`text-headline-md font-extrabold ${isPaid ? "text-text-muted" : "text-on-surface"}`}>
                      ₹{Number(due.amount).toFixed(2)}
                    </Text>
                  </View>
                  {isPaid ? (
                    <View className="flex-row items-center justify-center gap-1.5">
                      <MaterialIcons name="check-circle" size={16} color="#27C96D" />
                      <Text className="text-body-sm text-text-muted">Paid</Text>
                    </View>
                  ) : (
                    <Button loading={payMutation.isPending} onPress={() => confirmPay(due.id, Number(due.amount).toFixed(2))}>
                      {`Pay Now (₹${Number(due.amount).toFixed(2)})`}
                    </Button>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
