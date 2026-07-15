import { zodUndefinedModel } from "../../schema";
import { pushTokenService } from "../../services";
import { registerPushTokenInputSchema } from "@repo/services/push-token/model";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["PushTokens"];
const getPath = generatePath("/push-tokens");

export const pushTokensRouter = router({
  register: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/register"), tags: TAGS } })
    .input(registerPushTokenInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await pushTokenService.register(ctx.user.sub, input);
    }),
});
