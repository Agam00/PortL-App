import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { ListRowCard } from "../../components/ui/list-row-card";
import { ListLoading } from "../../components/ui/list-loading";

export default function AdminGuards() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const guardsQuery = trpc.admin.listGuards.useQuery();
  const guards = (guardsQuery.data ?? []).filter(
    (g) => search.trim().length === 0 || g.fullName.toLowerCase().includes(search.toLowerCase()) || g.phone.includes(search),
  );

  function resetForm() {
    setShowForm(false);
    setFullName("");
    setEmail("");
    setPhone("");
    setFullNameError(null);
    setEmailError(null);
    setPhoneError(null);
  }

  const inviteMutation = trpc.admin.inviteGuard.useMutation({
    onSuccess: (result) => {
      hapticSuccess();
      showToast(`Invited — temp password: ${result.tempPassword}`, "success");
      resetForm();
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const deactivateMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Guard deactivated", "success");
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const activateMutation = trpc.admin.activateUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Guard activated", "success");
      utils.admin.listGuards.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmDeactivate(userId: string, name: string) {
    Alert.alert("Deactivate guard?", `${name} will lose app access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive", onPress: () => deactivateMutation.mutate({ userId }) },
    ]);
  }

  function handleInvite() {
    const fullNameMissing = !fullName.trim();
    const emailMissing = !email.trim();
    const phoneMissing = !phone.trim();
    setFullNameError(fullNameMissing ? "Full name is required" : null);
    setEmailError(emailMissing ? "Email is required" : null);
    setPhoneError(phoneMissing ? "Phone is required" : null);
    if (fullNameMissing || emailMissing || phoneMissing) return;

    inviteMutation.mutate({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Guards Management" role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={guardsQuery.isRefetching} onRefresh={() => guardsQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Manage security personnel access and active rosters.</Text>

        <Input placeholder="Search by name or phone" value={search} onChangeText={setSearch} />

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Guard"}
        </Button>

        {showForm && (
          <FormPanel>
            <Text className="text-body-md font-semibold text-on-surface">Invite Guard</Text>
            <Input
              label="Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                if (fullNameError) setFullNameError(null);
              }}
              error={fullNameError ?? undefined}
            />
            <Input
              label="Email"
              placeholder="guard@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError(null);
              }}
              error={emailError ?? undefined}
            />
            <Input
              label="Phone"
              placeholder="+91XXXXXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (phoneError) setPhoneError(null);
              }}
              error={phoneError ?? undefined}
            />
            <Button onPress={handleInvite} loading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </FormPanel>
        )}

        {guardsQuery.isLoading ? (
          <ListLoading />
        ) : guardsQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load guards" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : guards.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No guards found" description="Invite a guard to get started." icon="shield" />
          </View>
        ) : (
          <View className="gap-2">
            {guards.map((guard) => (
              <ListRowCard key={guard.id} className="flex-row items-center gap-3">
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
              </ListRowCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
