import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { useAuthStore } from "../stores/auth-store";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { getLastPushToken } from "../lib/push-notifications";
import { RoleBadge } from "./ui/role-badge";
import { shadowCard } from "../lib/shadows";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// guard_profile mockup: menu-card rows with a tinted circular icon on the left,
// bold label, and either a value or a chevron on the right.
function MenuRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  isLast,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const content = (
    <>
      <View
        className="items-center justify-center"
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: iconBg }}
      >
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text className="flex-1 text-body-lg font-bold text-on-surface">{label}</Text>
      {value ? (
        <Text className="max-w-[55%] text-right text-body-md text-text-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <MaterialIcons name="chevron-right" size={22} color="#8A8A8A" />
      )}
    </>
  );
  const rowClass = `flex-row items-center gap-4 p-4 ${isLast ? "" : "border-b border-outline-variant"}`;
  return onPress ? (
    <Pressable
      onPress={onPress}
      className={`${rowClass} active:bg-surface-container`}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  ) : (
    <View className={rowClass}>{content}</View>
  );
}

export function RoleProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUiStore((s) => s.showToast);

  const unregisterPush = trpc.pushTokens.unregister.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      logout();
      router.replace("/(auth)/login");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  async function doLogout() {
    // Stop this device from receiving pushes for the signed-out account (best-effort).
    const token = getLastPushToken();
    if (token) {
      try {
        await unregisterPush.mutateAsync({ expoPushToken: token });
      } catch {
        // ignore — logout proceeds regardless
      }
    }
    if (refreshToken) logoutMutation.mutate({ refreshToken });
    else {
      logout();
      router.replace("/(auth)/login");
    }
  }

  const deleteMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      logout();
      router.replace("/(auth)/login");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and signs you out. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Account", style: "destructive", onPress: () => deleteMutation.mutate() },
      ],
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Profile</Text>
      </View>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8 pt-4">
        <View className="items-center gap-3 bg-surface p-6" style={[{ borderRadius: 20 }, shadowCard]}>
          <View
            className="items-center justify-center bg-surface-container"
            style={{ width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: "#242424" }}
          >
            <Text className="text-headline-lg font-extrabold text-primary-container">
              {initialsFrom(user.fullName)}
            </Text>
          </View>
          <Text className="text-center text-headline-lg font-extrabold text-on-surface">{user.fullName}</Text>
          <RoleBadge role={user.role} />
          <Text className="text-center text-body-lg text-on-surface-variant">{user.phone}</Text>
        </View>

        <View className="overflow-hidden bg-surface" style={[{ borderRadius: 20 }, shadowCard]}>
          <MenuRow icon="phone" iconColor="#F5821F" iconBg="#2A2320" label="Phone" value={user.phone} />
          <MenuRow
            icon="mail-outline"
            iconColor="#845400"
            iconBg="#3A2E12"
            label="Email"
            value={user.email}
            isLast={user.role !== "resident"}
          />
          {user.role === "resident" && user.flatNumber && (
            <MenuRow
              icon="home"
              iconColor="#27C96D"
              iconBg="#12331F"
              label="Home"
              value={user.towerName ? `${user.towerName} · ${user.flatNumber}` : `Flat ${user.flatNumber}`}
            />
          )}
          {user.role === "resident" && (
            <MenuRow
              icon="directions-car"
              iconColor="#F5821F"
              iconBg="#2A2320"
              label="My Vehicles"
              onPress={() => router.push("/(resident)/vehicles")}
            />
          )}
          {user.role === "resident" && (
            <MenuRow
              icon="apartment"
              iconColor="#C4C4C4"
              iconBg="#333333"
              label="Society Directory"
              onPress={() => router.push("/(resident)/staff-directory")}
            />
          )}
          {user.role === "resident" && (
            <MenuRow
              icon="block"
              iconColor="#FF5F5F"
              iconBg="#3A1A1A"
              label="Blocked Users"
              onPress={() => router.push("/(resident)/blocked")}
              isLast
            />
          )}
        </View>

        <Pressable
          onPress={doLogout}
          disabled={logoutMutation.isPending || unregisterPush.isPending}
          className="h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: "#3A1A1A" }}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          {logoutMutation.isPending ? (
            <ActivityIndicator size="small" color="#A50E0E" />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color="#A50E0E" />
              <Text className="text-body-lg font-bold" style={{ color: "#A50E0E" }}>
                Logout
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={confirmDeleteAccount}
          disabled={deleteMutation.isPending}
          className="h-12 flex-row items-center justify-center gap-2"
          accessibilityLabel="Delete account"
          accessibilityRole="button"
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator size="small" color="#8A5050" />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={18} color="#8A5050" />
              <Text className="text-body-md font-bold" style={{ color: "#8A5050" }}>
                Delete account
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
