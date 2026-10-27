import { z } from "zod";
import { US_ZIP_PATTERN } from "../normalization/zip";

// Preserve source representations; recognition is a separate US-context step.
export const RawZipSchema = z.union([z.string(), z.number()]).nullish();

export const ZipValueSchema = z
  .string()
  .regex(US_ZIP_PATTERN, {
    message: "ZIP value must be five ASCII digits or hyphenated ZIP+4",
  })
  .brand<"ZipValue">();

export const ZipPrefixSchema = z
  .string()
  .length(3)
  .regex(/^[0-9]{3}$/, {
    message: "ZIP prefix must contain exactly three ASCII digits",
  })
  .brand<"ZipPrefix">();

export const RecognizedPostalAssessmentSchema = z.strictObject({
  kind: z.literal("recognized"),
  prefix: ZipPrefixSchema,
});

export const MissingPostalAssessmentSchema = z.strictObject({ kind: z.literal("missing") });
export const UnrecognizedPostalAssessmentSchema = z.strictObject({ kind: z.literal("unrecognized") });

export const PostalAssessmentSchema = z.discriminatedUnion("kind", [
  RecognizedPostalAssessmentSchema,
  MissingPostalAssessmentSchema,
  UnrecognizedPostalAssessmentSchema,
]);

export type RawZipInput = z.input<typeof RawZipSchema>;
export type RawZipOutput = z.output<typeof RawZipSchema>;
export type ZipValueInput = z.input<typeof ZipValueSchema>;
export type ZipValueOutput = z.output<typeof ZipValueSchema>;
export type ZipValue = ZipValueOutput;
export type ZipPrefixInput = z.input<typeof ZipPrefixSchema>;
export type ZipPrefixOutput = z.output<typeof ZipPrefixSchema>;
export type ZipPrefix = ZipPrefixOutput;
export type PostalAssessmentInput = z.input<typeof PostalAssessmentSchema>;
export type PostalAssessmentOutput = z.output<typeof PostalAssessmentSchema>;
