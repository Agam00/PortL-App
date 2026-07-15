import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { ListLoading } from "../../components/ui/list-loading";

function closesInLabel(closesAt: string | null) {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `Closes in ${days}d`;
  const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
  return `Closes in ${hours}h`;
}

export default function ResidentPolls() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const pollsQuery = trpc.polls.listForResident.useQuery();

  const voteMutation = trpc.polls.vote.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Vote submitted", "success");
      utils.polls.listForResident.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function toggleOption(pollId: string, optionId: string, multiSelect: boolean) {
    setSelections((prev) => {
      const current = prev[pollId] ?? [];
      if (multiSelect) {
        const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
        return { ...prev, [pollId]: next };
      }
      return { ...prev, [pollId]: [optionId] };
    });
  }

  const polls = pollsQuery.data ?? [];
  const active = polls.filter((p) => !p.isClosed && p.myVote.length === 0);
  const voted = polls.filter((p) => !p.isClosed && p.myVote.length > 0);
  const closed = polls.filter((p) => p.isClosed);

  function renderResultBars(poll: (typeof polls)[number]) {
    const maxVotes = Math.max(1, ...poll.options.map((o) => o.voteCount));
    return (
      <View className="gap-2">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          const isMine = poll.myVote.includes(option.id);
          return (
            <View key={option.id} className="overflow-hidden rounded-md border border-border-subtle">
              <View
                className="absolute inset-y-0 left-0 bg-primary-container/25"
                style={{ width: `${(option.voteCount / maxVotes) * 100}%` }}
              />
              <View className="flex-row items-center justify-between px-3 py-2">
                <Text className={`text-body-sm ${isMine ? "font-semibold text-primary-container" : "text-on-surface"}`}>
                  {option.label}
                  {isMine ? " (your vote)" : ""}
                </Text>
                <Text className="text-body-sm text-text-muted">{pct}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Community Polls" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={pollsQuery.isRefetching} onRefresh={() => pollsQuery.refetch()} />}
      >
        <Text className="text-body-sm text-text-muted">Participate in active society decisions.</Text>

        {pollsQuery.isLoading ? (
          <ListLoading />
        ) : pollsQuery.isError ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="Couldn't load polls" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : polls.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No polls yet" description="Community polls will show up here." icon="poll" />
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Active Polls" />
                {active.map((poll) => {
                  const mySelection = selections[poll.id] ?? [];
                  return (
                    <View key={poll.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="rounded-md border border-status-amber/40 px-2 py-0.5">
                          <Text className="text-meta-text uppercase text-status-amber">Active Poll</Text>
                        </View>
                        {closesInLabel(poll.closesAt) && (
                          <Text className="text-meta-text text-text-muted">{closesInLabel(poll.closesAt)}</Text>
                        )}
                      </View>
                      <Text className="text-body-md font-semibold text-on-surface">{poll.question}</Text>
                      <View className="gap-2">
                        {poll.options.map((option) => {
                          const selected = mySelection.includes(option.id);
                          return (
                            <Pressable
                              key={option.id}
                              onPress={() => toggleOption(poll.id, option.id, poll.multiSelect)}
                              className={`flex-row items-center gap-3 rounded-md border px-3 py-2.5 ${
                                selected ? "border-primary-container bg-white/5" : "border-border-subtle"
                              }`}
                            >
                              <MaterialIcons
                                name={poll.multiSelect ? (selected ? "check-box" : "check-box-outline-blank") : selected ? "radio-button-checked" : "radio-button-unchecked"}
                                size={18}
                                color={selected ? "#5e6ad2" : "#8A8F98"}
                              />
                              <Text className="text-body-sm text-on-surface">{option.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Button
                        disabled={mySelection.length === 0}
                        loading={voteMutation.isPending}
                        onPress={() => voteMutation.mutate({ pollId: poll.id, optionIds: mySelection })}
                      >
                        Submit Vote
                      </Button>
                    </View>
                  );
                })}
              </View>
            )}

            {voted.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="You Voted" />
                {voted.map((poll) => (
                  <View key={poll.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="rounded-md border border-status-amber/40 px-2 py-0.5">
                        <Text className="text-meta-text uppercase text-status-amber">Active Poll</Text>
                      </View>
                      {closesInLabel(poll.closesAt) && (
                        <Text className="text-meta-text text-text-muted">{closesInLabel(poll.closesAt)}</Text>
                      )}
                    </View>
                    <Text className="text-body-md font-semibold text-on-surface">{poll.question}</Text>
                    {renderResultBars(poll)}
                    <Text className="text-meta-text text-text-muted">Total: {poll.totalVotes} votes</Text>
                  </View>
                ))}
              </View>
            )}

            {closed.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Recent Results" />
                {closed.map((poll) => (
                  <View key={poll.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="rounded-md border border-status-green/40 px-2 py-0.5">
                        <Text className="text-meta-text uppercase text-status-green">Closed</Text>
                      </View>
                      <Text className="text-meta-text text-text-muted">Total Votes: {poll.totalVotes}</Text>
                    </View>
                    <Text className="text-body-md font-semibold text-on-surface">{poll.question}</Text>
                    {renderResultBars(poll)}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
