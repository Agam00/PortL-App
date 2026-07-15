import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { GuardQueueRow } from "../../components/guard-queue-row";

export default function CheckPreApproved() {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.visitors.searchPreApproved.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 },
  );

  const markEntryMutation = trpc.visitors.markEntry.useMutation({
    onSuccess: (visitor) => {
      hapticSuccess();
      showToast(`${visitor.name} checked in — no call needed`, "success");
      utils.visitors.listForGuard.invalidate();
      router.push("/(guard)/gate");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const results = searchQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Pre-Approved Entry" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">
          Search by the visitor's name or phone — if a resident already pre-approved them, tap to check
          them in instantly.
        </Text>

        <Input placeholder="Search name or phone" value={query} onChangeText={setQuery} />

        {searchQuery.isFetching && <ActivityIndicator size="small" color="#5e6ad2" />}

        {debounced.length > 0 && !searchQuery.isFetching && results.length === 0 && (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="No matching pre-approval"
              description="Nothing found for that name or phone — try registering them as a new visitor instead."
              icon="search-off"
            />
          </View>
        )}

        <View className="gap-2">
          {results.map((visitor) => (
            <GuardQueueRow
              key={visitor.id}
              visitor={visitor}
              actionLabel="Mark Entry"
              isActionLoading={actingOnId === visitor.id && markEntryMutation.isPending}
              onAction={() => {
                setActingOnId(visitor.id);
                markEntryMutation.mutate({ visitorId: visitor.id });
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
