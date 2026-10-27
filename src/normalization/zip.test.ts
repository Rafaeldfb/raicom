import { describe, expect, it } from "vitest";
import { normalizeUsZip, normalizeZipText } from "./zip";

describe("normalizeUsZip", () => {
  it.each([undefined, null, ""])("classifies %j as missing", (input) => {
    expect(normalizeUsZip(input)).toEqual({ zip: "", postalAssessment: { kind: "missing" } });
  });

  it.each([
    [2134, "02134", "021"],
    [1000, "01000", "010"],
    [9999, "09999", "099"],
    [10000, "10000", "100"],
    [30303, "30303", "303"],
    [99999, "99999", "999"],
    ["07030", "07030", "070"],
    ["00000", "00000", "000"],
    ["96815", "96815", "968"],
    ["07030-1834", "07030-1834", "070"],
    ["02134-0001", "02134-0001", "021"],
  ])("recognizes %j without changing the complete supported value", (input, value, prefix) => {
    expect(normalizeUsZip(input)).toEqual({ zip: value, postalAssessment: { kind: "recognized", prefix } });
  });

  it.each([
    0, 99, 999, 100000, -2134, 2134.5, NaN, Infinity, -Infinity,
    "2134", "0703", "070", "070301834", "07030-183", "07030-18345",
    "07030 1834", "ZIP07030", "070garbage", "M5V 2T6", "1234.5",
    " ", "\t\n", " 07030", "07030 ", "\n07030", "07030\n",
    "07030-1834\r\n", "07030\u2028", "０７０３０", "٠٧٠٣٠",
  ])("classifies %j as unrecognized without repair", (input) => {
    expect(normalizeUsZip(input)).toEqual({ zip: String(input), postalAssessment: { kind: "unrecognized" } });
  });
});


describe("normalizeZipText", () => {
  it.each([
    [undefined, ""], [null, ""], ["", ""], [2134, "2134"],
    [-1, "-1"], [1.5, "1.5"], ["M5V 2T6", "M5V 2T6"], [" 07030 ", " 07030 "],
  ])("represents %j as text without postal repair", (input, expected) => {
    expect(normalizeZipText(input)).toBe(expected);
  });
});
