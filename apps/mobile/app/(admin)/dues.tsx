import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { DateField } from "../../components/ui/date-field";
import { EmptyState } from "../../components/ui/empty-state";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function toPeriodString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default function AdminDues() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");

  const flatsQuery = trpc.flats.list.useQuery({});
  const duesQuery = trpc.dues.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setFlatId(null);
    setAmount("");
    setDueDate(new Date());
  }

  const createMutation = trpc.dues.create.useMutation({
    onSuccess: () => {
      showToast("Due generated", "success");
      resetForm();
      utils.dues.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function handleSubmit() {
    if (!flatId || !amount.trim()) {
      showToast("Fill all fields and select a flat", "error");
      return;
    }
    createMutation.mutate({
      flatId,
      period: toPeriodString(dueDate),
      amount: Number.parseFloat(amount),
      dueDate: toDateString(dueDate),
    });
  }

  const flats = flatsQuery.data ?? [];
  const dues = (duesQuery.data ?? []).filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "paid") return d.status === "paid";
    return d.status !== "paid";
  });

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dues Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Generate maintenance dues and track payment status across the society.</Text>

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Generate Due"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">New Due</Text>
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Flat</Text>
              <View className="flex-row flex-wrap gap-2">
                {flats.map((flat) => (
                  <Chip key={flat.id} label={`${flat.flatNumber}`} selected={flatId === flat.id} onPress={() => setFlatId(flat.id)} />
                ))}
              </View>
            </View>
            <Input label="Amount" placeholder="e.g. 2500" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
            <Text className="text-meta-text text-text-muted">Billing period: {periodLabel(toPeriodString(dueDate))}</Text>
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              Generate Due
            </Button>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <Chip key={f} label={f === "all" ? "All" : f === "pending" ? "Pending" : "Paid"} selected={statusFilter === f} onPress={() => setStatusFilter(f)} />
          ))}
        </ScrollView>

        {duesQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : dues.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No dues found" description="Generate a due above to get started." icon="payments" />
          </View>
        ) : (
          <View className="gap-2">
            {dues.map((due) => (
              <View key={due.id} className="flex-row items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                    {due.flatNumber} · {periodLabel(due.period)}
                  </Text>
                  <Text className="text-meta-text text-text-muted">₹{Number(due.amount).toFixed(2)}</Text>
                </View>
                <View
                  className={`rounded-md border px-2 py-0.5 ${
                    due.status === "paid" ? "border-status-green/40" : due.isOverdue ? "border-status-red/40" : "border-status-amber/40"
                  }`}
                >
                  <Text
                    className={`text-meta-text uppercase ${
                      due.status === "paid" ? "text-status-green" : due.isOverdue ? "text-status-red" : "text-status-amber"
                    }`}
                  >
                    {due.status === "paid" ? "Paid" : due.isOverdue ? "Overdue" : "Pending"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
