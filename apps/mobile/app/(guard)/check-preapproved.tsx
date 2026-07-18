import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { shadowCard } from "../../lib/shadows";

function expectedTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// check_pre_approved mockup: large 24px-radius result card with a soft tinted corner
// blob, tinted type avatar, inner "Visiting" unit sub-card, and a full-width pill CTA
// ("Confirm Entry" violet, or "Log Delivery" gray for deliveries).
function PreApprovedCard({
  visitor,
  isLoading,
  onConfirm,
}: {
  visitor: VisitorOutput;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  const isDelivery = visitor.type === "delivery";
  const tint = isDelivery ? "rgba(254,178,70,0.18)" : "rgba(245,130,31,0.10)";
  const iconColor = isDelivery ? "#845400" : "#F5821F";

  return (
    <View className="gap-4 bg-surface p-5" style={[{ borderRadius: 24, overflow: "hidden" }, shadowCard]}>
      <View
        style={{
          position: "absolute",
          top: -28,
          right: -28,
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: tint,
        }}
      />
      <View className="flex-row items-center gap-4">
        <View className="items-center justify-center" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint }}>
          <MaterialIcons name={isDelivery ? "local-shipping" : "person-outline"} size={26} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-headline-md font-extrabold text-on-surface" numberOfLines={1}>
              {visitor.name}
            </Text>
            {isDelivery && (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "#845400" }}>
                <Text className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: 0.5, color: "#FFFFFF" }}>
                  Package
                </Text>
              </View>
            )}
          </View>
          {isDelivery && visitor.validFrom ? (
            <View className="flex-row items-center gap-1.5">
              <MaterialIcons name="schedule" size={16} color="#C4C4C4" />
              <Text className="text-body-md text-on-surface-variant">Expected {expectedTime(visitor.validFrom)}</Text>
            </View>
          ) : visitor.phone ? (
            <View className="flex-row items-center gap-1.5">
              <MaterialIcons name="smartphone" size={16} color="#C4C4C4" />
              <Text className="text-body-md text-on-surface-variant">{visitor.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        className="flex-row items-center gap-3 bg-surface p-3"
        style={{ borderRadius: 12, borderWidth: 1, borderColor: "#6E6E6E" }}
      >
        <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tint }}>
          <MaterialIcons name="apartment" size={22} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body-sm text-text-muted">{isDelivery ? "Delivery for" : "Visiting"}</Text>
          <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
            {visitor.flatNumber ? `Unit ${visitor.flatNumber}` : "Unknown flat"}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onConfirm}
        disabled={isLoading}
        className="h-12 flex-row items-center justify-center gap-2 rounded-full"
        style={{ backgroundColor: isDelivery ? "#262626" : "#F5821F" }}
        accessibilityLabel={`${isDelivery ? "Log delivery" : "Confirm entry"} for ${visitor.name}`}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isDelivery ? "#F5F5F5" : "#fff"} />
        ) : (
          <>
            <MaterialIcons
              name={isDelivery ? "fact-check" : "check-circle-outline"}
              size={20}
              color={isDelivery ? "#F5F5F5" : "#FFFFFF"}
            />
            <Text className="text-body-md font-bold" style={{ color: isDelivery ? "#F5F5F5" : "#FFFFFF" }}>
              {isDelivery ? "Log Delivery" : "Confirm Entry"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function CheckPreApproved() {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.visitors.searchPreApproved.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 },
  );

  const markEntryMutation = trpc.visitors.markEntry.useMutation({
    onSuccess: (visitor) => {
      hapticSuccess();
      showToast(`${visitor.name} checked in — no call needed`, "success");
      utils.visitors.listForGuard.invalidate();
      router.push("/(guard)/gate");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const results = searchQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Check Guest" subtitle="Verify pre-approved visitors instantly." role="guard" />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View
          className="flex-row items-center gap-3 px-4"
          style={{ borderRadius: 16, backgroundColor: "#242424", paddingVertical: 4 }}
        >
          <MaterialIcons name="search" size={24} color="#F5821F" />
          <TextInput
            placeholder="Search by Name or Phone..."
            placeholderTextColor="#8A8A8A"
            value={query}
            onChangeText={setQuery}
            className="flex-1 py-3 text-body-lg text-on-surface"
            accessibilityLabel="Search pre-approved visitors by name or phone"
          />
        </View>

        {searchQuery.isFetching && <ActivityIndicator size="small" color="#F5821F" />}

        {debounced.length > 0 && !searchQuery.isFetching && results.length > 0 && (
          <View className="flex-row items-center justify-between">
            <Text className="font-bold uppercase text-on-surface" style={{ fontSize: 14, letterSpacing: 1.5 }}>
              Matching Pre-Approvals
            </Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#FF9A3D" }}>
              <Text className="text-body-sm font-bold" style={{ color: "#FFFFFF" }}>
                {results.length} Found
              </Text>
            </View>
          </View>
        )}

        {debounced.length > 0 && !searchQuery.isFetching && results.length === 0 && (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title="No matching pre-approval"
              description="Nothing found for that name or phone — try registering them as a new visitor instead."
              icon="search-off"
            />
          </View>
        )}

        <View className="gap-4">
          {results.map((visitor) => (
            <PreApprovedCard
              key={visitor.id}
              visitor={visitor}
              isLoading={actingOnId === visitor.id && markEntryMutation.isPending}
              onConfirm={() => {
                setActingOnId(visitor.id);
                markEntryMutation.mutate({ visitorId: visitor.id });
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
