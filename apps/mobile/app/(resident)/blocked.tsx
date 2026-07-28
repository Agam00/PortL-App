import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { Avatar } from "../../components/ui/avatar";
import { EmptyState } from "../../components/ui/empty-state";

export default function BlockedUsers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const query = trpc.moderation.listBlocked.useQuery();
  const blocked = query.data ?? [];

  const unblockMutation = trpc.moderation.unblock.useMutation({
    onSuccess: () => {
      showToast("Unblocked", "success");
      utils.moderation.listBlocked.invalidate();
      utils.posts.list.invalidate();
      utils.chat.conversations.invalidate();
    },
    onError: (e) => showToast(getErrorMessage(e), "error"),
  });

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <View className="flex-row items-center gap-3 px-5 pb-3" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Blocked Users</Text>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F5821F" />
        </View>
      ) : blocked.length === 0 ? (
        <View className="mx-5 mt-6 rounded-xl bg-surface">
          <EmptyState title="No blocked users" description="People you block won't appear in your feed, comments, or chats." icon="block" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-2 px-5 pb-8 pt-2">
          {blocked.map((u) => (
            <View key={u.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
              <Avatar name={u.fullName} size={44} />
              <Text className="min-w-0 flex-1 text-body-lg font-bold text-on-surface" numberOfLines={1}>
                {u.fullName}
              </Text>
              <Pressable
                onPress={() => unblockMutation.mutate({ userId: u.id })}
                disabled={unblockMutation.isPending}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: "#242424" }}
                accessibilityLabel={`Unblock ${u.fullName}`}
                accessibilityRole="button"
              >
                <Text className="text-body-sm font-bold text-primary">Unblock</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
