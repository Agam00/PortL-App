import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { db, eq, and, or, isNull } from "@repo/database";
import { usersTable, refreshTokensTable, flatsTable, societiesTable } from "@repo/database/schema";
import { env } from "../env";
import type { AccessTokenPayload, AuthUser } from "./model";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: typeof usersTable.$inferSelect): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    societyId: user.societyId,
    flatId: user.flatId,
    mustResetPassword: user.mustResetPassword,
  };
}

class AuthService {
  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
    }
  }

  private async issueRefreshToken(userId: string, deviceInfo?: string | null) {
    const token = randomBytes(32).toString("hex");
    await db.insert(refreshTokensTable).values({
      userId,
      tokenHash: hashToken(token),
      deviceInfo: deviceInfo ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return token;
  }

  async login(identifier: string, password: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          or(eq(usersTable.email, identifier), eq(usersTable.phone, identifier)),
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);

    if (!user || !user.isActive) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    if (user.inviteCode) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Account not activated yet — use the invite code from your admin to set a password",
      });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const accessToken = this.signAccessToken({
      sub: user.id,
      role: user.role,
      societyId: user.societyId,
      flatId: user.flatId,
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    return { accessToken, refreshToken, user: toAuthUser(user) };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const [existing] = await db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.tokenHash, tokenHash))
      .limit(1);

    if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
    }

    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.id, existing.id));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, existing.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User no longer active" });
    }

    const accessToken = this.signAccessToken({
      sub: user.id,
      role: user.role,
      societyId: user.societyId,
      flatId: user.flatId,
    });
    const newRefreshToken = await this.issueRefreshToken(user.id, existing.deviceInfo);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.tokenHash, tokenHash));
  }

  /** Looks up an unclaimed invite so the activation screen can confirm who it belongs to. */
  async lookupInvite(code: string) {
    const [row] = await db
      .select({ user: usersTable, flatNumber: flatsTable.flatNumber, societyName: societiesTable.name })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .leftJoin(societiesTable, eq(societiesTable.id, usersTable.societyId))
      .where(and(eq(usersTable.inviteCode, code), isNull(usersTable.deletedAt)))
      .limit(1);

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "That invite code isn't valid" });
    }

    return {
      fullName: row.user.fullName,
      role: row.user.role,
      phone: row.user.phone,
      societyName: row.societyName ?? null,
      flatNumber: row.flatNumber ?? null,
    };
  }

  /** Redeems an invite code: the user picks their password and is signed straight in. */
  async claimAccount(code: string, password: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.inviteCode, code), isNull(usersTable.deletedAt)))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "That invite code isn't valid" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await db
      .update(usersTable)
      .set({ passwordHash, mustResetPassword: false, inviteCode: null, isActive: true })
      .where(eq(usersTable.id, user.id))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const accessToken = this.signAccessToken({
      sub: updated.id,
      role: updated.role,
      societyId: updated.societyId,
      flatId: updated.flatId,
    });
    const refreshToken = await this.issueRefreshToken(updated.id);

    return { accessToken, refreshToken, user: toAuthUser(updated) };
  }

  async setPassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash, mustResetPassword: false })
      .where(eq(usersTable.id, userId));
  }

  async getById(userId: string): Promise<AuthUser | null> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return user ? toAuthUser(user) : null;
  }
}

export default AuthService;
