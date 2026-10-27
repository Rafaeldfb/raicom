# Part A input data research

## Context and purpose

Rafael requested this investigation before implementing the Part A order router, to understand the supplied catalog, order events, warehouses, and shipping zones. Codex read all four datasets and used Python to inspect their structure, cardinality, types, duplicates, timestamps, and cross-file relationships.

This document provides a reference for understanding the inputs, identifying cases that deserve validation, and discussing interpretations before implementation. It separates observed facts from unresolved interpretations; it does not establish accepted normalization rules, engineering decisions, or verified routing results. Accepted interpretations belong in [ASSUMPTIONS.md](../ASSUMPTIONS.md), significant accepted engineering choices in [DECISIONS.md](../DECISIONS.md), and collaboration history in [JOURNAL.md](../JOURNAL.md).

The complete research response is preserved below, with file links made relative to this document. Its findings and statements about project status describe the supplied data and the project at the time of the investigation on 2026-10-27. Recheck them if the inputs change.

The working datasets are in `data/`, copied byte-for-byte from the originals retained in `raicom-files/`. The JSON links below point to these working copies.

## Research response

I read all four datasets and checked their counts, types, duplicates, timestamps, and relationships. **All four are valid JSON.** The main issues concern interpreting their contents.

| Dataset | Top-level structure | Cardinality |
|---|---|---|
| Catalog | Object containing `products` and `bundles` arrays | 3 products, 1 bundle |
| Orders | Array of events | 27 events representing 26 orders |
| Warehouses | Array of warehouse objects | 4 warehouses, 12 inventory entries |
| Zones | Object containing metadata and warehouse maps | 4 warehouse maps × 13 prefixes = 52 mappings |

**1. Catalog**

In [catalog.json](../data/catalog.json), the observed structure is:

```ts
{
  products: Array<{
    sku: string;
    name: string;
    priceCents: number;
  }>;
  bundles: Array<{
    sku: string;
    name: string;
    priceCents: number;
    components: Array<{ sku: string; quantity: number }>;
  }>;
}
```

| SKU | Kind | Price in cents |
|---|---|---:|
| `NW-VITD-60` | Product | 2995 |
| `NW-MULTI-30` | Product | 4495 |
| `NW-MAG-90` | Product | 3295 |
| `NW-BNDL-ESS` | Bundle | 5495 |

The bundle contains **one Vitamin D and one Magnesium**.

All four SKUs are unique. Prices and component quantities are positive integers, and both component references resolve to catalog products. There are no nested bundles or broken component references.

The important relationship is that warehouses stock the **three individual products**, with no inventory entry for the bundle itself. Orders `#2040` and `#2056` each request one bundle. How bundle quantities feed into stock checks and reservations needs to be made explicit.

Prices are supplied, but Part A’s routing rules do not use them.

**2. Orders**

[orders.json](../data/orders.json) is an **event stream**, rather than an array of final order snapshots. It contains two shapes:

```ts
// 26 creation events
{
  type: "order_created";
  orderNumber: string;
  at: string;
  shipTo: {
    country: string;
    state: string;
    zip: string | number; // Both types occur in the supplied data.
  };
  lines: Array<{ sku: string; quantity: number }>;
}

// 1 edit event
{
  type: "order_edited";
  orderNumber: string;
  at: string;
  addedLines: Array<{ sku: string; quantity: number }>;
}
```

The measured counts are:

| Measure | Result |
|---|---|
| Distinct orders | 26, numbered `#2031` through `#2056` |
| Creation events | 26 |
| Edit events | 1 |
| Initial line entries | 26—one per creation |
| Added line entries | 1 |
| Total raw line entries | 27 |
| Sum of raw quantities | 32, counting a bundle as one requested unit |
| Destinations | 25 US orders, 1 Canadian order |
| Distinct US states | 13 |
| Distinct raw ZIP values | 25 |

All quantities are positive integers: 23 line entries have quantity `1`, three have quantity `2`, and one has quantity `3`.

Raw SKU usage, including the edit:

| SKU exactly as supplied | Line entries | Sum of quantities |
|---|---:|---:|
| `NW-VITD-60` | 9 | 10 |
| `NW-MULTI-30` | 8 | 10 |
| `NW-MAG-90` | 7 | 9 |
| `NW-BNDL-ESS` | 2 | 2 |
| `nw-mag-90` | 1 | 1 |

There are **five distinct raw SKU strings**, or four if compared without case sensitivity. The latter is an observation about matching, not an accepted normalization policy.

Events are already in nondecreasing timestamp order, covering **2026-10-20, 13:00:00–14:15:37 UTC**. There are no duplicate creation identifiers or duplicate whole events.

