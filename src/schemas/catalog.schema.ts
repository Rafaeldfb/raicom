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

export type ProductInput = z.input<typeof ProductSchema>;
export type ProductOutput = z.output<typeof ProductSchema>;
export type ComponentInput = z.input<typeof ComponentSchema>;
export type ComponentOutput = z.output<typeof ComponentSchema>;
export type BundleInput = z.input<typeof BundleSchema>;
export type BundleOutput = z.output<typeof BundleSchema>;
export type CatalogInput = z.input<typeof CatalogSchema>;
export type CatalogOutput = z.output<typeof CatalogSchema>;
