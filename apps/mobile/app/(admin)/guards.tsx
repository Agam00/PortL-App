import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert, Switch, Pressable } from "react-native";
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
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { InviteQrModal } from "../../components/invite-qr-modal";
import { shadowCard } from "../../lib/shadows";

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
      <ScreenHeader title="Guards Management" subtitle="Manage active security personnel and gate assignments." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={guardsQuery.isRefetching} onRefresh={() => guardsQuery.refetch()} />}
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Invite Guard"}
        </Button>

        <View className="bg-surface p-3" style={[{ borderRadius: 16 }, shadowCard]}>
          <Input placeholder="Search guards..." value={search} onChangeText={setSearch} />
        </View>

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
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load guards" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : guards.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No guards found" description="Invite a guard to get started." icon="shield" />
          </View>
        ) : (
          <View className="gap-4">
            {guards.map((guard) => (
              <View
                key={guard.id}
                className="gap-3 bg-surface p-5"
                style={[{ borderRadius: 20, opacity: guard.isActive ? 1 : 0.75 }, shadowCard]}
              >
                <View className="flex-row items-center gap-4">
                  <Avatar name={guard.fullName} size={52} />
                  <View className="min-w-0 flex-1">
                    <Text
                      className={`text-headline-md font-extrabold ${guard.isActive ? "text-on-surface" : "text-text-muted"}`}
                      numberOfLines={1}
                    >
                      {guard.fullName}
                    </Text>
                    <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                      {guard.phone}
                    </Text>
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
                  <Pressable
                    onPress={() => setInvite({ name: guard.fullName, code: guard.inviteCode! })}
                    className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
                    style={{ backgroundColor: "#2A2320" }}
                    accessibilityLabel={`Show invite QR for ${guard.fullName}`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="qr-code-2" size={16} color="#F5821F" />
                    <Text className="text-body-sm font-bold text-primary-container">
                      Pending activation — show QR
                    </Text>
                  </Pressable>
                )}

                <View style={{ height: 1, backgroundColor: "rgba(51,51,51,0.45)" }} />

                <View className="flex-row">
                  <View className="flex-1 gap-1">
                    <Text className="text-meta-text text-text-muted">Email</Text>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="mail-outline" size={14} color="#F5821F" />
                      <Text className="min-w-0 flex-1 text-body-sm font-semibold text-on-surface" numberOfLines={1}>
                        {guard.email}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-meta-text text-text-muted">Status</Text>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons
                        name={guard.isActive ? "verified-user" : "do-not-disturb"}
                        size={14}
                        color={guard.isActive ? "#27C96D" : "#8A8A8A"}
                      />
                      <Text className="text-body-sm font-semibold text-on-surface">
                        {guard.isActive ? "On Duty Access" : "Access Revoked"}
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
