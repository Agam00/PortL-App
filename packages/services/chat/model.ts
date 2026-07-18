import { z } from "zod";

export const sendMessageInputSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export const threadInputSchema = z.object({
  peerId: z.string().uuid(),
});

export const messageOutputSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  body: z.string(),
  isMine: z.boolean(),
  createdAt: z.string().nullable(),
});
export type MessageOutput = z.infer<typeof messageOutputSchema>;

export const threadOutputSchema = z.array(messageOutputSchema);

export const conversationOutputSchema = z.object({
  peerId: z.string().uuid(),
  peerName: z.string(),
  peerFlat: z.string().nullable(),
  lastMessage: z.string(),
  lastAt: z.string().nullable(),
  unreadCount: z.number(),
});
export type ConversationOutput = z.infer<typeof conversationOutputSchema>;

export const conversationsOutputSchema = z.array(conversationOutputSchema);
