import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { DueOutput } from "@repo/services/due/model";
import { trpc } from "../../lib/trpc";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard, shadowElevated } from "../../lib/shadows";

function paymentTitle(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y ?? 2026, (m ?? 1) - 1);
  const mon = d.toLocaleDateString([], { month: "short" });
  const yy = String((y ?? 2026) % 100).padStart(2, "0");
  return `Maintenance ${mon}'${yy}`;
}

function dateTimeLabel(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "long" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "long" });
}

// PAID = green, PENDING = gold, OVERDUE = red (the mockup's "FAILED" red slot).
function statusPill(due: DueOutput): { label: string; bg: string; fg: string } {
  if (due.status === "paid") return { label: "PAID", bg: "#3DBE5D", fg: "#FFFFFF" };
  if (due.isOverdue) return { label: "OVERDUE", bg: "#E5484D", fg: "#FFFFFF" };
  return { label: "PENDING", bg: "#EFC050", fg: "#3D2E00" };
}

const FILTERS = ["All", "Pending", "Paid", "Overdue"] as const;

export default function ResidentDues() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [showFilter, setShowFilter] = useState(false);
  const [receipt, setReceipt] = useState<DueOutput | null>(null);

  const duesQuery = trpc.dues.mine.useQuery();

  function startPay(due: DueOutput) {
    router.push({
      pathname: "/(resident)/pay",
      params: {
        dueId: due.id,
        title: paymentTitle(due.period),
        amount: Number(due.amount).toFixed(2),
        dueDate: due.dueDate,
        overdue: due.isOverdue ? "1" : "0",
      },
    });
  }

  const dues = duesQuery.data ?? [];
  const filtered = dues.filter((d) => {
    if (filter === "Paid") return d.status === "paid";
    if (filter === "Overdue") return d.status !== "paid" && d.isOverdue;
    if (filter === "Pending") return d.status !== "paid" && !d.isOverdue;
    return true;
  });

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">Payments</Text>
        <Pressable onPress={() => setShowFilter((v) => !v)} hitSlop={8} accessibilityLabel="Filter payments" accessibilityRole="button">
          <MaterialIcons name="filter-list" size={24} color="#F5F5F5" />
        </Pressable>
      </View>

      {showFilter && (
        <View className="mx-5 mb-2 flex-row flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                  setShowFilter(false);
                }}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: active ? "#F5821F" : "#242424" }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text className="text-body-sm font-bold" style={{ color: active ? "#FFFFFF" : "#F5821F" }}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-10 pt-1"
        refreshControl={<RefreshControl refreshing={duesQuery.isRefetching} onRefresh={() => duesQuery.refetch()} />}
      >
        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load payments" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title={filter === "All" ? "No payments yet" : `No ${filter.toLowerCase()} payments`}
              description="Maintenance statements will show up here."
              icon="payments"
            />
          </View>
        ) : (
          filtered.map((due) => {
            const pill = statusPill(due);
            const isPaid = due.status === "paid";
            return (
              <View key={due.id} className="gap-2 rounded-2xl bg-surface p-4" style={shadowCard}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="min-w-0 flex-1 text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                    {paymentTitle(due.period)}
                  </Text>
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: pill.bg }}>
                    <Text className="text-meta-text font-extrabold" style={{ color: pill.fg }}>
                      {pill.label}
                    </Text>
                  </View>
                </View>

                <Text className="text-headline-md font-extrabold text-on-surface">₹{Number(due.amount).toFixed(2)}</Text>

                <View className="mt-1 h-px" style={{ backgroundColor: "#2A2A2A" }} />

                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-body-sm text-text-muted">
                    {isPaid && due.paidAt ? `Paid on ${dateTimeLabel(due.paidAt)}` : `Due date ${dateLabel(due.dueDate)}`}
                  </Text>
                  {isPaid ? (
                    <Pressable
                      onPress={() => setReceipt(due)}
                      className="flex-row items-center gap-1.5"
                      accessibilityLabel="View receipt"
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="receipt-long" size={18} color="#2E9E4B" />
                      <Text className="text-body-sm font-bold" style={{ color: "#2E7D32" }}>
                        Receipt
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => startPay(due)}
                      className="flex-row items-center gap-1.5"
                      accessibilityLabel={`Pay ${Number(due.amount).toFixed(2)} now`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="attach-money" size={18} color="#2E9E4B" />
                      <Text className="text-body-sm font-bold" style={{ color: "#2E7D32" }}>
                        Pay Now
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Receipt modal */}
      <Modal visible={!!receipt} animationType="fade" transparent onRequestClose={() => setReceipt(null)}>
        <Pressable className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(20,17,24,0.5)" }} onPress={() => setReceipt(null)}>
          <Pressable className="w-full gap-4 rounded-3xl bg-surface p-6" style={shadowElevated} onPress={() => {}}>
            <View className="items-center gap-2">
              <View className="items-center justify-center rounded-full" style={{ width: 56, height: 56, backgroundColor: "#14301C" }}>
                <MaterialIcons name="check-circle" size={34} color="#3DBE5D" />
              </View>
              <Text className="text-headline-md font-extrabold text-on-surface">Payment Receipt</Text>
              <Text className="text-body-sm text-text-muted">Demo payment — no real charge</Text>
            </View>

            {receipt && (
              <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: "#1F1F1F" }}>
                <ReceiptRow label="For" value={paymentTitle(receipt.period)} />
                <ReceiptRow label="Amount" value={`₹${Number(receipt.amount).toFixed(2)}`} />
                {receipt.paidAt && <ReceiptRow label="Paid on" value={dateTimeLabel(receipt.paidAt)} />}
                <ReceiptRow label="Flat" value={`${receipt.towerName} · ${receipt.flatNumber}`} />
                <ReceiptRow label="Receipt ID" value={`PMT-${receipt.id.slice(0, 8).toUpperCase()}`} />
              </View>
            )}

            <Pressable
              onPress={() => setReceipt(null)}
              className="h-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F5821F" }}
              accessibilityLabel="Close receipt"
              accessibilityRole="button"
            >
              <Text className="text-body-md font-bold text-white">Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-body-sm text-text-muted">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-body-md font-bold text-on-surface" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
