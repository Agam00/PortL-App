import { useState } from "react";
import { View, Text, ScrollView, Alert, ActivityIndicator } from "react-native";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";

export default function AdminGuards() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");

  const guardsQuery = trpc.admin.listGuards.useQuery();
  const guards = (guardsQuery.data ?? []).filter(
    (g) => search.trim().length === 0 || g.fullName.toLowerCase().includes(search.toLowerCase()) || g.phone.includes(search),
  );

  function resetForm() {
    setShowForm(false);
    setFullName("");
    setEmail("");
    setPhone("");
  }

  const inviteMutation = trpc.admin.inviteGuard.useMutation({
    onSuccess: (result) => {
      showToast(`Invited — temp password: ${result.tempPassword}`, "success");
      resetForm();
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const deactivateMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      showToast("Guard deactivated", "success");
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const activateMutation = trpc.admin.activateUser.useMutation({
    onSuccess: () => {
      showToast("Guard activated", "success");
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function confirmDeactivate(userId: string, name: string) {
    Alert.alert("Deactivate guard?", `${name} will lose app access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive", onPress: () => deactivateMutation.mutate({ userId }) },
    ]);
  }

  function handleInvite() {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      showToast("Fill all fields", "error");
      return;
    }
    inviteMutation.mutate({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Guards Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Manage security personnel access and active rosters.</Text>

        <Input placeholder="Search by name or phone" value={search} onChangeText={setSearch} />

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Guard"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">Invite Guard</Text>
            <Input label="Full Name" placeholder="e.g. Ramesh Kumar" value={fullName} onChangeText={setFullName} />
            <Input label="Email" placeholder="guard@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Input label="Phone" placeholder="+91XXXXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Button onPress={handleInvite} loading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </View>
        )}

        {guardsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : guards.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No guards found" description="Invite a guard to get started." icon="shield" />
          </View>
        ) : (
          <View className="gap-2">
            {guards.map((guard) => (
              <View key={guard.id} className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                <Avatar name={guard.fullName} />
                <View className="min-w-0 flex-1">
                  <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                    {guard.fullName}
                  </Text>
                  <Text className="text-meta-text text-text-muted" numberOfLines={1}>
                    {guard.phone}
                  </Text>
                </View>
                <View className={`h-1.5 w-1.5 rounded-full ${guard.isActive ? "bg-status-green" : "bg-status-red"}`} />
                {guard.isActive ? (
                  <Button variant="danger" onPress={() => confirmDeactivate(guard.id, guard.fullName)}>
                    Deactivate
                  </Button>
                ) : (
                  <Button variant="outline" loading={activateMutation.isPending} onPress={() => activateMutation.mutate({ userId: guard.id })}>
                    Activate
                  </Button>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
