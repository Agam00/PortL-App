import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { db, eq, and } from "@repo/database";
import { usersTable, flatsTable, towersTable } from "@repo/database/schema";
import { env } from "../env";
import { googleOAuth2Client } from "../clients/google-oauth";
import { GetAuthenticationMethodOutputSchema, AdminUserOutput } from "./model";

function generateTempPassword() {
  return randomBytes(6).toString("base64url");
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

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

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
        tempPassword,
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
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

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
        tempPassword,
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
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .leftJoin(towersTable, eq(towersTable.id, flatsTable.towerId))
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident")))
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
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "guard")))
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
