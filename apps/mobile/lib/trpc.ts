import { createTRPCReact } from "@trpc/react-query";
import type { ServerRouter, RouterOutputs } from "@repo/trpc/client";

export const trpc = createTRPCReact<ServerRouter>();

export type AuthUser = RouterOutputs["auth"]["me"];
