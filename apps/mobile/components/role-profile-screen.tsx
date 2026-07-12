import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../lib/trpc";
import { useAuthStore } from "../stores/auth-store";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { Avatar } from "./ui/avatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { StatusPill } from "./ui/status-pill";

const ROLE_LABEL: Record<string, string> = {
  resident: "Resident",
  guard: "Security Guard",
  admin: "Society Admin",
};

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
    <View className="flex-1 gap-4 bg-slate-50 p-4">
      <Card className="items-center gap-3 py-6">
        <Avatar name={user.fullName} size={64} />
        <View className="items-center gap-1">
          <Text className="text-lg font-bold text-slate-900">{user.fullName}</Text>
          <StatusPill label={ROLE_LABEL[user.role] ?? user.role} tone="info" />
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500">Phone</Text>
          <Text className="text-sm font-medium text-slate-900">{user.phone}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500">Email</Text>
          <Text className="text-sm font-medium text-slate-900">{user.email}</Text>
        </View>
      </Card>

      <Button
        variant="outline"
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
    </View>
  );
}
