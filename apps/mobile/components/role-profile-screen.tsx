import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../lib/trpc";
import { useAuthStore } from "../stores/auth-store";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { ScreenHeader } from "./ui/screen-header";
import { RoleBadge } from "./ui/role-badge";
import { Button } from "./ui/button";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-border-subtle bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={icon} size={20} color="#8A8F98" />
        <Text className="text-body-md text-text-muted">{label}</Text>
      </View>
      <Text className="text-body-md font-medium text-on-surface">{value}</Text>
    </View>
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
      <ScreenHeader title="Profile" role={user.role} />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="items-center gap-4 rounded-xl border border-border-subtle bg-surface-elevated p-6">
          <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-high">
            <Text className="text-headline-lg font-semibold text-on-surface">
              {initialsFrom(user.fullName)}
            </Text>
          </View>
          <Text className="text-headline-md font-semibold text-on-surface">{user.fullName}</Text>
          <RoleBadge role={user.role} />
        </View>

        <View className="gap-2">
          <InfoRow icon="phone" label="Phone" value={user.phone} />
          <InfoRow icon="mail" label="Email" value={user.email} />
        </View>

        {user.role === "resident" && (
          <Button variant="outline" onPress={() => router.push("/(resident)/staff-directory")}>
            Society Directory
          </Button>
        )}

        <Button
          variant="danger"
          loading={logoutMutation.isPending}
          onPress={() => {
            if (refreshToken) {
              logoutMutation.mutate({ refreshToken });
            } else {
              logout();
              router.replace("/(auth)/login");
            }
          }}
        >
          Log out
        </Button>
      </ScrollView>
    </View>
  );
}
