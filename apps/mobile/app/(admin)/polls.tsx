import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";

export default function AdminPolls() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const pollsQuery = trpc.polls.list.useQuery();

  function resetForm() {
    setShowForm(false);
    setQuestion("");
    setOptions(["", ""]);
  }

  const createMutation = trpc.polls.create.useMutation({
    onSuccess: () => {
      showToast("Poll created", "success");
      resetForm();
      utils.polls.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const closeMutation = trpc.polls.close.useMutation({
    onSuccess: () => {
      showToast("Poll closed", "success");
      utils.polls.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  const removeMutation = trpc.polls.remove.useMutation({
    onSuccess: () => {
      showToast("Poll removed", "success");
      utils.polls.list.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  function confirmDelete(pollId: string, label: string) {
    Alert.alert("Remove poll?", `"${label}" and all its votes will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ pollId }) },
    ]);
  }

  function handleCreate() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      showToast("Add a question and at least 2 options", "error");
      return;
    }
    createMutation.mutate({ question: question.trim(), options: cleanOptions });
  }

  const polls = pollsQuery.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Manage Polls" role="admin" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Active and past community votes.</Text>

        <Button variant={showForm ? "outline" : "primary"} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Create New Poll"}
        </Button>

        {showForm && (
          <View className="gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <Text className="text-body-md font-semibold text-on-surface">Create New Poll</Text>
            <Input label="Poll Question" placeholder="e.g. What should we plant in the garden?" value={question} onChangeText={setQuestion} />
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Options</Text>
              {options.map((option, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(text) => setOptions((prev) => prev.map((o, i) => (i === index ? text : o)))}
                  />
                  {options.length > 2 && (
                    <Pressable onPress={() => setOptions((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                      <MaterialIcons name="close" size={18} color="#8A8F98" />
                    </Pressable>
                  )}
                </View>
              ))}
              {options.length < 10 && (
                <Pressable onPress={() => setOptions((prev) => [...prev, ""])} className="flex-row items-center gap-1.5 p-1">
                  <MaterialIcons name="add" size={16} color="#5e6ad2" />
                  <Text className="text-body-sm text-primary-container">Add Option</Text>
                </Pressable>
              )}
            </View>
            <Button onPress={handleCreate} loading={createMutation.isPending}>
              Create Poll
            </Button>
          </View>
        )}

        {pollsQuery.isLoading ? (
          <ActivityIndicator className="py-8" color="#5e6ad2" />
        ) : polls.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No polls yet" description="Create a poll above." icon="poll" />
          </View>
        ) : (
          <View className="gap-2">
            {polls.map((poll) => {
              const maxVotes = Math.max(1, ...poll.options.map((o) => o.voteCount));
              return (
                <View key={poll.id} className="gap-3 rounded-xl border border-border-subtle bg-surface p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <View className={`h-1.5 w-1.5 rounded-full ${poll.isClosed ? "bg-text-muted" : "bg-status-green"}`} />
                      <Text className="text-label-caps uppercase text-text-muted">{poll.isClosed ? "Closed" : "Active"}</Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(poll.id, poll.question)} hitSlop={8}>
                      <MaterialIcons name="delete-outline" size={18} color="#e5484d" />
                    </Pressable>
                  </View>
                  <Text className="text-body-md font-medium text-on-surface">{poll.question}</Text>
                  <View className="gap-2">
                    {poll.options.map((option) => (
                      <View key={option.id} className="overflow-hidden rounded-md border border-border-subtle">
                        <View
                          className="absolute inset-y-0 left-0 bg-primary-container/25"
                          style={{ width: `${(option.voteCount / maxVotes) * 100}%` }}
                        />
                        <View className="flex-row items-center justify-between px-3 py-2">
                          <Text className="text-body-sm text-on-surface">{option.label}</Text>
                          <Text className="text-body-sm text-text-muted">{option.voteCount} votes</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-meta-text text-text-muted">Total: {poll.totalVotes} votes</Text>
                    {!poll.isClosed && (
                      <Pressable onPress={() => closeMutation.mutate({ pollId: poll.id })}>
                        <Text className="text-body-sm font-medium text-primary-container">END POLL</Text>
                      </Pressable>
                    )}
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
