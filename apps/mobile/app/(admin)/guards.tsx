import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, Switch } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { InviteQrModal } from "../../components/invite-qr-modal";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminGuards() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [invite, setInvite] = useState<{ name: string; code: string } | null>(null);
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
      setInvite({ name: result.user.fullName, code: result.inviteCode });
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

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Guard deleted", "success");
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

  function confirmDelete(userId: string, name: string) {
    Alert.alert(
      "Delete guard?",
      `${name}'s account and login are removed for good. Their past gate logs stay in the society records.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ userId }) },
      ],
    );
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
      <AdminHeader
        showBack
        barTitle="Guards"
        action={{ label: showForm ? "Close" : "+ Add", onPress: () => (showForm ? resetForm() : setShowForm(true)) }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={guardsQuery.isRefetching} onRefresh={() => guardsQuery.refetch()} />}
      >
        <Input
          placeholder="Search guards..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#8A8A8A" />}
        />

        {!showForm && <Button onPress={() => setShowForm(true)}>+ Add Guard</Button>}

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="person-add-alt" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">Invite Guard</Text>
            </View>
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
              Create & Get QR
            </Button>
            <Text className="text-center text-meta-text text-text-muted">
              You'll get an invite QR to share — they scan it and pick their own password.
            </Text>
          </FormPanel>
        )}

        {guardsQuery.isLoading ? (
          <ListLoading />
        ) : guardsQuery.isError ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load guards" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : guards.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No guards found" description="Invite a guard to get started." icon="shield" />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {guards.map((guard) => (
              <View
                key={guard.id}
                style={{
                  backgroundColor: "#1A1A1A",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#333333",
                  padding: 20,
                  opacity: guard.isActive ? 1 : 0.7,
                }}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "#242424",
                      borderWidth: 1,
                      borderColor: "#333333",
                    }}
                  >
                    <Text className="font-bold" style={{ fontSize: 15, color: guard.isActive ? "#F5821F" : "#8A8A8A" }}>
                      {initials(guard.fullName)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-section-header font-bold text-on-surface" numberOfLines={1}>
                      {guard.fullName}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <MaterialIcons name="phone-iphone" size={14} color="#8A8A8A" />
                      <Text className="min-w-0 flex-1 text-body-sm text-text-muted" numberOfLines={1}>
                        {guard.phone}
                      </Text>
                    </View>
                  </View>
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    onPress={() => confirmDelete(guard.id, guard.fullName)}
                    accessibilityLabel={`Delete ${guard.fullName}`}
                  />
                  <Switch
                    value={guard.isActive}
                    onValueChange={(next) => {
                      if (next) {
                        activateMutation.mutate({ userId: guard.id });
                      } else {
                        confirmDeactivate(guard.id, guard.fullName);
                      }
                    }}
                    trackColor={{ false: "#333333", true: "#F5821F" }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={`${guard.isActive ? "Deactivate" : "Activate"} ${guard.fullName}`}
                  />
                </View>

                {guard.inviteCode && (
                  <View
                    className="mt-3 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
                    style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#F5821F" }}
                  >
                    <MaterialIcons name="qr-code-2" size={14} color="#F5821F" />
                    <Text
                      onPress={() => setInvite({ name: guard.fullName, code: guard.inviteCode! })}
                      className="text-label-caps font-semibold uppercase text-primary"
                    >
                      Pending activation
                    </Text>
                  </View>
                )}

                <View style={{ height: 1, backgroundColor: "#333333", marginVertical: 16 }} />

                <View className="flex-row">
                  <View className="flex-1 gap-1">
                    <Text className="text-label-caps uppercase text-text-muted">Email</Text>
                    <Text className="text-body-sm text-on-surface-variant" numberOfLines={1}>
                      {guard.email}
                    </Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-label-caps uppercase text-text-muted">Status</Text>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons
                        name={guard.isActive ? "shield" : "gpp-bad"}
                        size={15}
                        color={guard.isActive ? "#F5821F" : "#8A8A8A"}
                      />
                      <Text
                        className="text-body-sm font-semibold"
                        style={{ color: guard.isActive ? "#F5821F" : "#8A8A8A" }}
                      >
                        {guard.isActive ? "On Duty Access" : "Off Duty"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <InviteQrModal
        visible={!!invite}
        name={invite?.name ?? ""}
        code={invite?.code ?? null}
        roleLabel="Guard"
        onClose={() => setInvite(null)}
      />
    </View>
  );
}