Order `#2041` receives an edit **18 minutes after creation**, adding one Multivitamin to its initial Vitamin D. That edit shares its timestamp with the creation of `#2047`; they are separate events. This demonstrates why processing every event as a separately routable order would be incorrect.

The destination cases deserve individual attention:

| Order | Supplied value | Finding |
|---|---|---|
| `#2033` | ZIP: integer `2134` | Inconsistent with the other ZIP types. Direct text conversion gives prefix `213`, which is unmapped. Padding would produce `02134`, whose prefix is mapped; that repair remains unaccepted. |
| `#2037` | Country: `CA`; ZIP: `"M5V 2T6"` | International destination, not malformed merely because it lacks a US ZIP. |
| `#2039` | ZIP: `"07030-1834"` | ZIP+4 representation; its first three characters are mapped. |
| `#2042` | ZIP: `"96815"` | Five-digit string, but prefix `968` is absent from every zone map. |
| `#2045` | SKU: `"nw-mag-90"` | Does not exactly match a catalog SKU; differs only by case from `NW-MAG-90`. |
| `#2046` | ZIP: `""` | Empty ZIP string. The field exists, but contains no ZIP. |

Across all creation events, ZIP representations are **22 five-digit strings, one ZIP+4 string, one integer, one empty string, and one Canadian postal-code string**.

**3. Warehouses**

[warehouses.json](../data/warehouses.json) has this structure:

```ts
Array<{
  code: string;
  city: string;
  enabled: boolean;
  inventory: {
    [sku: string]: {
      available: number;
      dailyVelocity: number;
    };
  };
}>
```

Every warehouse contains exactly the three individual catalog products. Warehouse codes are unique, and inventory contains no unknown product keys.

The following cells show **available stock / daily velocity**:

| Warehouse | Enabled | Vitamin D | Multivitamin | Magnesium |
|---|---|---:|---:|---:|
| WH-NJ | Yes | 400 / 40 | 120 / 30 | 2 / 20 |
| WH-GA | Yes | 4 / 30 | 300 / 25 | 150 / 15 |
| WH-NV | Yes | 200 / 10 | 0 / 12 | 220 / 8 |
| WH-TX | No | 500 / 0 | 500 / 0 | 500 / 0 |

All inventory numbers are nonnegative integers. The zeros are boundary cases rather than malformed JSON:

- WH-NV has **no Multivitamin stock**.
- WH-NJ has only **two Magnesium units**.
- WH-GA has only **four Vitamin D units**.
- WH-TX has stock but is **disabled**.
- WH-TX’s zero velocities would cause division by zero in a naïve cover calculation. Because it is disabled, those values need not participate in Part A’s warehouse ranking.

These are starting inventory values. The instructions require later orders to see stock reduced by earlier reservations.

**4. Zones**

[zones.json](../data/zones.json) is a lookup object:

```ts
{
  "_note": string,
  "WH-NJ": { "021": 3, /* other prefixes */ },
  "WH-GA": { /* prefix → zone */ },
  "WH-NV": { /* prefix → zone */ },
  "WH-TX": { /* prefix → zone */ }
}
```

There are **five top-level keys**, but only four warehouse maps: `_note` is metadata.

Every warehouse map contains the same 13 prefixes:

```text
021 070 100 282 303 331 606 752 802 891 900 941 981
```

All prefixes are three-character digit strings, including leading zeros. All zone values are integers from **1 through 8**. Warehouse identifiers match the warehouse file exactly, with no missing or extra warehouse maps.

Zone ties exist: for example, prefix `606` has zone `5` for both WH-NJ and WH-GA. Consequently, the secondary ranking rules matter.

A prefix missing from this dataset means **no supplied mapping**; it does not establish that the destination ZIP itself is invalid.

**What this establishes before implementation**

The cross-file relationships are small and consistent:

- Order lines reference catalog products or bundles, with one exact-match SKU discrepancy.
- Bundle components reference individual products.
- Warehouse inventory is keyed by individual product SKU.
- Zone maps are keyed by warehouse code, then destination ZIP prefix.
- Creation and edit events connect through `orderNumber`.

The main unresolved interpretations are **numeric ZIP repair, SKU case handling, and bundle stock handling**. Empty ZIPs and unmapped prefixes already have explicit fallback rules in the instructions.

I recorded the investigation in [JOURNAL.md](../JOURNAL.md) and added concrete evidence to [ASSUMPTIONS.md’s open questions](../ASSUMPTIONS.md). No interpretation was marked accepted, and no router or supplied data was changed.
