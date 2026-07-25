import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

function closesInLabel(closesAt: string | null) {
  if (!closesAt) return null;
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`;
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
      <View className="gap-3">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          const isMine = poll.myVote.includes(option.id);
          return (
            <View key={option.id} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-body-md ${isMine ? "font-bold" : "text-on-surface"}`}
                  style={isMine ? { color: "#F5821F" } : undefined}
                >
                  {option.label}
                </Text>
                <Text
                  className={`text-body-sm font-bold ${isMine ? "" : "text-on-surface-variant"}`}
                  style={isMine ? { color: "#F5821F" } : undefined}
                >
                  {pct}%
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "#333333" }}>
                <View
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: isMine ? "#F5821F" : "#6E6E6E" }}
                />
              </View>
            </View>
          );
        })}
        <Text className="pt-1 text-center text-body-sm text-text-muted">{poll.totalVotes} Total Votes</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <ScreenHeader title="Community Polls" subtitle="Have your say in community decisions." role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-2"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={pollsQuery.isRefetching} onRefresh={() => pollsQuery.refetch()} />}
      >
        <View className="flex-row gap-6" style={{ borderBottomWidth: 1, borderBottomColor: "#333333" }}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="pb-3"
              style={tab === t ? { borderBottomWidth: 2, borderBottomColor: "#F5821F", marginBottom: -1 } : undefined}
            >
              <Text
                className={`text-body-md ${tab === t ? "font-bold" : "text-text-muted"}`}
                style={tab === t ? { color: "#F5821F" } : undefined}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {pollsQuery.isLoading ? (
          <ListLoading />
        ) : pollsQuery.isError ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title="Couldn't load polls" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : shown.length === 0 ? (
          <View className="rounded-xl bg-surface">
            <EmptyState title={`No ${tab.toLowerCase()} polls`} description="Community polls will show up here." icon="poll" />
          </View>
        ) : (
          <View className="gap-4">
            {shown.map((poll) => {
              const mySelection = selections[poll.id] ?? [];
              const closesLabel = closesInLabel(poll.closesAt);
              return (
                <View key={poll.id} className="gap-3 rounded-xl bg-surface p-5" style={shadowCard}>
                  {!poll.isClosed && tab === "Active" && closesLabel && (
                    <View
                      className="flex-row items-center gap-1 self-end rounded-full px-3 py-1"
                      style={{ backgroundColor: "#FEB246" }}
                    >
                      <MaterialIcons name="schedule" size={13} color="#3D2E00" />
                      <Text className="text-body-sm font-bold" style={{ color: "#3D2E00" }}>
                        {closesLabel}
                      </Text>
                    </View>
                  )}
                  {tab !== "Active" && (
                    <View
                      className="flex-row items-center gap-1 self-end rounded-full px-3 py-1"
                      style={{ backgroundColor: "#262626" }}
                    >
                      <MaterialIcons name="check-circle-outline" size={13} color="#C4C4C4" />
                      <Text className="text-body-sm font-bold" style={{ color: "#C4C4C4" }}>
                        {tab === "Voted" ? "Voted" : "Closed"}
                      </Text>
                    </View>
                  )}
                  <Text className="text-body-lg font-extrabold text-on-surface">{poll.question}</Text>

                  {tab === "Active" ? (
                    <>
                      <View className="gap-3">
                        {poll.options.map((option) => {
                          const selected = mySelection.includes(option.id);
                          return (
                            <Pressable
                              key={option.id}
                              onPress={() => toggleOption(poll.id, option.id, poll.multiSelect)}
                              className="flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3.5"
                              style={{
                                borderWidth: selected ? 2 : 1,
                                borderColor: selected ? "#F5821F" : "#333333",
                                backgroundColor: selected ? "#242424" : "#1A1A1A",
                              }}
                              accessibilityRole={poll.multiSelect ? "checkbox" : "radio"}
                              accessibilityState={{ selected }}
                            >
                              <MaterialIcons
                                name={
                                  poll.multiSelect
                                    ? selected
                                      ? "check-box"
                                      : "check-box-outline-blank"
                                    : selected
                                      ? "radio-button-checked"
                                      : "radio-button-unchecked"
                                }
                                size={20}
                                color={selected ? "#F5821F" : "#6E6E6E"}
                              />
                              <Text className="flex-1 text-body-md text-on-surface">{option.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Pressable
                        disabled={mySelection.length === 0 || voteMutation.isPending}
                        onPress={() => voteMutation.mutate({ pollId: poll.id, optionIds: mySelection })}
                        className="mt-1 h-12 flex-row items-center justify-center gap-2 rounded-full"
                        style={{ backgroundColor: mySelection.length === 0 ? "#7A5320" : "#F5821F" }}
                        accessibilityLabel="Vote now"
                        accessibilityRole="button"
                      >
                        <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
                          {voteMutation.isPending ? "Submitting..." : "Vote Now"}
                        </Text>
                        {!voteMutation.isPending && <MaterialIcons name="how-to-vote" size={18} color="#fff" />}
                      </Pressable>
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
