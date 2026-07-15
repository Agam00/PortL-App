import { db, eq, and } from "@repo/database";
import { pushTokensTable } from "@repo/database/schema";

class PushTokenService {
  async register(userId: string, input: { expoPushToken: string; deviceInfo?: string }): Promise<void> {
    const [existing] = await db
      .select()
      .from(pushTokensTable)
      .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.expoPushToken, input.expoPushToken)))
      .limit(1);
    if (existing) return;

    await db.insert(pushTokensTable).values({
      userId,
      expoPushToken: input.expoPushToken,
      deviceInfo: input.deviceInfo,
    });
  }
}

export default PushTokenService;
