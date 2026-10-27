# Assumptions

Accepted interpretations of behavior that the exercise instructions or supplied data leave unspecified. Explicit requirements remain in the supplied resources and are not repeated as assumptions.

No behavioral assumptions have been accepted yet.

## Open questions

The data investigation below supplies evidence for discussion, not accepted interpretations.

- **US ZIP formats:** Order `#2033` supplies the integer `2134`, while ZIP prefixes in `zones.json` are three-character strings. Converting that integer directly to text gives prefix `213`, which is absent; padding to five digits would give `02134` and the mapped prefix `021`. Whether to make that repair, and which ZIP formats to accept, remains open. Order `#2039` supplies `07030-1834`. No additional ZIP-format validation or repair policy has been accepted.
- **SKU matching:** Order `#2045` supplies `nw-mag-90`; the catalog and inventory use `NW-MAG-90`. Rafael intends to add normalization, but its exact rules and placement (a Zod transformation or a separate stage after validation) remain open. Case-insensitive matching and the handling of an unrecognized SKU have not been accepted. The current reusable SKU contract validates nonblank strings and preserves their text and casing.
- **Bundle stock handling:** Orders `#2040` and `#2056` request `NW-BNDL-ESS`. The catalog defines it as one `NW-VITD-60` plus one `NW-MAG-90`; warehouses stock those products and have no bundle inventory entry. How the router translates bundle quantities into stock checks and reservations has not yet been adopted.

Sources: [orders](data/orders.json), [catalog](data/catalog.json), [warehouses](data/warehouses.json), and [zones](data/zones.json).
