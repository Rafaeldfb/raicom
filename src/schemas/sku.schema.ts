import { z } from "zod";
import { normalizeSku } from "../normalization/sku";

export const CanonicalSkuSchema = z
  .string()
  .refine((value) => value.trim().length > 0, {
    message: "SKU must not be blank",
  })
  .uppercase()
  .brand<"Sku">();

export const SkuSchema = z
  .string()
  .transform(normalizeSku)
  .pipe(CanonicalSkuSchema);

export type SkuInput = z.input<typeof SkuSchema>;
export type Sku = z.output<typeof SkuSchema>;
