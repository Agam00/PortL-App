import { View, Text, ScrollView, RefreshControl, Alert, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

// maintenance_dues mockup pills: OVERDUE = solid red, PENDING = solid amber,
// PAID = soft gray.
function statusChip(status: string, isOverdue: boolean): { label: string; bg: string; fg: string } {
  if (status === "paid") return { label: "PAID", bg: "#ECE6F2", fg: "#48454F" };
  if (isOverdue) return { label: "OVERDUE", bg: "#B3261E", fg: "#FFFFFF" };
  return { label: "PENDING", bg: "#FEB246", fg: "#3D2E00" };
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
    <View className="flex-1" style={{ backgroundColor: "#FAF7FD" }}>
      <ScreenHeader title="Maintenance Dues" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={duesQuery.isRefetching} onRefresh={() => duesQuery.refetch()} />}
      >
        <View className="items-center gap-1 rounded-xl p-6" style={{ backgroundColor: "#E7E1F0" }}>
          <Text className="text-body-sm font-bold uppercase tracking-wide" style={{ color: "#48454F" }}>
            Total Outstanding Dues
          </Text>
          <Text className="text-headline-xl font-extrabold" style={{ color: "#5B3DC4" }}>
            ₹{outstanding.toFixed(2)}
          </Text>
          {nextDue && (
            <Text className="text-body-md text-on-surface-variant">
              Due by {new Date(nextDue.dueDate).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
            </Text>
          )}
        </View>

        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load dues" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : dues.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="No dues yet" description="Maintenance statements will show up here." icon="payments" />
          </View>
        ) : (
          <View className="gap-4">
            {dues.map((due) => {
              const chip = statusChip(due.status, due.isOverdue);
              const isPaid = due.status === "paid";
              return (
                <View key={due.id} className="gap-3 rounded-xl bg-surface p-5" style={shadowCard}>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                      <View
                        className="items-center justify-center"
                        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E4DAFB" }}
                      >
                        <MaterialIcons name={isPaid ? "volunteer-activism" : "build"} size={22} color="#4A27B5" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className={`text-headline-md font-extrabold ${isPaid ? "text-text-muted line-through" : "text-on-surface"}`}
                        >
                          {periodLabel(due.period)}
                        </Text>
                        <Text className="text-body-md text-text-muted">
                          {isPaid && due.paidAt
                            ? `Paid on ${new Date(due.paidAt).toLocaleDateString()}`
                            : `Due ${new Date(due.dueDate).toLocaleDateString()}`}
                        </Text>
                      </View>
                    </View>
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: chip.bg }}>
                      <Text className="text-body-sm font-bold" style={{ color: chip.fg }}>
                        {chip.label}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="flex-row items-center justify-between pt-3"
                    style={{ borderTopWidth: 1, borderTopColor: "#EDE8F3" }}
                  >
                    <Text className="text-body-md text-text-muted">Amount Due</Text>
                    <Text className={`text-headline-md font-extrabold ${isPaid ? "text-text-muted" : "text-on-surface"}`}>
                      ₹{Number(due.amount).toFixed(2)}
                    </Text>
                  </View>
                  {!isPaid && (
                    <Pressable
                      disabled={payMutation.isPending}
                      onPress={() => confirmPay(due.id, Number(due.amount).toFixed(2))}
                      className="h-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#6244CD" }}
                      accessibilityLabel={`Pay ${Number(due.amount).toFixed(2)} now`}
                      accessibilityRole="button"
                    >
                      <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
                        {payMutation.isPending ? "Processing..." : `Pay Now (₹${Number(due.amount).toFixed(2)})`}
                      </Text>
                    </Pressable>
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
