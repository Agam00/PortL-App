import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { pickImageFromGallery } from "../../lib/capture-visitor-photo";
import { shadowCard, shadowElevated } from "../../lib/shadows";

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

  const [proof, setProof] = useState<string | null>(null);

  const submitMutation = trpc.dues.submitUpiPayment.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Submitted — waiting for admin approval", "success");
      utils.dues.mine.invalidate();
      router.back();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  async function attach() {
    try {
      const uri = await pickImageFromGallery();
      if (uri) setProof(uri);
    } catch {
      showToast("Couldn't open your gallery.", "error");
    }
  }

  const isOverdue = overdue === "1";
  const pill = isOverdue
    ? { label: "OVERDUE", bg: "#E5484D", fg: "#FFFFFF" }
    : { label: "PENDING", bg: "#EFC050", fg: "#3D2E00" };
  const dueLabel = dueDate ? new Date(dueDate).toLocaleDateString([], { day: "2-digit", month: "long" }) : null;

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Pay Dues</Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 px-4 pt-1"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
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

        {/* How-to note */}
        <View className="flex-row items-start gap-2 rounded-xl px-3 py-3" style={{ backgroundColor: "#1A1A1A" }}>
          <MaterialIcons name="info-outline" size={18} color="#F5821F" />
          <Text className="flex-1 text-body-sm text-on-surface-variant">
            Pay the maintenance to the society (UPI, bank transfer or cash), then upload your payment screenshot here as
            proof. The admin can view it.
          </Text>
        </View>

        {/* Attach screenshot */}
        <View className="gap-3">
          <Text className="text-body-md font-bold text-text-muted">Payment screenshot</Text>
          {proof ? (
            <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-3" style={shadowCard}>
              <Image source={{ uri: proof }} style={{ width: 64, height: 64, borderRadius: 8 }} />
              <View className="min-w-0 flex-1">
                <Text className="text-body-md font-bold text-on-surface">Screenshot attached</Text>
                <Text className="text-body-sm text-text-muted">This is your proof of payment.</Text>
              </View>
              <Pressable onPress={attach} hitSlop={8} accessibilityLabel="Change screenshot">
                <Text className="text-body-sm font-bold text-primary">Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={attach}
              className="items-center justify-center gap-2 rounded-2xl bg-surface py-8"
              style={[shadowCard, { borderWidth: 1.5, borderColor: "#333333", borderStyle: "dashed" }]}
              accessibilityRole="button"
              accessibilityLabel="Attach payment screenshot"
            >
              <MaterialIcons name="add-photo-alternate" size={32} color="#8A8A8A" />
              <Text className="text-body-md font-bold text-on-surface-variant">Attach payment screenshot</Text>
              <Text className="text-body-sm text-text-muted">Tap to pick it from your gallery</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Fixed submit */}
      <View
        className="absolute inset-x-0 bottom-0 px-4"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 8, backgroundColor: "#0D0D0D" }}
      >
        <Pressable
          onPress={() => dueId && proof && submitMutation.mutate({ dueId, proofImage: proof })}
          disabled={submitMutation.isPending || !dueId || !proof}
          className="h-14 items-center justify-center rounded-2xl"
          style={[
            { backgroundColor: !proof ? "#7A5320" : "#F5821F", opacity: submitMutation.isPending ? 0.7 : 1 },
            shadowElevated,
          ]}
          accessibilityLabel="Submit payment"
          accessibilityRole="button"
        >
          <Text className="text-body-lg font-bold text-white">
            {submitMutation.isPending ? "Submitting..." : proof ? "Submit Payment" : "Attach screenshot to submit"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
