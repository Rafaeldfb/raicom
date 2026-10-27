import { z } from "zod";
import { WarehouseCodeSchema } from "./warehouse.schema";
import { ZipPrefixSchema } from "./zip.schema";

export { ZipPrefixSchema } from "./zip.schema";
export type { ZipPrefixInput, ZipPrefixOutput } from "./zip.schema";

export const ZoneSchema = z.number().int().min(1).max(8);
export const WarehouseZonesSchema = z.record(ZipPrefixSchema, ZoneSchema);

export const ZonesSchema = z
  .object({ _note: z.string() })
  // The raw object mixes a metadata string with dynamic warehouse maps.
  .catchall(z.union([z.string(), WarehouseZonesSchema]))
  .superRefine((input, context) => {
    for (const [code, zones] of Object.entries(input)) {
      if (code === "_note") continue;

      if (!WarehouseCodeSchema.safeParse(code).success) {
        context.addIssue({
          code: "custom",
          path: [code],
          message: "Warehouse code must not be blank",
        });
      }

      if (typeof zones === "string") {
        context.addIssue({
          code: "custom",
          path: [code],
          message: "Warehouse zones must be a ZIP-prefix-to-zone map",
        });
      }
    }
  });

export type ZoneInput = z.input<typeof ZoneSchema>;
export type ZoneOutput = z.output<typeof ZoneSchema>;
export type WarehouseZonesInput = z.input<typeof WarehouseZonesSchema>;
export type WarehouseZonesOutput = z.output<typeof WarehouseZonesSchema>;
export type ZonesInput = z.input<typeof ZonesSchema>;
export type ZonesOutput = z.output<typeof ZonesSchema>;
