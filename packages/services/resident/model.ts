import { z } from "zod";

export const searchResidentsInputSchema = z.object({
  query: z.string().min(1).max(50),
});

export const flatSearchResultSchema = z.object({
  flatId: z.string().uuid(),
  flatNumber: z.string(),
  towerName: z.string(),
  residents: z.array(
    z.object({
      id: z.string().uuid(),
      fullName: z.string(),
      phone: z.string(),
    }),
  ),
});

export const searchResidentsOutputSchema = z.array(flatSearchResultSchema);
export type FlatSearchResult = z.infer<typeof flatSearchResultSchema>;
