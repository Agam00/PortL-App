import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { towerService } from "../../services";
import {
  createTowerInputSchema,
  updateTowerInputSchema,
  towerIdInputSchema,
  towerOutputSchema,
  listTowersOutputSchema,
} from "@repo/services/tower/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Towers"];
const getPath = generatePath("/towers");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

export const towersRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createTowerInputSchema)
    .output(towerOutputSchema)
    .mutation(async ({ ctx, input }) => towerService.create(requireSocietyId(ctx.user.societyId), input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listTowersOutputSchema)
    .query(async ({ ctx }) => towerService.list(requireSocietyId(ctx.user.societyId))),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateTowerInputSchema)
    .output(towerOutputSchema)
    .mutation(async ({ ctx, input }) => towerService.update(requireSocietyId(ctx.user.societyId), input)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(towerIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await towerService.remove(requireSocietyId(ctx.user.societyId), input.towerId);
    }),
});
