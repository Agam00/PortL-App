import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { chatService, notificationService } from "../../services";
import {
  sendMessageInputSchema,
  threadInputSchema,
  messageOutputSchema,
  threadOutputSchema,
  conversationsOutputSchema,
} from "@repo/services/chat/model";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Chat"];
const getPath = generatePath("/chat");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

export const chatRouter = router({
  send: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/send"), tags: TAGS } })
    .input(sendMessageInputSchema)
    .output(messageOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await chatService.send(
        requireSocietyId(ctx.user.societyId),
        ctx.user.sub,
        input.recipientId,
        input.body,
      );
      await notificationService.notifyNewMessage(input.recipientId, ctx.user.sub, input.body);
      return message;
    }),

  thread: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/thread"), tags: TAGS } })
    .input(threadInputSchema)
    .output(threadOutputSchema)
    .query(async ({ ctx, input }) => chatService.thread(ctx.user.sub, input.peerId)),

  conversations: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/conversations"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(conversationsOutputSchema)
    .query(async ({ ctx }) => chatService.conversations(ctx.user.sub)),
});
