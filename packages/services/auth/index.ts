import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { db, eq, or } from "@repo/database";
import { usersTable, refreshTokensTable } from "@repo/database/schema";
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
      .where(or(eq(usersTable.email, identifier), eq(usersTable.phone, identifier)))
      .limit(1);

    if (!user || !user.isActive) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
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
