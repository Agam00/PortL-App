import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";

export default function AdminResidents() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flatId, setFlatId] = useState("");
  const [search, setSearch] = useState("");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignFlatId, setReassignFlatId] = useState("");

  const residentsQuery = trpc.admin.listResidents.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});

  const residents = (residentsQuery.data ?? []).filter(
    (r) =>
      search.trim().length === 0 ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) ||
      r.flatNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  function resetForm() {
    setShowForm(false);
    setFullName("");
    setEmail("");
    setPhone("");
    setFlatId("");
  }

  const inviteMutation = trpc.admin.inviteResident.useMutation({
    onSuccess: (result) => {
      showToast(`Invited — temp password: ${result.tempPassword}`, "success");
      resetForm();
      utils.admin.listResidents.invalidate();
      utils.flats.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const deactivateMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      showToast("Resident deactivated", "success");
      utils.admin.listResidents.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const activateMutation = trpc.admin.activateUser.useMutation({
    onSuccess: () => {
      showToast("Resident activated", "success");
      utils.admin.listResidents.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const reassignMutation = trpc.admin.reassignResidentFlat.useMutation({
    onSuccess: () => {
      showToast("Flat reassigned", "success");
      setReassigningId(null);
      setReassignFlatId("");
      utils.admin.listResidents.invalidate();
      utils.flats.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function confirmDeactivate(userId: string, name: string) {
    Alert.alert("Deactivate resident?", `${name} will lose app access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive", onPress: () => deactivateMutation.mutate({ userId }) },
    ]);
  }

  function handleInvite() {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !flatId) {
      showToast("Fill all fields and select a flat", "error");
      return;
    }
    inviteMutation.mutate({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), flatId });
  }

  const flats = flatsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Residents Management" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Directory and access control for society members.</Text>

        <Input placeholder="Search residents..." value={search} onChangeText={setSearch} />

        <Button
          variant={showForm ? "outline" : "primary"}
          onPress={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ Invite Resident"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">Invite Resident</Text>
            <Input label="Full Name" placeholder="e.g. Jane Doe" value={fullName} onChangeText={setFullName} />
            <Input label="Email" placeholder="jane@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Input label="Phone" placeholder="+91XXXXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Flat</Text>
              {flats.length === 0 ? (
                <Text className="text-body-sm text-text-muted">No flats yet — add one under Flats Management.</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {flats.map((flat) => (
                    <Pressable
                      key={flat.id}
                      onPress={() => setFlatId(flat.id)}
                      className={`rounded-md border px-3 py-1.5 ${flatId === flat.id ? "border-primary-container bg-white/5" : "border-border-subtle"}`}
                    >
                      <Text className={`text-body-sm ${flatId === flat.id ? "text-primary-container" : "text-on-surface-variant"}`}>
                        {flat.flatNumber}
                        {flat.residentCount > 0 ? ` (${flat.residentCount})` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Button onPress={handleInvite} loading={inviteMutation.isPending}>
              Send Invitation
            </Button>
          </View>
        )}

        {residentsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : residents.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No residents found" description="Invite a resident to get started." icon="group" />
          </View>
        ) : (
          <View className="gap-2">
            {residents.map((resident) => (
              <View key={resident.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                <View className="flex-row items-center gap-3">
                  <Avatar name={resident.fullName} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
                      {resident.fullName}
                    </Text>
                    <Text className="text-meta-text text-text-muted" numberOfLines={1}>
                      {resident.flatNumber ? `${resident.flatNumber} · ${resident.towerName}` : "Unassigned"} · {resident.phone}
                    </Text>
                  </View>
                  <View className={`h-1.5 w-1.5 rounded-full ${resident.isActive ? "bg-status-green" : "bg-status-red"}`} />
                </View>
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => {
                      setReassigningId(reassigningId === resident.id ? null : resident.id);
                      setReassignFlatId("");
                    }}
                  >
                    Reassign Flat
                  </Button>
                  {resident.isActive ? (
                    <Button variant="danger" className="flex-1" onPress={() => confirmDeactivate(resident.id, resident.fullName)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1"
                      loading={activateMutation.isPending}
                      onPress={() => activateMutation.mutate({ userId: resident.id })}
                    >
                      Activate
                    </Button>
                  )}
                </View>
                {reassigningId === resident.id && (
                  <View className="gap-2 border-t border-border-subtle pt-3">
                    <Text className="text-label-caps uppercase text-text-muted">Move to flat</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {flats
                        .filter((flat) => flat.id !== resident.flatId)
                        .map((flat) => (
                          <Pressable
                            key={flat.id}
                            onPress={() => setReassignFlatId(flat.id)}
                            className={`rounded-md border px-3 py-1.5 ${reassignFlatId === flat.id ? "border-primary-container bg-white/5" : "border-border-subtle"}`}
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
    </View>
  );
}
