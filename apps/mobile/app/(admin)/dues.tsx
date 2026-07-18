import { useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { DateField } from "../../components/ui/date-field";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { ListRowCard } from "../../components/ui/list-row-card";
import { ListLoading } from "../../components/ui/list-loading";

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
  const [flatError, setFlatError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const flatsQuery = trpc.flats.list.useQuery({});
  const duesQuery = trpc.dues.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setFlatId(null);
    setAmount("");
    setDueDate(new Date());
    setFlatError(null);
    setAmountError(null);
  }

  const createMutation = trpc.dues.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Due generated", "success");
      resetForm();
      utils.dues.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function handleSubmit() {
    const flatMissing = !flatId;
    const amountMissing = !amount.trim();
    setFlatError(flatMissing ? "Select a flat" : null);
    setAmountError(amountMissing ? "Amount is required" : null);
    if (flatMissing || amountMissing) return;

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
      <ScreenHeader
        title="Dues Management"
        subtitle="Generate maintenance dues and track payment status across the society."
        role="admin"
      />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={duesQuery.isRefetching || flatsQuery.isRefetching}
            onRefresh={() => {
              duesQuery.refetch();
              flatsQuery.refetch();
            }}
          />
        }
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Generate Due"}
        </Button>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="add-circle-outline" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">New Due</Text>
            </View>
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Flat</Text>
              <View className="flex-row flex-wrap gap-2">
                {flats.map((flat) => (
                  <Chip
                    key={flat.id}
                    label={`${flat.flatNumber}`}
                    selected={flatId === flat.id}
                    onPress={() => {
                      setFlatId(flat.id);
                      setFlatError(null);
                    }}
                  />
                ))}
              </View>
              {flatError && <Text className="text-body-sm text-status-red">{flatError}</Text>}
            </View>
            <Input
              label="Amount"
              placeholder="e.g. 2500"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                if (amountError) setAmountError(null);
              }}
              error={amountError ?? undefined}
            />
            <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
            <Text className="text-meta-text text-text-muted">Billing period: {periodLabel(toPeriodString(dueDate))}</Text>
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              Generate Due
            </Button>
          </FormPanel>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <Chip key={f} label={f === "all" ? "All" : f === "pending" ? "Pending" : "Paid"} selected={statusFilter === f} onPress={() => setStatusFilter(f)} />
          ))}
        </ScrollView>

        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load dues" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : dues.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No dues found" description="Generate a due above to get started." icon="payments" />
          </View>
        ) : (
          <View className="gap-2">
            {dues.map((due) => (
              <ListRowCard key={due.id} className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
                    {due.flatNumber} · {periodLabel(due.period)}
                  </Text>
                  <Text className="text-body-sm text-text-muted">₹{Number(due.amount).toFixed(2)}</Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor:
                      due.status === "paid"
                        ? "rgba(39,201,109,0.16)"
                        : due.isOverdue
                          ? "rgba(186,26,26,0.10)"
                          : "rgba(254,178,70,0.28)",
                  }}
                >
                  <Text
                    className="text-meta-text font-semibold uppercase"
                    style={{ color: due.status === "paid" ? "#1B7A44" : due.isOverdue ? "#BA1A1A" : "#845400" }}
                  >
                    {due.status === "paid" ? "Paid" : due.isOverdue ? "Overdue" : "Pending"}
                  </Text>
                </View>
              </ListRowCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
