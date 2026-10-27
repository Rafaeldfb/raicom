import { z } from "zod";
import { normalizeUsZip, normalizeZipText } from "../normalization/zip";
import { SkuSchema } from "./sku.schema";
import {
  PostalAssessmentSchema,
  RawZipSchema,
  ZipValueSchema,
} from "./zip.schema";

export { RawZipSchema } from "./zip.schema";
export type { RawZipInput, RawZipOutput } from "./zip.schema";

const NonBlankStringSchema = z.string().refine(
  (value) => value.trim().length > 0,
  { message: "Value must not be blank" },
);

export const OrderNumberSchema = NonBlankStringSchema;
export const EventTimestampSchema = z.iso.datetime({ offset: true });

export const RawShipToSchema = z.strictObject({
  country: NonBlankStringSchema,
  state: NonBlankStringSchema,
  zip: RawZipSchema,
});

// A piped root union in Zod 4.6.7 can discard upstream unknown-key issues.
const ShipToOutputSchema = RawShipToSchema.extend({
  zip: z.string(),
  postalAssessment: PostalAssessmentSchema.nullable(),
}).superRefine(({ zip, postalAssessment }, context) => {
  if (postalAssessment?.kind === "missing" && zip !== "") {
    context.addIssue({ code: "custom", message: "Missing ZIP must be empty", path: ["zip"] });
  }
  if (postalAssessment?.kind !== "recognized") return;

  const result = ZipValueSchema.safeParse(zip);
  if (!result.success) {
    for (const issue of result.error.issues) {
      context.addIssue({ ...issue, path: ["zip", ...issue.path] });
    }
  }
  if (postalAssessment.prefix !== zip.slice(0, 3)) {
    context.addIssue({
      code: "custom",
      message: "ZIP prefix must match the first three digits of the ZIP",
      path: ["postalAssessment", "prefix"],
    });
  }
});

export const ShipToSchema = RawShipToSchema.transform((destination) => ({
  ...destination,
  ...(destination.country === "US"
    ? normalizeUsZip(destination.zip)
    : { zip: normalizeZipText(destination.zip), postalAssessment: null }),
})).pipe(ShipToOutputSchema);

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

export type OrderNumberInput = z.input<typeof OrderNumberSchema>;
export type OrderNumberOutput = z.output<typeof OrderNumberSchema>;
export type EventTimestampInput = z.input<typeof EventTimestampSchema>;
export type EventTimestampOutput = z.output<typeof EventTimestampSchema>;
export type ShipToInput = z.input<typeof ShipToSchema>;
export type ShipToOutput = z.output<typeof ShipToSchema>;
export type OrderLineInput = z.input<typeof OrderLineSchema>;
export type OrderLineOutput = z.output<typeof OrderLineSchema>;
export type OrderCreatedEventInput = z.input<typeof OrderCreatedEventSchema>;
export type OrderCreatedEventOutput = z.output<typeof OrderCreatedEventSchema>;
export type OrderEditedEventInput = z.input<typeof OrderEditedEventSchema>;
export type OrderEditedEventOutput = z.output<typeof OrderEditedEventSchema>;
export type OrderEventInput = z.input<typeof OrderEventSchema>;
export type OrderEventOutput = z.output<typeof OrderEventSchema>;
export type OrderEventsInput = z.input<typeof OrderEventsSchema>;
export type OrderEventsOutput = z.output<typeof OrderEventsSchema>;
