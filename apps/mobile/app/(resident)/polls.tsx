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
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function closesInLabel(closesAt: string | null) {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
  return `${hours}h left`;
}

const TABS = ["Active", "Voted", "Closed"] as const;

export default function ResidentPolls() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]>("Active");

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
  const shown = tab === "Active" ? active : tab === "Voted" ? voted : closed;

  function renderResultBars(poll: (typeof polls)[number]) {
    return (
      <View className="gap-2.5">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          const isMine = poll.myVote.includes(option.id);
          return (
            <View key={option.id} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className={`text-body-sm ${isMine ? "font-bold text-primary-container" : "text-on-surface"}`}>
                  {option.label}
                  {isMine ? " ✓" : ""}
                </Text>
                <Text className="text-body-sm text-text-muted">{pct}%</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-surface-container">
                <View className="h-full rounded-full bg-primary-container" style={{ width: `${pct}%` }} />
              </View>
            </View>
          );
        })}
        <Text className="text-body-sm text-text-muted">{poll.totalVotes} Total Votes</Text>
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
        <Text className="text-body-sm text-text-muted">Have your say in community decisions.</Text>

        <View className="flex-row gap-6 border-b border-outline-variant">
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={`pb-3 ${tab === t ? "border-b-2 border-primary-container" : ""}`}>
              <Text className={`text-body-md ${tab === t ? "font-bold text-primary-container" : "text-text-muted"}`}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {pollsQuery.isLoading ? (
          <ListLoading />
        ) : pollsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load polls" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : shown.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title={`No ${tab.toLowerCase()} polls`} description="Community polls will show up here." icon="poll" />
          </View>
        ) : (
          <View className="gap-3">
            {shown.map((poll) => {
              const mySelection = selections[poll.id] ?? [];
              const closesLabel = closesInLabel(poll.closesAt);
              return (
                <View key={poll.id} className="gap-3 rounded-card bg-surface p-4" style={shadowCard}>
                  {closesLabel && !poll.isClosed && (
                    <View className="self-end rounded-full bg-secondary-container px-3 py-1">
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons name="schedule" size={12} color="#1C1A23" />
                        <Text className="text-label-sm font-bold text-on-surface">{closesLabel}</Text>
                      </View>
                    </View>
                  )}
                  <Text className="text-body-md font-bold text-on-surface">{poll.question}</Text>

                  {tab === "Active" ? (
                    <>
                      <View className="gap-2">
                        {poll.options.map((option) => {
                          const selected = mySelection.includes(option.id);
                          return (
                            <Pressable
                              key={option.id}
                              onPress={() => toggleOption(poll.id, option.id, poll.multiSelect)}
                              className={`flex-row items-center gap-3 rounded-md border-2 px-4 py-3 ${
                                selected ? "border-primary-container bg-surface-container" : "border-outline-variant"
                              }`}
                            >
                              <MaterialIcons
                                name={poll.multiSelect ? (selected ? "check-box" : "check-box-outline-blank") : selected ? "radio-button-checked" : "radio-button-unchecked"}
                                size={18}
                                color={selected ? "#6244CD" : "#797585"}
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
                        Vote Now
                      </Button>
                    </>
                  ) : (
                    renderResultBars(poll)
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
