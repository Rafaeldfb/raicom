import { z } from "zod";
import { SkuSchema } from "./sku.schema";

export const WarehouseCodeSchema = z.string().refine(
  (value) => value.trim().length > 0,
  { message: "Warehouse code must not be blank" },
);

const CitySchema = z.string().refine((value) => value.trim().length > 0, {
  message: "City must not be blank",
});

export const InventoryEntrySchema = z.strictObject({
  available: z.number().int().nonnegative(),
  // Velocity is a rate; zero is present in the supplied data.
  dailyVelocity: z.number().nonnegative(),
});

export const WarehouseSchema = z.strictObject({
  code: WarehouseCodeSchema,
  city: CitySchema,
  enabled: z.boolean(),
  inventory: z.record(SkuSchema, InventoryEntrySchema),
});

export const WarehousesSchema = z.array(WarehouseSchema);

export type WarehouseCodeInput = z.input<typeof WarehouseCodeSchema>;
export type WarehouseCodeOutput = z.output<typeof WarehouseCodeSchema>;
export type InventoryEntryInput = z.input<typeof InventoryEntrySchema>;
export type InventoryEntryOutput = z.output<typeof InventoryEntrySchema>;
export type WarehouseInput = z.input<typeof WarehouseSchema>;
export type WarehouseOutput = z.output<typeof WarehouseSchema>;
export type WarehousesInput = z.input<typeof WarehousesSchema>;
export type WarehousesOutput = z.output<typeof WarehousesSchema>;
