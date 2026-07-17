import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";
import { shadowCard } from "../../lib/shadows";

// mockup cycles the option progress-bar colors: violet, amber, brown
const BAR_COLORS = ["#6244CD", "#FEB246", "#AA6700", "#7B5FE8"];

export default function AdminPolls() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const pollsQuery = trpc.polls.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setQuestion("");
    setOptions(["", ""]);
    setQuestionError(null);
    setOptionsError(null);
  }

  const createMutation = trpc.polls.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Poll created", "success");
      resetForm();
      utils.polls.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const closeMutation = trpc.polls.close.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Poll closed", "success");
      utils.polls.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const removeMutation = trpc.polls.remove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Poll removed", "success");
      utils.polls.list.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmDelete(pollId: string, label: string) {
    Alert.alert("Remove poll?", `"${label}" and all its votes will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ pollId }) },
    ]);
  }

  function handleCreate() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    const questionMissing = !question.trim();
    const optionsInsufficient = cleanOptions.length < 2;
    setQuestionError(questionMissing ? "Poll question is required" : null);
    setOptionsError(optionsInsufficient ? "Add at least 2 non-empty options" : null);
    if (questionMissing || optionsInsufficient) return;

    createMutation.mutate({ question: question.trim(), options: cleanOptions });
  }

  const polls = pollsQuery.data ?? [];
  const livePolls = polls.filter((p) => !p.isClosed);
  const closedPolls = polls.filter((p) => p.isClosed);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Community Polls"
        subtitle="Manage resident feedback and gauge community sentiment. Active polls appear on resident dashboards."
        role="admin"
      />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pollsQuery.isRefetching} onRefresh={() => pollsQuery.refetch()} />}
      >
        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Create New Poll"}
        </Button>

        {showForm && (
          <FormPanel className="bg-surface">
            <View className="flex-row items-center gap-3">
              <View className="items-center justify-center bg-primary" style={{ width: 40, height: 40, borderRadius: 12 }}>
                <MaterialIcons name="ballot" size={22} color="#FFFFFF" />
              </View>
              <Text className="text-headline-md font-extrabold text-on-surface">Draft New Poll</Text>
            </View>
            <Input
              label="Question"
              placeholder="What should we ask the community?"
              value={question}
              onChangeText={(v) => {
                setQuestion(v);
                if (questionError) setQuestionError(null);
              }}
              error={questionError ?? undefined}
            />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Options</Text>
              {options.map((option, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <MaterialIcons name="drag-indicator" size={18} color="#CAC4D6" />
                  <Input
                    className="flex-1"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(text) => {
                      setOptions((prev) => prev.map((o, i) => (i === index ? text : o)));
                      if (optionsError) setOptionsError(null);
                    }}
                  />
                  {options.length > 2 && (
                    <Pressable
                      onPress={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                      hitSlop={8}
                      accessibilityLabel={`Remove option ${index + 1}`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="close" size={18} color="#797585" />
                    </Pressable>
                  )}
                </View>
              ))}
              {optionsError && <Text className="text-body-sm text-status-red">{optionsError}</Text>}
              {options.length < 10 && (
                <Pressable onPress={() => setOptions((prev) => [...prev, ""])} className="flex-row items-center gap-1.5 p-1">
                  <MaterialIcons name="add" size={16} color="#6244CD" />
                  <Text className="text-body-sm font-semibold text-primary">Add Option</Text>
                </Pressable>
              )}
            </View>
            <Button onPress={handleCreate} loading={createMutation.isPending}>
              Publish Poll
            </Button>
          </FormPanel>
        )}

        {pollsQuery.isLoading ? (
          <ListLoading />
        ) : pollsQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load polls" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : polls.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No polls yet" description="Create a poll above." icon="poll" />
          </View>
        ) : (
          <>
            {livePolls.map((poll) => (
              <View key={poll.id} className="gap-3 bg-surface p-5" style={[{ borderRadius: 20 }, shadowCard]}>
                <View className="flex-row items-center justify-between">
                  <View
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: "rgba(254,178,70,0.25)" }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#BA1A1A" }} />
                    <Text className="text-label-caps font-bold" style={{ color: "#845400" }}>
                      Live Now
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => closeMutation.mutate({ pollId: poll.id })}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: "rgba(186,26,26,0.08)" }}
                    accessibilityRole="button"
                    accessibilityLabel={`Close poll: ${poll.question}`}
                  >
                    <MaterialIcons name="stop-circle" size={14} color="#BA1A1A" />
                    <Text className="text-meta-text font-semibold" style={{ color: "#BA1A1A" }}>
                      Close Early
                    </Text>
                  </Pressable>
                </View>

                <Text className="text-headline-md font-extrabold text-on-surface">{poll.question}</Text>
                <Text className="text-body-sm text-text-muted">
                  {poll.totalVotes} resident{poll.totalVotes === 1 ? "" : "s"} voted so far
                </Text>

                <View className="gap-3">
                  {poll.options.map((option, index) => {
                    const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                    return (
                      <View key={option.id} className="gap-1.5">
                        <View className="flex-row items-center justify-between gap-2">
                          <Text className="min-w-0 flex-1 text-body-sm font-semibold text-on-surface" numberOfLines={1}>
                            {option.label}
                          </Text>
                          <Text className="text-body-sm font-bold text-on-surface">
                            {pct}% ({option.voteCount} votes)
                          </Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: "#EEE9F4", overflow: "hidden" }}>
                          <View
                            style={{
                              height: 8,
                              borderRadius: 4,
                              width: `${pct}%`,
                              backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View className="flex-row items-center justify-end">
                  <IconButton
                    icon="delete-outline"
                    color="#BA1A1A"
                    onPress={() => confirmDelete(poll.id, poll.question)}
                    accessibilityLabel={`Delete poll: ${poll.question}`}
                  />
                </View>
              </View>
            ))}

            {closedPolls.length > 0 && (
              <Text className="pt-2 text-headline-md font-extrabold text-on-surface">Recent Polls</Text>
            )}
            {closedPolls.map((poll) => {
              const winner = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0];
              const winnerPct = winner && poll.totalVotes > 0 ? Math.round((winner.voteCount / poll.totalVotes) * 100) : 0;
              return (
                <View key={poll.id} className="gap-2 bg-surface p-5" style={[{ borderRadius: 20 }, shadowCard]}>
                  <View className="flex-row items-center justify-between">
                    <View className="rounded-full bg-surface-container-high px-3 py-1">
                      <Text className="text-meta-text font-semibold text-on-surface-variant">Closed</Text>
                    </View>
                    <IconButton
                      icon="delete-outline"
                      color="#BA1A1A"
                      onPress={() => confirmDelete(poll.id, poll.question)}
                      accessibilityLabel={`Delete poll: ${poll.question}`}
                    />
                  </View>
                  <Text className="text-body-md font-bold text-on-surface">{poll.question}</Text>
                  <Text className="text-body-sm text-on-surface-variant">
                    {winner && poll.totalVotes > 0 ? `Winner: ${winner.label} (${winnerPct}%)` : "No votes were cast"}
                  </Text>
                  <Text className="text-meta-text text-text-muted">Total: {poll.totalVotes} votes</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
