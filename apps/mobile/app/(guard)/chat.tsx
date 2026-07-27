import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticError } from "../../lib/haptics";
import { useKeyboardVisible } from "../../hooks/use-keyboard-visible";
import { Avatar } from "../../components/ui/avatar";

function timeLabel(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GuardChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const { peerId, name } = useLocalSearchParams<{ peerId?: string; name?: string }>();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const keyboardVisible = useKeyboardVisible();
  const utils = trpc.useUtils();

  const threadQuery = trpc.chat.thread.useQuery({ peerId: peerId ?? "" }, { enabled: !!peerId, refetchInterval: 4000 });
  const messages = threadQuery.data ?? [];

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.chat.thread.invalidate({ peerId: peerId ?? "" });
      utils.chat.conversations.invalidate();
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  function send() {
    if (!draft.trim() || !peerId) return;
    sendMutation.mutate({ recipientId: peerId, body: draft.trim() });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View
        className="flex-row items-center gap-3 px-4 pb-3"
        style={{ paddingTop: insets.top + 10, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Avatar name={name ?? "Resident"} size={40} />
        <Text className="flex-1 text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
          {name ?? "Resident"}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 60}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="gap-2 px-4 py-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {threadQuery.isLoading ? (
            <ActivityIndicator color="#F5821F" style={{ marginTop: 24 }} />
          ) : messages.length === 0 ? (
            <View className="items-center pt-16">
              <MaterialIcons name="chat-bubble-outline" size={40} color="#3A3A3A" />
              <Text className="pt-3 text-body-md text-text-muted">Message {name ?? "the resident"} 👋</Text>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} className={m.isMine ? "items-end" : "items-start"}>
                <View className="max-w-[80%] rounded-2xl px-4 py-2.5" style={{ backgroundColor: m.isMine ? "#F5821F" : "#242424" }}>
                  <Text className="text-body-md" style={{ color: m.isMine ? "#141118" : "#F5F5F5" }}>
                    {m.body}
                  </Text>
                </View>
                <Text className="px-1 pt-0.5 text-meta-text text-text-muted">{timeLabel(m.createdAt)}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View
          className="flex-row items-center gap-2 px-4 pt-2"
          style={{ paddingBottom: keyboardVisible ? 8 : insets.bottom > 0 ? insets.bottom : 12, borderTopWidth: 1, borderTopColor: "#1A1A1A" }}
        >
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#7E7E7E"
            value={draft}
            onChangeText={setDraft}
            multiline
            className="max-h-24 flex-1 rounded-full px-4 py-3 text-body-md text-on-surface"
            style={{ backgroundColor: "#1A1A1A" }}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sendMutation.isPending}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: draft.trim() ? "#F5821F" : "#4A3416" }}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <MaterialIcons name="send" size={20} color="#141118" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
