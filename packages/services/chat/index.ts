import { TRPCError } from "@trpc/server";
import { db, eq, and, or, isNull, desc, ne } from "@repo/database";
import { messagesTable, usersTable, flatsTable, userBlocksTable } from "@repo/database/schema";
import type { MessageOutput, ConversationOutput, StaffContactOutput } from "./model";

class ChatService {
  /** Society admins the caller can start a direct chat with (self excluded). */
  async staffContacts(societyId: string, userId: string): Promise<StaffContactOutput[]> {
    const rows = await db
      .select({ id: usersTable.id, name: usersTable.fullName, role: usersTable.role })
      .from(usersTable)
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "admin"), ne(usersTable.id, userId)));

    return rows.map((r) => ({ id: r.id, name: r.name, role: r.role as "admin" }));
  }

  async send(societyId: string, senderId: string, recipientId: string, body: string): Promise<MessageOutput> {
    if (recipientId === senderId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't message yourself" });
    }
    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId)).limit(1);
    if (!recipient || recipient.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found in your society" });
    }

    // Can't message someone you've blocked, or who has blocked you.
    const [blocked] = await db
      .select({ id: userBlocksTable.id })
      .from(userBlocksTable)
      .where(
        or(
          and(eq(userBlocksTable.blockerId, senderId), eq(userBlocksTable.blockedId, recipientId)),
          and(eq(userBlocksTable.blockerId, recipientId), eq(userBlocksTable.blockedId, senderId)),
        ),
      )
      .limit(1);
    if (blocked) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can't message this user." });
    }

    const [msg] = await db.insert(messagesTable).values({ societyId, senderId, recipientId, body }).returning();
    if (!msg) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return {
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      body: msg.body,
      isMine: true,
      createdAt: msg.createdAt?.toISOString() ?? null,
    };
  }

  /** Full thread between the caller and a peer; marks the peer's messages to the caller as read. */
  async thread(userId: string, peerId: string): Promise<MessageOutput[]> {
    const rows = await db
      .select()
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, peerId)),
          and(eq(messagesTable.senderId, peerId), eq(messagesTable.recipientId, userId)),
        ),
      )
      .orderBy(messagesTable.createdAt);

    await db
      .update(messagesTable)
      .set({ readAt: new Date() })
      .where(and(eq(messagesTable.senderId, peerId), eq(messagesTable.recipientId, userId), isNull(messagesTable.readAt)));

    return rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      body: m.body,
      isMine: m.senderId === userId,
      createdAt: m.createdAt?.toISOString() ?? null,
    }));
  }

  /** Recent conversations — the latest message per peer, with unread counts. */
  async conversations(userId: string): Promise<ConversationOutput[]> {
    const rows = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        body: messagesTable.body,
        readAt: messagesTable.readAt,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(or(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, userId)))
      .orderBy(desc(messagesTable.createdAt));

    type Acc = { peerId: string; lastMessage: string; lastAt: Date | null; unreadCount: number };
    const byPeer = new Map<string, Acc>();
    for (const m of rows) {
      const peerId = m.senderId === userId ? m.recipientId : m.senderId;
      let entry = byPeer.get(peerId);
      if (!entry) {
        entry = { peerId, lastMessage: m.body, lastAt: m.createdAt, unreadCount: 0 };
        byPeer.set(peerId, entry);
      }
      if (m.recipientId === userId && !m.readAt) entry.unreadCount += 1;
    }

    // Hide conversations with users blocked in either direction.
    const blockRows = await db
      .select({ blockerId: userBlocksTable.blockerId, blockedId: userBlocksTable.blockedId })
      .from(userBlocksTable)
      .where(or(eq(userBlocksTable.blockerId, userId), eq(userBlocksTable.blockedId, userId)));
    const hidden = new Set<string>();
    for (const b of blockRows) hidden.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    for (const id of hidden) byPeer.delete(id);

    const peerIds = Array.from(byPeer.keys());
    if (peerIds.length === 0) return [];

    const peers = await db
      .select({ id: usersTable.id, name: usersTable.fullName, flatNumber: flatsTable.flatNumber, role: usersTable.role })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(or(...peerIds.map((id) => eq(usersTable.id, id))));
    const peerMap = new Map(peers.map((p) => [p.id, p]));

    return Array.from(byPeer.values()).map((c) => ({
      peerId: c.peerId,
      peerName: peerMap.get(c.peerId)?.name ?? "Resident",
      peerFlat: peerMap.get(c.peerId)?.flatNumber ?? null,
      peerRole: (peerMap.get(c.peerId)?.role ?? "resident") as "resident" | "guard" | "admin",
      lastMessage: c.lastMessage,
      lastAt: c.lastAt?.toISOString() ?? null,
      unreadCount: c.unreadCount,
    }));
  }
}

export default ChatService;
