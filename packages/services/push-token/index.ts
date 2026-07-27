import { db, eq, and, ne } from "@repo/database";
import { pushTokensTable } from "@repo/database/schema";

class PushTokenService {
  async register(userId: string, input: { expoPushToken: string; deviceInfo?: string }): Promise<void> {
    // A device's push token belongs to exactly one account at a time. If this exact token was
    // previously registered to a *different* user on the same physical device (i.e. someone
    // logged out and a different role logged in), those stale rows must be removed first — otherwise
    // the device keeps receiving the previous account's pushes (e.g. a resident getting the guard's
    // "visitor decision" push, or an admin getting the resident's "new reply" push).
    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.expoPushToken, input.expoPushToken), ne(pushTokensTable.userId, userId)));

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

  /** Remove this device's token on logout so a signed-out device stops receiving pushes. */
  async unregister(userId: string, expoPushToken: string): Promise<void> {
    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.expoPushToken, expoPushToken)));
  }
}

export default PushTokenService;
