# Supplied-data acceptance expectations

`expected.txt` was written from the supplied files and accepted policies before implementing bundle expansion or running a successful router. It is an independent oracle; never regenerate it from application output or from `routes.txt`. Only Part A requirements apply; operational notes are excluded.

There are 27 events and 26 creations. The edit adds one multivitamin to #2041 at +18 minutes, so that order needs both vitamin D and multivitamin before being routed once. Each bundle contributes one vitamin D and one magnesium. Numeric ZIP `2134` yields prefix `021`; ZIP+4 retains prefix `070`. Lowercase magnesium SKU is case insensitive.

Below, **D**, **U**, and **M** mean vitamin D, multivitamin, and magnesium. Starting stocks `(D,U,M)` are NJ `(400,120,2)`, GA `(4,300,150)`, NV `(200,0,220)`. TX is disabled. Each row uses inventory after all previous rows. The parenthesized stock is the selected warehouse's inventory after reservation.

| Order | Independent reasoning | Expected result and remaining stock |
|---|---|---|
| #2031 | D1; NJ has lowest eligible `070` zone. | NJ zone 1 `(399,120,2)` |
| #2032 | U1; GA has lowest eligible `303` zone. | GA zone 1 `(4,299,150)` |
| #2033 | D1; numeric repair gives `021`; NJ zone 3 beats GA 6 and NV 8. | NJ zone 3 `(398,120,2)` |
| #2034 | M1; NJ/GA tie at zone 5. Cover is NJ `2/20=0.1`, GA `150/15=10`. | GA zone 5 `(4,299,149)` |
| #2035 | D1; enabled GA zone 4 beats NV 5 and NJ 6. | GA zone 4 `(3,299,149)` |
| #2036 | M2; NV has zone 2. | NV zone 2 `(200,0,218)` |
| #2037 | Canada; rule 1 applies before postal coverage. | PARTNER outside-us |
| #2038 | D1; NV has zone 4. | NV zone 4 `(199,0,218)` |
| #2039 | M2; full ZIP+4 uses `070`, NJ zone 1 has exactly 2 M. | NJ zone 1 `(398,120,0)` |
| #2040 | Bundle D1+M1; NJ has no M. GA zone 5 beats NV 8. | GA zone 5 `(2,299,148)` |
| #2041 | D1+U1 including the edit; NV has no U. GA zone 7 beats NJ 8. | GA zone 7 `(1,298,148)` |
| #2042 | Recognized prefix `968` is absent from zones. | PARTNER unmapped-prefix |
| #2043 | M1; NV has zone 3. | NV zone 3 `(199,0,217)` |
| #2044 | U1; NV lacks U. GA zone 6 beats NJ 7. | GA zone 6 `(1,297,148)` |
| #2045 | Canonical M1; NJ lacks M. GA zone 3 beats NV 7. | GA zone 3 `(1,297,147)` |
| #2046 | Empty ZIP is missing. | PARTNER missing-zip |
| #2047 | U3; GA zone 4 beats NJ 6; NV lacks U. | GA zone 4 `(1,294,147)` |
| #2048 | D1; NJ/GA tie at zone 5. Cover NJ `398/40=9.95` beats GA `1/30`. | NJ zone 5 `(397,120,0)` |
| #2049 | M1; GA zone 4 beats NV 8; NJ lacks M. | GA zone 4 `(1,294,146)` |
| #2050 | D2; GA has only 1 D after the earlier bundle and edited order. NJ zone 5 beats NV 7. | NJ zone 5 `(395,120,0)` |
| #2051 | D1; NV has zone 2. | NV zone 2 `(198,0,217)` |
| #2052 | M1; NV zone 5 beats GA 8. | NV zone 5 `(198,0,216)` |
| #2053 | U1; NJ has zone 2. | NJ zone 2 `(395,119,0)` |
| #2054 | M1; GA zone 4 beats NV 5. | GA zone 4 `(1,294,145)` |
| #2055 | U1; NJ/GA tie at zone 8. Cover GA `294/25=11.76` beats NJ `119/30`; NV lacks U. | GA zone 8 `(1,293,145)` |
| #2056 | Bundle D1+M1; NJ lacks M. GA zone 5 has exactly 1 D and beats NV 8. | GA zone 5 `(0,293,144)` |

Totals: NJ 6, GA 12, NV 5, PARTNER 3; TX 0. Final stock: NJ `(395,119,0)`, GA `(0,293,144)`, NV `(198,0,216)`, TX unchanged `(500,500,500)`. No priority tie is needed in this supplied dataset; focused tests cover that rule separately.
