import { z } from "zod";

// Preserve the supplied text while the normalization policy remains open.
export const SkuSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "SKU must not be blank",
});

export type SkuInput = z.infer<typeof SkuSchema>;
