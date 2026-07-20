import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { db, eq, and, isNull } from "@repo/database";
import {
  usersTable,
  flatsTable,
  towersTable,
  refreshTokensTable,
  pushTokensTable,
} from "@repo/database/schema";
import { env } from "../env";
import { googleOAuth2Client } from "../clients/google-oauth";
import { GetAuthenticationMethodOutputSchema, AdminUserOutput } from "./model";

// Crockford-ish alphabet: no O/0, I/1 — codes get read off a screen and typed.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("");
}

/** A hash no password can produce — the account is unusable until it is claimed. */
async function unusablePasswordHash() {
  return bcrypt.hash(randomBytes(32).toString("hex"), 10);
}

function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const candidate = err as { code?: string; cause?: unknown };
  if (candidate.code === "23505") return true;
  // drizzle-orm wraps the underlying pg error as `.cause` on a DrizzleQueryError.
  return isUniqueConstraintError(candidate.cause);
}

class UserService {
  public async getAuthenticationMethods(): Promise<
    ReadonlyArray<GetAuthenticationMethodOutputSchema>
  > {
    const supportedAuthenticationProviders: GetAuthenticationMethodOutputSchema[] = [];

    const isGoogleConfigured = !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);

    if (isGoogleConfigured) {
      const url = googleOAuth2Client.generateAuthUrl();
      supportedAuthenticationProviders.push({
        provider: "GOOGLE_OAUTH",
        displayName: "Google",
        displayText: "Signin with Google",
        authUrl: url,
      });
    }

    return supportedAuthenticationProviders;
  }

  public async inviteResident(
    societyId: string,
    input: { fullName: string; email: string; phone: string; flatId: string },
  ) {
    const [flat] = await db.select().from(flatsTable).where(eq(flatsTable.id, input.flatId)).limit(1);
    if (!flat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
    }

    const inviteCode = generateInviteCode();
    const passwordHash = await unusablePasswordHash();

    try {
      const [user] = await db
        .insert(usersTable)
        .values({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: "resident",
          societyId,
          flatId: input.flatId,
          mustResetPassword: true,
          inviteCode,
        })
        .returning();

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        inviteCode,
      };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new TRPCError({ code: "CONFLICT", message: "Email or phone already in use" });
      }
      throw err;
    }
  }

  public async inviteGuard(
    societyId: string,
    input: { fullName: string; email: string; phone: string },
  ) {
    const inviteCode = generateInviteCode();
    const passwordHash = await unusablePasswordHash();

    try {
      const [user] = await db
        .insert(usersTable)
        .values({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: "guard",
          societyId,
          mustResetPassword: true,
          inviteCode,
        })
        .returning();

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        inviteCode,
      };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new TRPCError({ code: "CONFLICT", message: "Email or phone already in use" });
      }
      throw err;
    }
  }

  public async deactivateUser(userId: string) {
    await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, userId));
  }

  public async activateUser(userId: string) {
    await db.update(usersTable).set({ isActive: true }).where(eq(usersTable.id, userId));
  }

  /**
   * Soft-deletes a resident or guard: the row survives so their posts, complaints
   * and gate logs keep their author, but the login is dead and the email/phone are
   * released so the same person (or flat) can be re-added later.
   */
  public async deleteUser(societyId: string, userId: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.societyId !== societyId || user.deletedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    if (user.role === "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin accounts can't be deleted here" });
    }

    const suffix = user.id.replace(/-/g, "").slice(0, 12);

    await db
      .update(usersTable)
      .set({
        deletedAt: new Date(),
        isActive: false,
        inviteCode: null,
        passwordHash: await unusablePasswordHash(),
        email: `deleted+${suffix}@deleted.portl`,
        phone: `deleted-${suffix}`,
        flatId: null,
      })
      .where(eq(usersTable.id, userId));

    // Kill live sessions and stop pushes reaching the device.
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.userId, userId));
    await db.delete(pushTokensTable).where(eq(pushTokensTable.userId, userId));
  }

  public async listResidents(societyId: string): Promise<AdminUserOutput[]> {
    const rows = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        isActive: usersTable.isActive,
        flatId: usersTable.flatId,
        flatNumber: flatsTable.flatNumber,
        towerName: towersTable.name,
        mustResetPassword: usersTable.mustResetPassword,
        inviteCode: usersTable.inviteCode,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .leftJoin(towersTable, eq(towersTable.id, flatsTable.towerId))
      .where(
        and(
          eq(usersTable.societyId, societyId),
          eq(usersTable.role, "resident"),
          isNull(usersTable.deletedAt),
        ),
      )
      .orderBy(usersTable.fullName);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  }

  public async listGuards(societyId: string): Promise<AdminUserOutput[]> {
    const rows = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        isActive: usersTable.isActive,
        flatId: usersTable.flatId,
        mustResetPassword: usersTable.mustResetPassword,
        inviteCode: usersTable.inviteCode,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.societyId, societyId),
          eq(usersTable.role, "guard"),
          isNull(usersTable.deletedAt),
        ),
      )
      .orderBy(usersTable.fullName);

    return rows.map((row) => ({
      ...row,
      flatNumber: null,
      towerName: null,
      createdAt: row.createdAt?.toISOString() ?? null,
    }));
  }

  public async reassignResidentFlat(societyId: string, userId: string, flatId: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.societyId !== societyId || user.role !== "resident") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Resident not found" });
    }

    const [flat] = await db
      .select({ flat: flatsTable, tower: towersTable })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(eq(flatsTable.id, flatId))
      .limit(1);
    if (!flat || flat.tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
    }

    await db.update(usersTable).set({ flatId }).where(eq(usersTable.id, userId));
  }
}

export default UserService;
