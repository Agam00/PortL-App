import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Modal, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { shadowElevated } from "../../lib/shadows";

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1).toLocaleDateString([], { month: "short", year: "numeric" });
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
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
  const [target, setTarget] = useState<"flat" | "all">("flat");
  const [flatId, setFlatId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [flatError, setFlatError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Proof viewer
  const [proofDueId, setProofDueId] = useState<string | null>(null);

  const flatsQuery = trpc.flats.list.useQuery({});
  const duesQuery = trpc.dues.list.useQuery();
  const proofQuery = trpc.dues.proof.useQuery({ dueId: proofDueId ?? "" }, { enabled: !!proofDueId });

  function resetForm() {
    setShowForm(false);
    setTarget("flat");
    setFlatId(null);
    setTitle("");
    setAmount("");
    setDueDate(new Date());
    setFlatError(null);
    setAmountError(null);
  }

  const createMutation = trpc.dues.create.useMutation({
    onSuccess: (res) => {
      hapticSuccess();
      showToast(res.count > 1 ? `Due sent to ${res.count} flats` : "Due generated", "success");
      resetForm();
      utils.dues.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const approveMutation = trpc.dues.approvePayment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Payment approved — marked paid", "success");
      utils.dues.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const rejectMutation = trpc.dues.rejectPayment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Payment rejected — back to pending", "success");
      utils.dues.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function handleSubmit() {
    const flatMissing = target === "flat" && !flatId;
    const amountMissing = !amount.trim();
    setFlatError(flatMissing ? "Select a flat" : null);
    setAmountError(amountMissing ? "Amount is required" : null);
    if (flatMissing || amountMissing) return;

    createMutation.mutate({
      title: title.trim() || undefined,
      amount: Number.parseFloat(amount),
      dueDate: toDateString(dueDate),
      ...(target === "all" ? { applyToAll: true } : { flatId: flatId! }),
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
          <RefreshControl
            tintColor="#F5821F"
            colors={["#F5821F"]}
            progressBackgroundColor="#1A1A1A"
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
              style={{ backgroundColor: "#1A1A1A", borderRadius: 20, borderWidth: 1, borderColor: "#333333", padding: 18, gap: 6 }}
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
              <Text className="text-body-md font-bold text-on-surface">New Payment</Text>
            </View>

            {/* target toggle */}
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Send to</Text>
              <View className="flex-row gap-2">
                <Chip label="Specific flat" selected={target === "flat"} onPress={() => setTarget("flat")} />
                <Chip label="All residents" selected={target === "all"} onPress={() => setTarget("all")} />
              </View>
            </View>

            {target === "flat" && (
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
            )}

            <Input
              label="Title (optional)"
              placeholder="e.g. Diwali fund, Water bill"
              value={title}
              onChangeText={setTitle}
            />
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
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              {target === "all" ? "Send to All Residents" : "Generate Due"}
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
          <View style={{ backgroundColor: "#1A1A1A", borderRadius: 20, borderWidth: 1, borderColor: "#333333", overflow: "hidden" }}>
            {dues.map((due, index) => {
              const paid = due.status === "paid";
              const overdue = !paid && due.isOverdue;
              const underReview = !paid && due.hasProof && !due.verified;
              const pillColor = paid ? "#8A8A8A" : underReview ? "#7B8CFF" : overdue ? "#FF5F5F" : "#F5821F";
              const pillLabel = paid ? "PAID" : underReview ? "REVIEW" : overdue ? "OVERDUE" : "DUE";
              const busy = approveMutation.isPending || rejectMutation.isPending;
              return (
                <View
                  key={due.id}
                  style={{ padding: 20, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: "#333333", gap: 14 }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-section-header font-bold text-on-surface" numberOfLines={1}>
                        {due.flatNumber}
                      </Text>
                      <Text className="mt-0.5 text-body-sm text-text-muted" numberOfLines={1}>
                        {due.title ?? periodLabel(due.period)}
                      </Text>
                    </View>
                    {paid && due.hasProof && (
                      <Pressable
                        onPress={() => setProofDueId(due.id)}
                        hitSlop={8}
                        className="items-center justify-center rounded-full"
                        style={{ width: 34, height: 34, backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
                        accessibilityLabel={`View payment proof for ${due.flatNumber}`}
                      >
                        <MaterialIcons name="receipt-long" size={18} color="#27C96D" />
                      </Pressable>
                    )}
                    <Text className="text-body-lg font-bold text-on-surface">₹{Number(due.amount).toLocaleString("en-IN")}</Text>
                    <View
                      className="items-center justify-center rounded-full px-3 py-1"
                      style={paid ? { backgroundColor: "#242424" } : { borderWidth: 1, borderColor: pillColor }}
                    >
                      <Text className="text-label-caps font-semibold uppercase" style={{ color: pillColor }}>
                        {pillLabel}
                      </Text>
                    </View>
                  </View>

                  {underReview && (
                    <View className="flex-row items-center gap-2 border-t pt-3" style={{ borderTopColor: "#333333" }}>
                      <Pressable
                        onPress={() => setProofDueId(due.id)}
                        className="flex-row items-center gap-1.5"
                        accessibilityLabel={`View payment proof for ${due.flatNumber}`}
                      >
                        <MaterialIcons name="image" size={18} color="#F5821F" />
                        <Text className="text-body-sm font-bold text-primary">View proof</Text>
                      </Pressable>
                      <View className="flex-1" />
                      <Pressable
                        onPress={() => rejectMutation.mutate({ dueId: due.id })}
                        disabled={busy}
                        className="rounded-full px-4 py-2"
                        style={{ borderWidth: 1, borderColor: "#FF5F5F", opacity: busy ? 0.5 : 1 }}
                        accessibilityLabel={`Reject payment for ${due.flatNumber}`}
                      >
                        <Text className="text-body-sm font-bold" style={{ color: "#FF5F5F" }}>Reject</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => approveMutation.mutate({ dueId: due.id })}
                        disabled={busy}
                        className="rounded-full px-4 py-2"
                        style={{ backgroundColor: "#27C96D", opacity: busy ? 0.5 : 1 }}
                        accessibilityLabel={`Approve payment for ${due.flatNumber}`}
                      >
                        <Text className="text-body-sm font-bold" style={{ color: "#08210F" }}>Approve</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ProofModal
        visible={!!proofDueId}
        loading={proofQuery.isLoading}
        image={proofQuery.data?.proofImage ?? null}
        onClose={() => setProofDueId(null)}
      />
    </View>
  );
}

function ProofModal({
  visible,
  loading,
  image,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  image: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          className="w-full items-center gap-4 p-5"
          style={[{ backgroundColor: "#1A1A1A", borderRadius: 24, paddingBottom: insets.bottom + 20 }, shadowElevated]}
        >
          <Text className="text-body-lg font-extrabold text-on-surface">Payment Proof</Text>
          {loading ? (
            <ActivityIndicator color="#F5821F" style={{ marginVertical: 40 }} />
          ) : image ? (
            <Image source={{ uri: image }} style={{ width: "100%", height: 380, borderRadius: 12 }} resizeMode="contain" />
          ) : (
            <Text className="py-10 text-body-md text-text-muted">No screenshot attached.</Text>
          )}
          <Pressable
            onPress={onClose}
            className="h-12 w-full items-center justify-center rounded-full"
            style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
            accessibilityLabel="Close"
          >
            <Text className="text-body-md font-bold text-on-surface">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
