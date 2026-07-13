import { z } from "zod";

export const createPollInputSchema = z.object({
  question: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  multiSelect: z.boolean().optional(),
  closesAt: z.string().datetime().optional(),
  options: z.array(z.string().min(1).max(120)).min(2).max(10),
});

export const pollIdInputSchema = z.object({
  pollId: z.string().uuid(),
});

export const pollOptionOutputSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  voteCount: z.number(),
});

export const pollOutputSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  description: z.string().nullable(),
  multiSelect: z.boolean(),
  closesAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  isClosed: z.boolean(),
  totalVotes: z.number(),
  options: z.array(pollOptionOutputSchema),
});
export type PollOutput = z.infer<typeof pollOutputSchema>;

export const listPollsOutputSchema = z.array(pollOutputSchema);
