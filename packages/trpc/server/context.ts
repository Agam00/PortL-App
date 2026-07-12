import { authService } from "./services";
import type { AccessTokenPayload } from "@repo/services/auth/model";

interface CreateContextOptions {
  req: {
    headers: {
      authorization?: string;
    };
  };
}

export async function createContext({ req }: CreateContextOptions) {
  const authHeader = req.headers.authorization;
  let user: AccessTokenPayload | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      user = authService.verifyAccessToken(authHeader.slice("Bearer ".length));
    } catch {
      user = null;
    }
  }

  return { user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
