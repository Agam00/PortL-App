import { Alert } from "react-native";
import { trpc } from "./trpc";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "./error-message";

type TargetType = "post" | "comment" | "message" | "user";

/** Report + Block actions with native confirm dialogs (App Store Guideline 1.2). */
export function useModeration() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const reportMutation = trpc.moderation.report.useMutation({
    onSuccess: () => showToast("Reported. Thanks — our team will review it.", "success"),
    onError: (e) => showToast(getErrorMessage(e), "error"),
  });

  const blockMutation = trpc.moderation.block.useMutation({
    onSuccess: () => {
      showToast("User blocked. You won't see their content.", "success");
      utils.posts.list.invalidate();
      utils.chat.conversations.invalidate();
    },
    onError: (e) => showToast(getErrorMessage(e), "error"),
  });

  function report(targetType: TargetType, targetId: string) {
    Alert.alert("Report this content?", "Our team will review it for violating our guidelines.", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: () => reportMutation.mutate({ targetType, targetId }) },
    ]);
  }

  function block(userId: string, name: string | undefined, onBlocked?: () => void) {
    Alert.alert(
      `Block ${name ?? "this user"}?`,
      "You won't see their posts, comments, or messages, and they can't message you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => blockMutation.mutate({ userId }, { onSuccess: onBlocked }),
        },
      ],
    );
  }

  /** Action sheet with Report + Block for a piece of content authored by `userId`. */
  function openMenu(opts: { userId: string; targetType: TargetType; targetId: string; name?: string; onBlocked?: () => void }) {
    Alert.alert(opts.name ?? "Options", undefined, [
      { text: "Report", onPress: () => report(opts.targetType, opts.targetId) },
      { text: `Block ${opts.name ?? "user"}`, style: "destructive", onPress: () => block(opts.userId, opts.name, opts.onBlocked) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return { report, block, openMenu };
}
