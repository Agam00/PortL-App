import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, Switch } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

const FILTERS = ["All Residents", "Active", "Inactive"] as const;

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
      showToast(`Invited — temp password: ${result.tempPassword}`, "success");
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

  function confirmDeactivate(userId: string, name: string) {
    Alert.alert("Deactivate resident?", `${name} will lose app access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive", onPress: () => deactivateMutation.mutate({ userId }) },
    ]);
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
      <ScreenHeader title="Residents" subtitle="Manage and connect with your community members." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-24 pt-2"
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
        <Input placeholder="Search name or flat..." value={search} onChangeText={setSearch} />

        <View className="flex-row flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>

        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="person-add-alt" size={20} color="#6244CD" />
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
                Send Invitation
              </Button>
            </View>
          </FormPanel>
        )}

        {residentsQuery.isLoading ? (
          <ListLoading />
        ) : residentsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load residents" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : residents.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No residents found" description="Invite a resident to get started." icon="group" />
          </View>
        ) : (
          <View className="gap-4">
            {residents.map((resident) => (
              <View key={resident.id} className="gap-3 bg-surface p-5" style={[{ borderRadius: 20 }, shadowCard]}>
                <View className="flex-row items-start gap-4">
                  <Avatar name={resident.fullName} size={56} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                      {resident.fullName}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="door-front" size={14} color="#6244CD" />
                      <Text className="text-body-sm font-semibold text-primary" numberOfLines={1}>
                        {resident.flatNumber ? `Flat ${resident.flatNumber}${resident.towerName ? ` · ${resident.towerName}` : ""}` : "Unassigned"}
                      </Text>
                    </View>
                  </View>
                  <IconButton
                    icon="swap-horiz"
                    size={20}
                    onPress={() => {
                      setReassigningId(reassigningId === resident.id ? null : resident.id);
                      setReassignFlatId("");
                    }}
                    accessibilityLabel={`Reassign flat for ${resident.fullName}`}
                  />
                </View>

                <View className="gap-2">
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="mail-outline" size={18} color="#797585" />
                    <Text className="min-w-0 flex-1 text-body-sm text-on-surface-variant" numberOfLines={1}>
                      {resident.email}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="phone" size={18} color="#797585" />
                    <Text className="min-w-0 flex-1 text-body-sm text-on-surface-variant" numberOfLines={1}>
                      {resident.phone || "--"}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: "rgba(202,196,214,0.45)" }} />

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: resident.isActive ? "#FEB246" : "#CAC4D6",
                      }}
                    />
                    <Text className="text-body-sm text-on-surface-variant">{resident.isActive ? "Active" : "Inactive"}</Text>
                  </View>
                  <Switch
                    value={resident.isActive}
                    onValueChange={(next) => {
                      if (next) {
                        activateMutation.mutate({ userId: resident.id });
                      } else {
                        confirmDeactivate(resident.id, resident.fullName);
                      }
                    }}
                    trackColor={{ false: "#E3DEEB", true: "#6244CD" }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={`${resident.isActive ? "Deactivate" : "Activate"} ${resident.fullName}`}
                  />
                </View>

                {reassigningId === resident.id && (
                  <View className="gap-2 border-t border-outline-variant pt-3">
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
            ))}
          </View>
        )}
      </ScrollView>

      {/* mockup: violet person-add FAB bottom-right toggles the invite form */}
      <PressableScale
        scaleTo={0.92}
        onPress={() => (showForm ? resetForm() : setShowForm(true))}
        accessibilityRole="button"
        accessibilityLabel={showForm ? "Close invite form" : "Invite resident"}
        style={[
          {
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "#7B5FE8",
            alignItems: "center",
            justifyContent: "center",
          },
          shadowCard,
        ]}
      >
        <MaterialIcons name={showForm ? "close" : "person-add-alt"} size={26} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}
