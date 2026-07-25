import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  plumber: "plumbing",
  plumbers: "plumbing",
  electrician: "electrical-services",
  electricians: "electrical-services",
  cook: "restaurant",
  cleaner: "cleaning-services",
  maid: "cleaning-services",
  carpenter: "handyman",
  painter: "format-paint",
  gardener: "grass",
};

function categoryIcon(category: string): React.ComponentProps<typeof MaterialIcons>["name"] {
  return CATEGORY_ICON[category.trim().toLowerCase()] ?? "badge";
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AdminStaff() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const staffQuery = trpc.staffDirectory.list.useQuery();
  const staff = (staffQuery.data ?? []).filter(
    (s) => search.trim().length === 0 || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()),
  );
  const staffByCategory = new Map<string, typeof staff>();
  for (const entry of staff) {
    const key = titleCase(entry.category.trim());
    const list = staffByCategory.get(key) ?? [];
    list.push(entry);
    staffByCategory.set(key, list);
  }

  function resetForm() {
    setShowForm(false);
    setName("");
    setCategory("");
    setPhone("");
    setNameError(null);
    setCategoryError(null);
    setPhoneError(null);
  }

  const createMutation = trpc.staffDirectory.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Staff entry added", "success");
      resetForm();
      utils.staffDirectory.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const updateMutation = trpc.staffDirectory.update.useMutation({
    onSuccess: () => {
      hapticSuccess();
      utils.staffDirectory.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.staffDirectory.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Staff entry removed", "success");
      utils.staffDirectory.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmDelete(staffId: string, label: string) {
    Alert.alert("Remove entry?", `${label} will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ staffId }) },
    ]);
  }

  function handleSubmit() {
    const nameMissing = !name.trim();
    const categoryMissing = !category.trim();
    const phoneMissing = !phone.trim();
    setNameError(nameMissing ? "Name is required" : null);
    setCategoryError(categoryMissing ? "Category is required" : null);
    setPhoneError(phoneMissing ? "Contact number is required" : null);
    if (nameMissing || categoryMissing || phoneMissing) return;

    createMutation.mutate({ name: name.trim(), category: category.trim(), phone: phone.trim() });
  }

  return (
    <View className="flex-1 bg-background">
      <AdminHeader showBack barTitle="Staff Directory" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={staffQuery.isRefetching} onRefresh={() => staffQuery.refetch()} />}
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Provider"}
        </Button>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="add-circle-outline" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">New Provider</Text>
            </View>
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) setNameError(null);
              }}
              error={nameError ?? undefined}
            />
            <Input
              label="Category"
              placeholder="e.g. plumber, electrician, cook"
              value={category}
              onChangeText={(v) => {
                setCategory(v);
                if (categoryError) setCategoryError(null);
              }}
              error={categoryError ?? undefined}
            />
            <Input
              label="Contact Number"
              placeholder="+91XXXXXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (phoneError) setPhoneError(null);
              }}
              error={phoneError ?? undefined}
            />
            <Button onPress={handleSubmit} loading={createMutation.isPending}>
              Submit Entry
            </Button>
          </FormPanel>
        )}

        <Input placeholder="Search staff by name or category..." value={search} onChangeText={setSearch} />

        {staffQuery.isLoading ? (
          <ListLoading />
        ) : staffQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load staff directory" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : staff.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No staff entries" description="Add a staff or service provider above." icon="badge" />
          </View>
        ) : (
          Array.from(staffByCategory.entries()).map(([categoryName, entries]) => (
            <View key={categoryName} className="gap-3">
              <View className="flex-row items-center gap-2 pt-1">
                <MaterialIcons name={categoryIcon(categoryName)} size={22} color="#E19613" />
                <Text className="text-headline-md font-extrabold text-on-surface">{categoryName}</Text>
              </View>

              {entries.map((entry) => (
                <View key={entry.id} className="gap-4 bg-surface p-5" style={[{ borderRadius: 20 }, shadowCard]}>
                  <View className="flex-row items-center gap-4">
                    <Avatar name={entry.name} size={52} />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                          {entry.name}
                        </Text>
                        <Pressable
                          onPress={() => updateMutation.mutate({ staffId: entry.id, isVerifiedByAdmin: !entry.isVerifiedByAdmin })}
                          hitSlop={8}
                          accessibilityLabel={entry.isVerifiedByAdmin ? `Mark ${entry.name} as unverified` : `Mark ${entry.name} as verified`}
                          accessibilityRole="button"
                        >
                          <MaterialIcons
                            name="verified"
                            size={18}
                            color={entry.isVerifiedByAdmin ? "#F5821F" : "#6E6E6E"}
                          />
                        </Pressable>
                      </View>
                      <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                        {titleCase(entry.category)}
                        {entry.isVerifiedByAdmin ? "" : " · Unverified"}
                      </Text>
                    </View>
                    <IconButton
                      icon="delete-outline"
                      color="#BA1A1A"
                      onPress={() => confirmDelete(entry.id, entry.name)}
                      accessibilityLabel={`Delete ${entry.name}`}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-body-lg text-on-surface-variant" numberOfLines={1}>
                      {entry.phone}
                    </Text>
                    <PressableScale
                      scaleTo={0.92}
                      onPress={() => Linking.openURL(`tel:${entry.phone}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${entry.name}`}
                      className="items-center justify-center bg-surface-container"
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    >
                      <MaterialIcons name="call" size={22} color="#F5821F" />
                    </PressableScale>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
