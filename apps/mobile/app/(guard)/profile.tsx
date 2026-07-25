import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticTap } from "../../lib/haptics";
import { shadowCard } from "../../lib/shadows";

// Society contact numbers the guard can reach in one tap. Seed data uses the
// admin's number for both; swap these for the real desk lines when available.
const ADMIN_PHONE = "+911000000001";
const SECRETARY_PHONE = "+911000000001";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function GuardProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUiStore((s) => s.showToast);

  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, { refetchInterval: 15_000 });
  const unreadMessages = (conversationsQuery.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  const utils = trpc.useUtils();
  const dutyQuery = trpc.duty.myStatus.useQuery();
  const onDuty = dutyQuery.data?.onDuty ?? false;
  const setDutyMutation = trpc.duty.setStatus.useMutation({
    onMutate: () => hapticTap(),
    onSuccess: (data) => {
      showToast(data.onDuty ? "You're now On Duty" : "You're now Off Duty", data.onDuty ? "success" : "info");
      utils.duty.myStatus.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      logout();
      router.replace("/(auth)/login");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function doLogout() {
    if (refreshToken) logoutMutation.mutate({ refreshToken });
    else {
      logout();
      router.replace("/(auth)/login");
    }
  }

  function call(number: string) {
    hapticTap();
    Linking.openURL(`tel:${number}`);
  }

  if (!user) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Dark header — mirrors the gate screen: location + Home / In-Out / Settings */}
      <View style={{ backgroundColor: "#141118", paddingTop: insets.top + 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Text className="pb-4 text-center text-body-md font-bold" style={{ color: "#B9B4C4" }}>
          Main Gate · {user.fullName.split(" ")[0]}
        </Text>
        <View className="flex-row justify-around px-6 pb-6">
          <HeaderTab icon="home-filled" label="Home" onPress={() => router.replace("/(guard)/gate")} />
          <HeaderTab icon="swap-vert" label="In-Out" onPress={() => router.push("/(guard)/history")} />
          <HeaderTab icon="settings" label="Settings" active onPress={() => {}} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View className="flex-row items-center gap-4 rounded-2xl bg-surface p-4" style={shadowCard}>
          <View
            className="items-center justify-center bg-surface-container"
            style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#242424" }}
          >
            <Text className="text-headline-md font-extrabold text-primary-container">{initialsFrom(user.fullName)}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text className="text-body-sm text-text-muted">Security Guard</Text>
          </View>
          <Pressable
            onPress={() => setDutyMutation.mutate({ onDuty: !onDuty })}
            disabled={setDutyMutation.isPending || dutyQuery.isLoading}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: onDuty ? "#F5821F" : "#242424", borderWidth: onDuty ? 0 : 1, borderColor: "#3A3A3A" }}
            accessibilityRole="switch"
            accessibilityState={{ checked: onDuty }}
            accessibilityLabel={onDuty ? "On duty — tap to go off duty" : "Off duty — tap to go on duty"}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onDuty ? "#141118" : "#8A8A8A" }} />
            <Text className="text-body-sm font-bold" style={{ color: onDuty ? "#141118" : "#8A8A8A" }}>
              {onDuty ? "On Duty" : "Off Duty"}
            </Text>
          </Pressable>
        </View>

        {/* Explicit duty toggle row so the state is unmissable */}
        <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
          <View
            className="items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: onDuty ? "#3A2A12" : "#242424" }}
          >
            <MaterialIcons name="shield" size={22} color={onDuty ? "#F5821F" : "#8A8A8A"} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-body-lg font-bold text-on-surface">Duty Status</Text>
            <Text className="text-body-sm text-text-muted">Residents and admins see this.</Text>
          </View>
          <Pressable
            onPress={() => setDutyMutation.mutate({ onDuty: !onDuty })}
            disabled={setDutyMutation.isPending || dutyQuery.isLoading}
            className="items-center justify-center rounded-full"
            style={{ width: 52, height: 30, backgroundColor: onDuty ? "#F5821F" : "#3A3A3A", paddingHorizontal: 3, alignItems: onDuty ? "flex-end" : "flex-start" }}
            accessibilityRole="switch"
            accessibilityState={{ checked: onDuty }}
            accessibilityLabel="Toggle duty status"
          >
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }} />
          </Pressable>
        </View>

        {/* Messages & admin */}
        <View className="overflow-hidden rounded-2xl bg-surface" style={shadowCard}>
          <MenuRow
            icon="mail-outline"
            iconColor="#5B8DEF"
            iconBg="#1E2A44"
            label="Messages"
            badge={unreadMessages}
            onPress={() => router.push("/(guard)/messages")}
          />
          <MenuRow
            icon="shield"
            iconColor="#F5821F"
            iconBg="#3A2A12"
            label="Contact Admin / Report"
            onPress={() => router.push("/(guard)/contact-admin")}
            isLast
          />
        </View>

        {/* Quick Contacts */}
        <SectionLabel>Quick Contacts</SectionLabel>
        <View className="overflow-hidden rounded-2xl bg-surface" style={shadowCard}>
          <MenuRow icon="person" iconColor="#FFFFFF" iconBg="#22A559" label="Call Admin" trailingIcon="phone" onPress={() => call(ADMIN_PHONE)} />
          <MenuRow
            icon="person"
            iconColor="#FFFFFF"
            iconBg="#22A559"
            label="Call Secretary"
            trailingIcon="phone"
            onPress={() => call(SECRETARY_PHONE)}
            isLast
          />
        </View>

        {/* App links */}
        <SectionLabel>App</SectionLabel>
        <View className="overflow-hidden rounded-2xl bg-surface" style={shadowCard}>
          <MenuRow
            icon="support-agent"
            iconColor="#5B8DEF"
            iconBg="#1E2A44"
            label="Support"
            onPress={() => Linking.openURL("mailto:support@portl.dev")}
          />
          <MenuRow
            icon="description"
            iconColor="#F5C24B"
            iconBg="#3A2E12"
            label="Terms & Conditions"
            onPress={() => showToast("Terms & Conditions coming soon", "info")}
          />
          <MenuRow
            icon="translate"
            iconColor="#A78BFA"
            iconBg="#2A2140"
            label="Change Language"
            onPress={() => showToast("More languages coming soon", "info")}
            isLast
          />
        </View>

        {/* Logout */}
        <Pressable
          onPress={doLogout}
          disabled={logoutMutation.isPending}
          className="h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: "#3A1A1A" }}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <MaterialIcons name="logout" size={20} color="#A50E0E" />
          <Text className="text-body-lg font-bold" style={{ color: "#A50E0E" }}>
            {logoutMutation.isPending ? "Logging out…" : "Logout"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="-mb-1 px-1 text-label-caps font-bold uppercase tracking-widest text-text-muted">{children}</Text>;
}

function HeaderTab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active ? "#F5821F" : "#8A8A8A";
  return (
    <Pressable onPress={onPress} className="items-center gap-1" accessibilityRole="button" accessibilityLabel={label}>
      <MaterialIcons name={icon} size={26} color={color} />
      <Text className="text-body-sm font-bold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  iconColor,
  iconBg,
  label,
  badge,
  trailingIcon,
  onPress,
  isLast,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  badge?: number;
  trailingIcon?: React.ComponentProps<typeof MaterialIcons>["name"];
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-4 p-4 active:bg-surface-container ${isLast ? "" : "border-b border-outline-variant"}`}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View className="items-center justify-center" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: iconBg }}>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text className="flex-1 text-body-lg font-bold text-on-surface">{label}</Text>
      {badge && badge > 0 ? (
        <View className="items-center justify-center rounded-full px-2" style={{ minWidth: 22, height: 22, backgroundColor: "#E53935" }}>
          <Text className="text-body-sm font-bold text-white">{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : trailingIcon ? (
        <MaterialIcons name={trailingIcon} size={22} color="#8A8A8A" />
      ) : (
        <MaterialIcons name="chevron-right" size={22} color="#8A8A8A" />
      )}
    </Pressable>
  );
}
