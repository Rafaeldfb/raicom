import { z } from "zod";
import { SkuSchema } from "./sku.schema";

const NonBlankStringSchema = z.string().refine(
  (value) => value.trim().length > 0,
  { message: "Value must not be blank" },
);

export const OrderNumberSchema = NonBlankStringSchema;
export const EventTimestampSchema = z.iso.datetime({ offset: true });

// This models the raw representation, not postal validity or ZIP repair.
export const RawZipSchema = z.union([z.string(), z.number()]).nullish();

export const ShipToSchema = z.strictObject({
  country: NonBlankStringSchema,
  state: NonBlankStringSchema,
  zip: RawZipSchema,
});

export const OrderLineSchema = z.strictObject({
  sku: SkuSchema,
  quantity: z.number().int().positive(),
});

const EventBaseSchema = z.strictObject({
  orderNumber: OrderNumberSchema,
  at: EventTimestampSchema,
});

export const OrderCreatedEventSchema = EventBaseSchema.extend({
  type: z.literal("order_created"),
  shipTo: ShipToSchema,
  lines: z.array(OrderLineSchema).min(1),
});

export const OrderEditedEventSchema = EventBaseSchema.extend({
  type: z.literal("order_edited"),
  addedLines: z.array(OrderLineSchema).min(1),
});

export const OrderEventSchema = z.discriminatedUnion("type", [
  OrderCreatedEventSchema,
  OrderEditedEventSchema,
]);

export const OrderEventsSchema = z.array(OrderEventSchema);

export type OrderNumberInput = z.infer<typeof OrderNumberSchema>;
export type EventTimestampInput = z.infer<typeof EventTimestampSchema>;
export type RawZipInput = z.infer<typeof RawZipSchema>;
export type ShipToInput = z.infer<typeof ShipToSchema>;
export type OrderLineInput = z.infer<typeof OrderLineSchema>;
export type OrderCreatedEventInput = z.infer<typeof OrderCreatedEventSchema>;
export type OrderEditedEventInput = z.infer<typeof OrderEditedEventSchema>;
export type OrderEventInput = z.infer<typeof OrderEventSchema>;
export type OrderEventsInput = z.infer<typeof OrderEventsSchema>;
