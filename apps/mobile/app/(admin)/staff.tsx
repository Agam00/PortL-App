import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";

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
      <ScreenHeader title="Staff Directory" role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={staffQuery.isRefetching} onRefresh={() => staffQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Manage personnel, roles, and verification status.</Text>

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Staff"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">New Entry</Text>
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
          </View>
        )}

        <Input placeholder="Search staff by name or category..." value={search} onChangeText={setSearch} />

        {staffQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : staffQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load staff directory" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : staff.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No staff entries" description="Add a staff or service provider above." icon="badge" />
          </View>
        ) : (
          <View className="gap-2">
            {staff.map((entry) => (
              <View key={entry.id} className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                <Avatar name={entry.name} />
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text className="text-meta-text text-text-muted" numberOfLines={1}>
                    {entry.category} · {entry.phone}
                  </Text>
                </View>
                <Pressable
                  onPress={() => updateMutation.mutate({ staffId: entry.id, isVerifiedByAdmin: !entry.isVerifiedByAdmin })}
                  className={`rounded-md border px-2 py-1 ${entry.isVerifiedByAdmin ? "border-status-green/40" : "border-border-subtle"}`}
                  accessibilityLabel={entry.isVerifiedByAdmin ? `Mark ${entry.name} as unverified` : `Mark ${entry.name} as verified`}
                  accessibilityRole="button"
                >
                  <Text className={`text-meta-text ${entry.isVerifiedByAdmin ? "text-status-green" : "text-text-muted"}`}>
                    {entry.isVerifiedByAdmin ? "Verified" : "Unverified"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(entry.id, entry.name)}
                  hitSlop={8}
                  className="p-1"
                  accessibilityLabel={`Delete ${entry.name}`}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
