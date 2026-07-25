import { useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { DateField } from "../../components/ui/date-field";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { ListLoading } from "../../components/ui/list-loading";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "short", year: "numeric" });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function toPeriodString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function inr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(n)}`;
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
  const allDues = duesQuery.data ?? [];
  const collected = allDues.filter((d) => d.status === "paid").reduce((sum, d) => sum + Number(d.amount), 0);
  const pending = allDues.filter((d) => d.status !== "paid").reduce((sum, d) => sum + Number(d.amount), 0);

  const dues = allDues.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "paid") return d.status === "paid";
    return d.status !== "paid";
  });

  return (
    <View className="flex-1 bg-background">
      <AdminHeader
        showBack
        barTitle="Portl"
        centerBar
        bigTitle="Maintenance Dues"
        action={{ label: showForm ? "Close" : "+ Add", onPress: () => (showForm ? resetForm() : setShowForm(true)) }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={duesQuery.isRefetching || flatsQuery.isRefetching}
            onRefresh={() => {
              duesQuery.refetch();
              flatsQuery.refetch();
            }}
          />
        }
      >
        {/* Summary tiles */}
        <View className="flex-row" style={{ gap: 16 }}>
          {[
            { label: "Collected", value: inr(collected), color: "#27C96D" },
            { label: "Pending", value: inr(pending), color: "#F5821F" },
          ].map((tile) => (
            <View
              key={tile.label}
              className="flex-1"
              style={{
                backgroundColor: "#1A1A1A",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#333333",
                padding: 18,
                gap: 6,
              }}
            >
              <Text className="text-body-md text-text-muted">{tile.label}</Text>
              <Text className="font-extrabold" style={{ fontSize: 28, color: tile.color }}>
                {tile.value}
              </Text>
            </View>
          ))}
        </View>

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

        <View className="flex-row gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <Chip key={f} label={f === "all" ? "All" : f === "pending" ? "Pending" : "Paid"} selected={statusFilter === f} onPress={() => setStatusFilter(f)} />
          ))}
        </View>

        {duesQuery.isLoading ? (
          <ListLoading />
        ) : duesQuery.isError ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load dues" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : dues.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No dues found" description="Generate a due above to get started." icon="payments" />
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#1A1A1A",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#333333",
              overflow: "hidden",
            }}
          >
            {dues.map((due, index) => {
              const paid = due.status === "paid";
              const overdue = !paid && due.isOverdue;
              const pillColor = paid ? "#8A8A8A" : overdue ? "#FF5F5F" : "#F5821F";
              const pillLabel = paid ? "PAID" : overdue ? "OVERDUE" : "DUE";
              return (
                <View
                  key={due.id}
                  className="flex-row items-center gap-3"
                  style={{
                    padding: 20,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: "#333333",
                  }}
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-section-header font-bold text-on-surface" numberOfLines={1}>
                      {due.flatNumber}
                    </Text>
                    <Text className="mt-0.5 text-body-sm text-text-muted" numberOfLines={1}>
                      {periodLabel(due.period)}
                    </Text>
                  </View>
                  <Text className="text-body-lg font-bold text-on-surface">₹{Number(due.amount).toLocaleString("en-IN")}</Text>
                  <View
                    className="items-center justify-center rounded-full px-3 py-1"
                    style={
                      paid
                        ? { backgroundColor: "#242424" }
                        : { borderWidth: 1, borderColor: pillColor }
                    }
                  >
                    <Text className="text-label-caps font-semibold uppercase" style={{ color: pillColor }}>
                      {pillLabel}
                    </Text>
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
