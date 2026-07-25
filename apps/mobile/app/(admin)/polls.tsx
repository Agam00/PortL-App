import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { AdminHeader } from "../../components/ui/admin-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { FormPanel } from "../../components/ui/form-panel";
import { IconButton } from "../../components/ui/icon-button";
import { ListLoading } from "../../components/ui/list-loading";

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

  const polls = [...(pollsQuery.data ?? [])].sort((a, b) => Number(a.isClosed) - Number(b.isClosed));

  return (
    <View className="flex-1 bg-background">
      <AdminHeader
        showBack
        barTitle="Portl"
        centerBar
        bigTitle="Polls"
        action={{ label: showForm ? "Close" : "+ Create", onPress: () => (showForm ? resetForm() : setShowForm(true)) }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A" refreshing={pollsQuery.isRefetching} onRefresh={() => pollsQuery.refetch()} />}
      >
        {showForm && (
          <FormPanel>
            <View className="flex-row items-center gap-3">
              <View className="items-center justify-center bg-primary" style={{ width: 40, height: 40, borderRadius: 12 }}>
                <MaterialIcons name="ballot" size={22} color="#0D0D0D" />
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
                  <MaterialIcons name="drag-indicator" size={18} color="#6E6E6E" />
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
                      <MaterialIcons name="close" size={18} color="#8A8A8A" />
                    </Pressable>
                  )}
                </View>
              ))}
              {optionsError && <Text className="text-body-sm text-status-red">{optionsError}</Text>}
              {options.length < 10 && (
                <Pressable onPress={() => setOptions((prev) => [...prev, ""])} className="flex-row items-center gap-1.5 p-1">
                  <MaterialIcons name="add" size={16} color="#F5821F" />
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
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load polls" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : polls.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No polls yet" description="Create a poll above." icon="poll" />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {polls.map((poll) => {
              const closed = poll.isClosed;
              const leadingCount = Math.max(0, ...poll.options.map((o) => o.voteCount));
              return (
                <View
                  key={poll.id}
                  style={{
                    backgroundColor: "#1A1A1A",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#333333",
                    padding: 20,
                    gap: 16,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-headline-md font-extrabold text-on-surface">{poll.question}</Text>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ borderWidth: 1, borderColor: closed ? "#333333" : "#F5821F" }}
                    >
                      <Text
                        className="text-body-sm font-semibold"
                        style={{ color: closed ? "#8A8A8A" : "#F5821F" }}
                      >
                        {closed ? "Closed" : "Active"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    {poll.options.map((option) => {
                      const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                      const leading = option.voteCount === leadingCount && leadingCount > 0;
                      return (
                        <View key={option.id} style={{ gap: 8 }}>
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="min-w-0 flex-1 text-body-md text-on-surface" numberOfLines={1}>
                              {option.label}
                            </Text>
                            <Text className="text-body-md font-bold text-on-surface">{pct}%</Text>
                          </View>
                          <View style={{ height: 8, borderRadius: 999, backgroundColor: "#242424", overflow: "hidden" }}>
                            <View
                              style={{
                                height: 8,
                                borderRadius: 999,
                                width: `${pct}%`,
                                backgroundColor: leading ? "#F5821F" : "#8A4E12",
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View
                    className="flex-row items-center justify-between pt-3"
                    style={{ borderTopWidth: 1, borderTopColor: "#333333" }}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <MaterialIcons name="how-to-vote" size={16} color="#8A8A8A" />
                      <Text className="text-body-sm text-text-muted">
                        {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"} · {closed ? "Closed" : "Active"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      {!closed && (
                        <Pressable
                          onPress={() => closeMutation.mutate({ pollId: poll.id })}
                          className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                          style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
                          accessibilityRole="button"
                          accessibilityLabel={`Close poll: ${poll.question}`}
                        >
                          <MaterialIcons name="stop-circle" size={14} color="#C4C4C4" />
                          <Text className="text-body-sm font-semibold text-on-surface-variant">Close</Text>
                        </Pressable>
                      )}
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        onPress={() => confirmDelete(poll.id, poll.question)}
                        accessibilityLabel={`Delete poll: ${poll.question}`}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
