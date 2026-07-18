import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { shadowCard, shadowElevated } from "../../lib/shadows";

const METHODS: { key: string; label: string; img: ImageSourcePropType }[] = [
  { key: "credit", label: "Credit Card", img: require("../../assets/payments/credit-card.png") },
  { key: "debit", label: "Debit Card", img: require("../../assets/payments/credit-card.png") },
  { key: "banking", label: "Online Banking", img: require("../../assets/payments/bank.png") },
  { key: "paypal", label: "Pay Pal", img: require("../../assets/payments/money-wings.png") },
  { key: "cash", label: "Pay Cash to admin", img: require("../../assets/payments/banknote.png") },
];

export default function PayDue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const { dueId, title, amount, dueDate, overdue } = useLocalSearchParams<{
    dueId?: string;
    title?: string;
    amount?: string;
    dueDate?: string;
    overdue?: string;
  }>();

  const [method, setMethod] = useState("credit");

  const payMutation = trpc.dues.payMock.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Payment successful (demo)", "success");
      utils.dues.mine.invalidate();
      router.back();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const isOverdue = overdue === "1";
  const pill = isOverdue ? { label: "OVERDUE", bg: "#E5484D", fg: "#FFFFFF" } : { label: "PENDING", bg: "#EFC050", fg: "#3D2E00" };
  const dueLabel = dueDate ? new Date(dueDate).toLocaleDateString([], { day: "2-digit", month: "long" }) : null;

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Payments</Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-4 pt-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View className="gap-2 rounded-2xl bg-surface p-4" style={shadowCard}>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="min-w-0 flex-1 text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
              {title ?? "Payment"}
            </Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: pill.bg }}>
              <Text className="text-meta-text font-extrabold" style={{ color: pill.fg }}>
                {pill.label}
              </Text>
            </View>
          </View>
          <Text className="text-headline-md font-extrabold text-on-surface">₹{amount ?? "0.00"}</Text>
          {dueLabel && (
            <>
              <View className="mt-1 h-px" style={{ backgroundColor: "#2A2A2A" }} />
              <Text className="pt-1 text-body-sm text-text-muted">Due date {dueLabel}</Text>
            </>
          )}
        </View>

        <Text className="text-body-md font-bold text-text-muted">Select Payment Methods</Text>

        <View className="gap-3">
          {METHODS.map((m) => {
            const selected = method === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMethod(m.key)}
                className="flex-row items-center gap-3 rounded-2xl bg-surface p-3.5"
                style={[shadowCard, selected ? { borderWidth: 2, borderColor: "#F5821F" } : { borderWidth: 2, borderColor: "transparent" }]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={m.label}
              >
                <Image source={m.img} style={{ width: 40, height: 40 }} resizeMode="contain" />
                <Text className="flex-1 text-body-lg font-bold text-on-surface">{m.label}</Text>
                <MaterialIcons
                  name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                  size={22}
                  color={selected ? "#F5821F" : "#6E6E6E"}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed Confirm & Pay */}
      <View className="absolute inset-x-0 bottom-0 px-4" style={{ paddingBottom: insets.bottom + 12, paddingTop: 8, backgroundColor: "#0D0D0D" }}>
        <Pressable
          onPress={() => dueId && payMutation.mutate({ dueId })}
          disabled={payMutation.isPending || !dueId}
          className="h-14 items-center justify-center rounded-2xl"
          style={[{ backgroundColor: "#F5821F", opacity: payMutation.isPending ? 0.7 : 1 }, shadowElevated]}
          accessibilityLabel="Confirm and pay"
          accessibilityRole="button"
        >
          <Text className="text-body-lg font-bold text-white">
            {payMutation.isPending ? "Processing..." : `Confirm & Pay ₹${amount ?? ""}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
