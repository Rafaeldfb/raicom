// Unlike `$`, this end check cannot match before a trailing newline.
export const US_ZIP_PATTERN = /^[0-9]{5}(?:-[0-9]{4})?(?![\s\S])/;

export function normalizeZipText(raw: string | number | null | undefined): string {
  return raw === undefined || raw === null ? "" : String(raw);
}

export function normalizeUsZip(raw: string | number | null | undefined) {
  if (raw === undefined || raw === null || raw === "") {
    return { zip: "", postalAssessment: { kind: "missing" as const } };
  }

  let value: string;
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 1000 || raw > 99999) {
      return {
        zip: normalizeZipText(raw),
        postalAssessment: { kind: "unrecognized" as const },
      };
    }
    value = String(raw).padStart(5, "0");
  } else {
    value = raw;
  }

  if (!US_ZIP_PATTERN.test(value)) {
    return { zip: value, postalAssessment: { kind: "unrecognized" as const } };
  }

  return {
    zip: value,
    postalAssessment: { kind: "recognized" as const, prefix: value.slice(0, 3) },
  };
}
