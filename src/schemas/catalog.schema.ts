import { z } from "zod";
import { SkuSchema } from "./sku.schema";

const NameSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "Name must not be blank",
});

const PriceCentsSchema = z.number().int().nonnegative();
const ComponentQuantitySchema = z.number().int().positive();

export const ProductSchema = z.strictObject({
  sku: SkuSchema,
  name: NameSchema,
  priceCents: PriceCentsSchema,
});

export const ComponentSchema = z.strictObject({
  sku: SkuSchema,
  quantity: ComponentQuantitySchema,
});

export const BundleSchema = ProductSchema.extend({
  components: z.array(ComponentSchema).min(1),
});

export const CatalogSchema = z.strictObject({
  products: z.array(ProductSchema),
  bundles: z.array(BundleSchema),
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type ComponentInput = z.infer<typeof ComponentSchema>;
export type BundleInput = z.infer<typeof BundleSchema>;
export type CatalogInput = z.infer<typeof CatalogSchema>;
