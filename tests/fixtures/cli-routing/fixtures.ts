import type { CatalogInput } from "../../../src/schemas/catalog.schema";
import type { OrderEventsInput } from "../../../src/schemas/order.schema";
import type { WarehousesInput } from "../../../src/schemas/warehouse.schema";
import type { ZonesInput } from "../../../src/schemas/zones.schema";

export const rawCatalog = {
  "products": [
    {
      "sku": "NW-VITD-60",
      "name": "Vitamin D",
      "priceCents": 2995
    },
    {
      "sku": "NW-MAG-90",
      "name": "Magnesium",
      "priceCents": 3295
    }
  ],
  "bundles": []
} satisfies CatalogInput;

export const rawOrders = [
  {
    "type": "order_created",
    "orderNumber": "#A3",
    "at": "2026-10-20T13:02:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "GA",
      "zip": "30303"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 7
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A1",
    "at": "2026-10-20T13:00:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A2",
    "at": "2026-10-20T13:01:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "CA",
      "zip": "90012"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A4",
    "at": "2026-10-20T13:03:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 2
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A5",
    "at": "2026-10-20T13:04:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 5
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A6",
    "at": "2026-10-20T13:05:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "CA",
      "zip": "90012"
    },
    "lines": [
      {
        "sku": "NW-MAG-90",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A7",
    "at": "2026-10-20T13:06:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NY",
      "zip": "10001"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 3
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A8",
    "at": "2026-10-20T13:07:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-MAG-90",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A9",
    "at": "2026-10-20T13:08:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-MAG-90",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A10",
    "at": "2026-10-20T13:09:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030"
    },
    "lines": [
      {
        "sku": "NW-MAG-90",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A11",
    "at": "2026-10-20T13:10:00.000Z",
    "shipTo": {
      "country": "CA",
      "state": "ON",
      "zip": "M5V 2T6"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A12",
    "at": "2026-10-20T13:11:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": ""
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A13",
    "at": "2026-10-20T13:12:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "MA",
      "zip": "2134"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A14",
    "at": "2026-10-20T13:13:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "HI",
      "zip": "96815"
    },
    "lines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A15",
    "at": "2026-10-20T13:14:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "MA",
      "zip": 2134
    },
    "lines": [
      {
        "sku": "nw-vitd-60",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_created",
    "orderNumber": "#A16",
    "at": "2026-10-20T13:15:00.000Z",
    "shipTo": {
      "country": "US",
      "state": "NJ",
      "zip": "07030-1834"
    },
    "lines": [
      {
        "sku": "NW-MAG-90",
        "quantity": 1
      }
    ]
  },
  {
    "type": "order_edited",
    "orderNumber": "#A6",
    "at": "2026-10-20T13:23:00.000Z",
    "addedLines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 2
      }
    ]
  },
  {
    "type": "order_edited",
    "orderNumber": "#A6",
    "at": "2026-10-20T13:40:00.000Z",
    "addedLines": [
      {
        "sku": "NW-VITD-60",
        "quantity": 100
      }
    ]
  }
] satisfies OrderEventsInput;

export const rawWarehouses = [
  {
    "code": "WH-NJ",
    "city": "Edison",
    "enabled": true,
    "inventory": {
      "NW-VITD-60": {
        "available": 6,
        "dailyVelocity": 2
      },
      "NW-MAG-90": {
        "available": 4,
        "dailyVelocity": 1
      }
    }
  },
  {
    "code": "WH-GA",
    "city": "Atlanta",
    "enabled": true,
    "inventory": {
      "NW-VITD-60": {
        "available": 8,
        "dailyVelocity": 1
      },
      "NW-MAG-90": {
        "available": 5,
        "dailyVelocity": 1
      }
    }
  },
  {
    "code": "WH-NV",
    "city": "Reno",
    "enabled": true,
    "inventory": {
      "NW-VITD-60": {
        "available": 2,
        "dailyVelocity": 1
      },
      "NW-MAG-90": {
        "available": 8,
        "dailyVelocity": 1
      }
    }
  },
  {
    "code": "WH-TX",
    "city": "Dallas",
    "enabled": false,
    "inventory": {
      "NW-VITD-60": {
        "available": 100,
        "dailyVelocity": 1
      },
      "NW-MAG-90": {
        "available": 100,
        "dailyVelocity": 1
      }
    }
  }
] satisfies WarehousesInput;

export const rawZones = {
  "_note": "Synthetic acceptance fixture, not the supplied assessment zones.",
  "WH-NJ": {
    "070": 2,
    "900": 4,
    "303": 4,
    "100": 1,
    "021": 1
  },
  "WH-GA": {
    "070": 2,
    "900": 4,
    "303": 1,
    "100": 2,
    "021": 2
  },
  "WH-NV": {
    "070": 4,
    "900": 1,
    "303": 4,
    "100": 2,
    "021": 3
  },
  "WH-TX": {
    "070": 1,
    "900": 1,
    "303": 1,
    "100": 1,
    "021": 1
  }
} satisfies ZonesInput;
