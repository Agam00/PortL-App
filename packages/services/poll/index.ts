import { TRPCError } from "@trpc/server";
import { db, eq, count } from "@repo/database";
import { pollsTable, pollOptionsTable, pollVotesTable } from "@repo/database/schema";
import type { PollOutput } from "./model";

async function enrich(poll: typeof pollsTable.$inferSelect): Promise<PollOutput> {
  const optionRows = await db
    .select({
      id: pollOptionsTable.id,
      label: pollOptionsTable.label,
      voteCount: count(pollVotesTable.id),
    })
    .from(pollOptionsTable)
    .leftJoin(pollVotesTable, eq(pollVotesTable.optionId, pollOptionsTable.id))
    .where(eq(pollOptionsTable.pollId, poll.id))
    .groupBy(pollOptionsTable.id);

  return {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    multiSelect: poll.multiSelect,
    closesAt: poll.closesAt?.toISOString() ?? null,
    createdAt: poll.createdAt?.toISOString() ?? null,
    isClosed: !!poll.closesAt && poll.closesAt.getTime() < Date.now(),
    totalVotes: optionRows.reduce((sum, o) => sum + o.voteCount, 0),
    options: optionRows,
  };
}

class PollService {
  async create(
    societyId: string,
    createdByUserId: string,
    input: { question: string; description?: string; multiSelect?: boolean; closesAt?: string; options: string[] },
  ): Promise<PollOutput> {
    const poll = await db.transaction(async (tx) => {
      const [poll] = await tx
        .insert(pollsTable)
        .values({
          societyId,
          createdByUserId,
          question: input.question,
          description: input.description,
          multiSelect: input.multiSelect ?? false,
          closesAt: input.closesAt ? new Date(input.closesAt) : undefined,
        })
        .returning();
      if (!poll) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await tx.insert(pollOptionsTable).values(input.options.map((label) => ({ pollId: poll.id, label })));

      return poll;
    });

    return enrich(poll);
  }

  async list(societyId: string): Promise<PollOutput[]> {
    const rows = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.societyId, societyId))
      .orderBy(pollsTable.createdAt);

    return Promise.all(rows.reverse().map(enrich));
  }

  private async requireOwned(societyId: string, pollId: string) {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
    if (!poll || poll.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Poll not found" });
    }
    return poll;
  }

  async close(societyId: string, pollId: string): Promise<PollOutput> {
    const poll = await this.requireOwned(societyId, pollId);

    const [updated] = await db
      .update(pollsTable)
      .set({ closesAt: new Date() })
      .where(eq(pollsTable.id, poll.id))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return enrich(updated);
  }

  async remove(societyId: string, pollId: string): Promise<void> {
    const poll = await this.requireOwned(societyId, pollId);

    await db.transaction(async (tx) => {
      await tx.delete(pollVotesTable).where(eq(pollVotesTable.pollId, poll.id));
      await tx.delete(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id));
      await tx.delete(pollsTable).where(eq(pollsTable.id, poll.id));
    });
  }
}

export default PollService;
