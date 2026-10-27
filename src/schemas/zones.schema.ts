import { z } from "zod";
import { WarehouseCodeSchema } from "./warehouse.schema";

export const ZipPrefixSchema = z.string().regex(/^[0-9]{3}$/, {
  message: "ZIP prefix must contain exactly three ASCII digits",
});

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

export type ZipPrefixInput = z.infer<typeof ZipPrefixSchema>;
export type ZoneInput = z.infer<typeof ZoneSchema>;
export type WarehouseZonesInput = z.infer<typeof WarehouseZonesSchema>;
export type ZonesInput = z.infer<typeof ZonesSchema>;
