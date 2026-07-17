import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { useAuthStore } from "../stores/auth-store";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { ScreenHeader } from "./ui/screen-header";
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
        <MaterialIcons name="chevron-right" size={22} color="#797585" />
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
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUiStore((s) => s.showToast);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      logout();
      router.replace("/(auth)/login");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="" role={user.role} />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8 pt-6">
        <View className="items-center gap-3 bg-surface p-6" style={[{ borderRadius: 20 }, shadowCard]}>
          <View
            className="items-center justify-center bg-surface-container"
            style={{ width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: "#EDE7F8" }}
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
          <MenuRow icon="phone" iconColor="#6244CD" iconBg="#E4DAFB" label="Phone" value={user.phone} />
          <MenuRow
            icon="mail-outline"
            iconColor="#845400"
            iconBg="#FBE3BD"
            label="Email"
            value={user.email}
            isLast={user.role !== "resident"}
          />
          {user.role === "resident" && (
            <MenuRow
              icon="apartment"
              iconColor="#48454F"
              iconBg="#E6E1E9"
              label="Society Directory"
              onPress={() => router.push("/(resident)/staff-directory")}
              isLast
            />
          )}
        </View>

        <Pressable
          onPress={() => {
            if (refreshToken) {
              logoutMutation.mutate({ refreshToken });
            } else {
              logout();
              router.replace("/(auth)/login");
            }
          }}
          disabled={logoutMutation.isPending}
          className="h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: "#F9D8D3" }}
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
      </ScrollView>
    </View>
  );
}
