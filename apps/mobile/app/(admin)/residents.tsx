import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, Switch } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { InviteQrModal } from "../../components/invite-qr-modal";

const FILTERS = ["All Residents", "Active", "Inactive"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminResidents() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flatId, setFlatId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Residents");
  const [invite, setInvite] = useState<{ name: string; code: string } | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignFlatId, setReassignFlatId] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [flatError, setFlatError] = useState<string | null>(null);

  const residentsQuery = trpc.admin.listResidents.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});

  const residents = (residentsQuery.data ?? [])
    .filter(
      (r) =>
        search.trim().length === 0 ||
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search) ||
        r.flatNumber?.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((r) => (filter === "Active" ? r.isActive : filter === "Inactive" ? !r.isActive : true));

  function resetForm() {
    setShowForm(false);
    setFullName("");
    setEmail("");
    setPhone("");
    setFlatId("");
    setFullNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setFlatError(null);
  }

  const inviteMutation = trpc.admin.inviteResident.useMutation({
    onSuccess: (result) => {
      hapticSuccess();
      setInvite({ name: result.user.fullName, code: result.inviteCode });
      resetForm();
      utils.admin.listResidents.invalidate();
      utils.flats.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const deactivateMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Resident deactivated", "success");
      utils.admin.listResidents.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const activateMutation = trpc.admin.activateUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Resident activated", "success");
      utils.admin.listResidents.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const reassignMutation = trpc.admin.reassignResidentFlat.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Flat reassigned", "success");
      setReassigningId(null);
      setReassignFlatId("");
      utils.admin.listResidents.invalidate();
      utils.flats.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Resident deleted", "success");
      utils.admin.listResidents.invalidate();
      utils.flats.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmDeactivate(userId: string, name: string) {
    Alert.alert("Deactivate resident?", `${name} will lose app access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive", onPress: () => deactivateMutation.mutate({ userId }) },
    ]);
  }

  function confirmDelete(userId: string, name: string) {
    Alert.alert(
      "Delete resident?",
      `${name}'s account and login are removed for good, and the flat is freed up. Past posts and gate logs stay in the society records.`,
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
    const flatMissing = !flatId;
    setFullNameError(fullNameMissing ? "Full name is required" : null);
    setEmailError(emailMissing ? "Email is required" : null);
    setPhoneError(phoneMissing ? "Phone is required" : null);
    setFlatError(flatMissing ? "Select a flat" : null);
    if (fullNameMissing || emailMissing || phoneMissing || flatMissing) return;

    inviteMutation.mutate({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), flatId });
  }

  const flats = flatsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <AdminHeader
        showBack
        barTitle="Residents"
        action={{ label: showForm ? "Close" : "+ Add", onPress: () => (showForm ? resetForm() : setShowForm(true)) }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={residentsQuery.isRefetching || flatsQuery.isRefetching}
            onRefresh={() => {
              residentsQuery.refetch();
              flatsQuery.refetch();
            }}
          />
        }
      >
        <Input
          placeholder="Search residents..."
          value={search}
          onChangeText={setSearch}
          leftElement={<MaterialIcons name="search" size={20} color="#8A8A8A" />}
        />

        {!showForm && (
          <Button onPress={() => setShowForm(true)}>+ Add Resident</Button>
        )}

        <View className="flex-row flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="person-add-alt" size={20} color="#F5821F" />
              <Text className="text-body-md font-bold text-on-surface">Invite Resident</Text>
            </View>
            <Input
              label="Full Name"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                if (fullNameError) setFullNameError(null);
              }}
              error={fullNameError ?? undefined}
            />
            <Input
              label="Email"
              placeholder="jane@example.com"
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
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Flat</Text>
              {flats.length === 0 ? (
                <Text className="text-body-sm text-text-muted">No flats yet — add one under Flats Management.</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {flats.map((flat) => (
                    <Pressable
                      key={flat.id}
                      onPress={() => {
                        setFlatId(flat.id);
                        setFlatError(null);
                      }}
                      className={`rounded-md border px-3 py-1.5 ${flatId === flat.id ? "border-primary-container bg-surface" : "border-outline-variant"}`}
                    >
                      <Text className={`text-body-sm ${flatId === flat.id ? "text-primary-container" : "text-on-surface-variant"}`}>
                        {flat.flatNumber}
                        {flat.residentCount > 0 ? ` (${flat.residentCount})` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {flatError && <Text className="text-body-sm text-status-red">{flatError}</Text>}
            </View>
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={resetForm}>
                Cancel
              </Button>
              <Button className="flex-1" onPress={handleInvite} loading={inviteMutation.isPending}>
                Create & Get QR
              </Button>
            </View>
            <Text className="text-center text-meta-text text-text-muted">
              You'll get an invite QR to share — they scan it and pick their own password.
            </Text>
          </FormPanel>
        )}

        {residentsQuery.isLoading ? (
          <ListLoading />
        ) : residentsQuery.isError ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load residents" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : residents.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No residents found" description="Invite a resident to get started." icon="group" />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {residents.map((resident) => {
              const pending = !!resident.inviteCode;
              return (
                <View
                  key={resident.id}
                  style={{
                    backgroundColor: "#1A1A1A",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#333333",
                    padding: 20,
                    overflow: "hidden",
                  }}
                >
                  {pending && (
                    <View
                      style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", backgroundColor: "rgba(245,130,31,0.5)" }}
                    />
                  )}

                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 flex-row items-center gap-4">
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
                        <Text
                          className="font-bold"
                          style={{ fontSize: 15, color: pending ? "#F5F5F5" : "#F5821F" }}
                        >
                          {initials(resident.fullName)}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-section-header font-bold text-on-surface" numberOfLines={1}>
                          {resident.fullName}
                        </Text>
                        <Text className="mt-1 text-body-sm text-text-muted" numberOfLines={1}>
                          {resident.flatNumber ? `Flat ${resident.flatNumber}` : "Unassigned"}
                          {resident.phone ? ` · ${resident.phone}` : ""}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {pending && (
                    <Pressable
                      onPress={() => setInvite({ name: resident.fullName, code: resident.inviteCode! })}
                      className="mt-3 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
                      style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#F5821F" }}
                      accessibilityLabel={`Show invite QR for ${resident.fullName}`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="qr-code-2" size={14} color="#F5821F" />
                      <Text className="text-label-caps font-semibold uppercase text-primary">Pending activation</Text>
                    </Pressable>
                  )}

                  <View
                    className="mt-4 flex-row items-center justify-between pt-4"
                    style={{ borderTopWidth: 1, borderTopColor: "#333333" }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-body-sm text-text-muted">Access</Text>
                      <Switch
                        value={resident.isActive}
                        onValueChange={(next) => {
                          if (next) {
                            activateMutation.mutate({ userId: resident.id });
                          } else {
                            confirmDeactivate(resident.id, resident.fullName);
                          }
                        }}
                        trackColor={{ false: "#333333", true: "#F5821F" }}
                        thumbColor="#FFFFFF"
                        accessibilityLabel={`${resident.isActive ? "Deactivate" : "Activate"} ${resident.fullName}`}
                      />
                    </View>
                    <View className="flex-row items-center gap-1">
                      <IconButton
                        icon="swap-horiz"
                        size={20}
                        onPress={() => {
                          setReassigningId(reassigningId === resident.id ? null : resident.id);
                          setReassignFlatId("");
                        }}
                        accessibilityLabel={`Reassign flat for ${resident.fullName}`}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        onPress={() => confirmDelete(resident.id, resident.fullName)}
                        accessibilityLabel={`Delete ${resident.fullName}`}
                      />
                    </View>
                  </View>

                  {reassigningId === resident.id && (
                    <View className="mt-3 gap-2 border-t border-outline-variant pt-3">
                      <Text className="text-label-caps uppercase text-text-muted">Move to flat</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {flats
                          .filter((flat) => flat.id !== resident.flatId)
                          .map((flat) => (
                            <Pressable
                              key={flat.id}
                              onPress={() => setReassignFlatId(flat.id)}
                              className={`rounded-md border px-3 py-1.5 ${reassignFlatId === flat.id ? "border-primary-container bg-surface-container" : "border-outline-variant"}`}
                            >
                              <Text className={`text-body-sm ${reassignFlatId === flat.id ? "text-primary-container" : "text-on-surface-variant"}`}>
                                {flat.flatNumber}
                                {flat.residentCount > 0 ? ` (${flat.residentCount})` : ""}
                              </Text>
                            </Pressable>
                          ))}
                      </View>
                      <Button
                        disabled={!reassignFlatId}
                        loading={reassignMutation.isPending}
                        onPress={() => reassignMutation.mutate({ userId: resident.id, flatId: reassignFlatId })}
                      >
                        Confirm Move
                      </Button>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <InviteQrModal
        visible={!!invite}
        name={invite?.name ?? ""}
        code={invite?.code ?? null}
        roleLabel="Resident"
        onClose={() => setInvite(null)}
      />
    </View>
  );
}
