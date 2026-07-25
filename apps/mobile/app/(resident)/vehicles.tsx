import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

type VType = "car" | "bike" | "other";
const TYPES: { key: VType; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { key: "car", label: "Car", icon: "directions-car" },
  { key: "bike", label: "Bike", icon: "two-wheeler" },
  { key: "other", label: "Other", icon: "commute" },
];
const iconFor = (t: VType) => TYPES.find((x) => x.key === t)?.icon ?? "commute";

export default function ResidentVehicles() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<VType>("car");
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState<string | null>(null);

  const query = trpc.vehicles.mine.useQuery();
  const vehicles = query.data ?? [];

  function resetForm() {
    setShowForm(false);
    setType("car");
    setNumber("");
    setNumberError(null);
  }

  const createMutation = trpc.vehicles.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Vehicle added", "success");
      resetForm();
      utils.vehicles.mine.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  const deleteMutation = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Vehicle removed", "success");
      utils.vehicles.mine.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  function handleAdd() {
    if (number.trim().length < 2) {
      setNumberError("Enter the vehicle number");
      return;
    }
    createMutation.mutate({ type, number: number.trim() });
  }

  function confirmDelete(id: string, num: string) {
    Alert.alert("Remove vehicle?", `${num} will be removed from your profile.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate({ vehicleId: id }) },
    ]);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">My Vehicles</Text>
        <Pressable
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
          hitSlop={8}
          accessibilityLabel={showForm ? "Close" : "Add vehicle"}
          accessibilityRole="button"
        >
          <Text className="text-body-lg font-bold text-primary">{showForm ? "Close" : "+ Add"}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-10 pt-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            tintColor="#F5821F"
            colors={["#F5821F"]}
            progressBackgroundColor="#1A1A1A"
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
          />
        }
      >
        {showForm && (
          <View className="gap-4 rounded-2xl bg-surface p-5" style={shadowCard}>
            <Text className="text-body-lg font-extrabold text-on-surface">Add a vehicle</Text>
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Type</Text>
              <View className="flex-row gap-2">
                {TYPES.map((t) => {
                  const selected = type === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setType(t.key)}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3"
                      style={{ backgroundColor: selected ? "#F5821F" : "#242424" }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <MaterialIcons name={t.icon} size={18} color={selected ? "#FFFFFF" : "#8A8A8A"} />
                      <Text className="text-body-md font-bold" style={{ color: selected ? "#FFFFFF" : "#C4C4C4" }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Input
              label="Vehicle Number"
              placeholder="e.g. KA 01 AB 1234"
              autoCapitalize="characters"
              autoCorrect={false}
              value={number}
              onChangeText={(v) => {
                setNumber(v);
                if (numberError) setNumberError(null);
              }}
              error={numberError ?? undefined}
            />
            <Pressable
              onPress={handleAdd}
              disabled={createMutation.isPending}
              className="h-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F5821F", opacity: createMutation.isPending ? 0.7 : 1 }}
              accessibilityLabel="Save vehicle"
              accessibilityRole="button"
            >
              <Text className="text-body-md font-bold text-white">
                {createMutation.isPending ? "Adding..." : "Add Vehicle"}
              </Text>
            </Pressable>
          </View>
        )}

        {query.isLoading ? (
          <ListLoading />
        ) : query.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load vehicles" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : vehicles.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState
              title="No vehicles added"
              description="Add the vehicles you own so security can identify them at the gate."
              icon="directions-car"
            />
          </View>
        ) : (
          <View className="gap-3">
            {vehicles.map((v) => (
              <View key={v.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
                <View
                  className="items-center justify-center"
                  style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "#2A2320" }}
                >
                  <MaterialIcons name={iconFor(v.type)} size={24} color="#F5821F" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                    {v.number}
                  </Text>
                  <Text className="text-body-sm text-text-muted capitalize">{v.type}</Text>
                </View>
                <Pressable
                  onPress={() => confirmDelete(v.id, v.number)}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${v.number}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="delete-outline" size={22} color="#FF5F5F" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
