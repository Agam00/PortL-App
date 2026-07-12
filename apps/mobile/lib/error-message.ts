import { TRPCClientError } from "@repo/trpc/client";

export function getErrorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message || "Something went wrong. Please try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
