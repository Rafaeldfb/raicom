# Exploration: catalog input contract approach

This is a snapshot of the comparison made before any input contract existed. It explains the rationale for the [catalog input contract decision](../../DECISIONS.md#catalog-input-contract-approach) and is not maintained as current guidance. The implemented contracts are described in [input contracts](../input-contracts.md) and the conventions for writing them in [schema patterns](../schemas.md).

## Purpose

Rafael chose to explore the catalog first to understand the effort and value of TypeScript types and Zod runtime contracts before implementing data loading.

The observed catalog contained three product records and one bundle record. Both kinds have `sku`, `name`, and `priceCents`; bundles additionally contain component records with `sku` and `quantity`. These input records are distinct from any internal domain model. See [data research](../data-research.md) for the full observations.

## TypeScript type declarations

```ts
type ProductInput = {
  sku: string;
  name: string;
  priceCents: number;
};

type ComponentInput = {
  sku: string;
  quantity: number;
};

type BundleInput = ProductInput & {
  components: ComponentInput[];
};

type CatalogInput = {
  products: ProductInput[];
  bundles: BundleInput[];
};
```

These declarations describe the shape used during development. For example, TypeScript can reject a typed object literal whose `priceCents` is a string. An interface can describe these object shapes too; the type/interface choice does not add runtime checks.

```ts
const catalog = JSON.parse(text) as CatalogInput;
```

This assertion tells the compiler to trust the programmer. It does not inspect the parsed value, so a file containing a string price or a missing `products` array can pass through this line. Type assertions are erased and perform no runtime checking. [TypeScript documentation](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)

The parsed value could instead be read as `unknown` and checked with explicit runtime code. That is a viable dependency-free option, but the checks, type declarations, and diagnostics must be kept consistent manually.

## Zod schema with an inferred TypeScript type

```ts
import { z } from "zod";

const ProductSchema = z.object({
  sku: z.string(),
  name: z.string(),
  priceCents: z.number(),
});

const ComponentSchema = z.object({
  sku: z.string(),
  quantity: z.number(),
});

const BundleSchema = ProductSchema.extend({
  components: z.array(ComponentSchema),
});

const CatalogSchema = z.object({
  products: z.array(ProductSchema),
  bundles: z.array(BundleSchema),
});

type CatalogInput = z.infer<typeof CatalogSchema>;
```

This alternative defines the shape once as an executable schema and infers its TypeScript representation, without maintaining the preceding hand-written input types as well. Zod provides `.parse()` to return parsed data or throw validation issues, and `.safeParse()` to return a success/error result. Choosing how the application responds to an error remains separate. [Zod basic usage](https://zod.dev/basics)

For example, the schema rejects `priceCents: "2995"` rather than converting it to a number, and can identify the failing field within a product array. It verifies the component record shape without interpreting how a bundle affects inventory.

The sample deliberately showed only basic field types and arrays. It did not establish integer or positivity rules, nonempty arrays or strings, SKU uniqueness, or component-reference validity.

Ordinary `z.object` schemas strip unrecognized properties from their parsed output. Zod offers `z.strictObject` to reject them and `z.looseObject` to retain them, so the illustrative schema was not a preserve/strip/reject policy. [Zod object schemas](https://zod.dev/api#objects)

## Complexity and trade-offs

| Approach | Static typing | Runtime input checking | Maintenance cost |
|---|---|---|---|
| Hand-written types with trusted JSON | Yes | None from the types | Short declarations; malformed input remains unchecked. |
| Hand-written types and runtime checks | Yes | Whatever the checks explicitly cover | No validation dependency; checks and diagnostics must stay aligned with the types. |
| Zod schemas and inferred input types | Yes | Whatever the schemas explicitly cover | Four small reusable schema definitions, a parsing call, and error handling; the schema owns the input type. |

For this catalog, the schema structure is shallow and closely follows the supplied JSON. Codex recommended keeping Zod at the input boundary and inferring the input types, avoiding a duplicate hand-written input contract; Rafael accepted that recommendation. The cost is learning the schema API and selecting acceptance and error-handling behavior. No performance benchmark was made.

If an internal domain model differs from these records, it can have its own type and mapping. Schema inference need not dictate the entire domain design.
