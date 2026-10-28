import type {
  OrderEventsOutput,
  OrderLineOutput,
  OrderNumberOutput,
  ShipToOutput,
} from "../schemas/order.schema";

export type Order = {
  orderNumber: OrderNumberOutput;
  createdAt: string;
  shipTo: ShipToOutput;
  lines: OrderLineOutput[];
};

type Instant = { seconds: number; fraction: string };

function parseInstant(timestamp: string): Instant {
  // Parse timezone/whole seconds with Date; retain every accepted fractional digit separately.
  return {
    seconds: Date.parse(timestamp.replace(/\.[0-9]+/, "")) / 1000,
    fraction: timestamp.match(/\.([0-9]+)/)?.[1] ?? "",
  };
}

function compareInstants(a: Instant, b: Instant): number {
  if (a.seconds !== b.seconds) return a.seconds - b.seconds;
  const precision = Math.max(a.fraction.length, b.fraction.length);
  const left = a.fraction.padEnd(precision, "0");
  const right = b.fraction.padEnd(precision, "0");
  return left < right ? -1 : left > right ? 1 : 0;
}

// Reconstruct once with eligible additions in the 30-minute window.
export function reconstructCompleteOrders(events: OrderEventsOutput): Order[] {
  const orders = new Map<string, Order>();
  for (const event of events) {
    if (event.type !== "order_created") continue;
    if (orders.has(event.orderNumber)) {
      throw new Error("reconstructCompleteOrders: duplicate creation handling not implemented");
    }
    orders.set(event.orderNumber, {
      orderNumber: event.orderNumber,
      createdAt: event.at,
      shipTo: structuredClone(event.shipTo),
      lines: event.lines.map((line) => ({ ...line })),
    });
  }

  // Resolve relationships after collecting creations; arrival order need not be chronological.
  for (const event of events) {
    if (event.type !== "order_edited") continue;
    const order = orders.get(event.orderNumber);
    if (!order) {
      throw new Error("reconstructCompleteOrders: unmatched edit handling not implemented");
    }
    const created = parseInstant(order.createdAt);
    const edited = parseInstant(event.at);
    const deadline = { ...created, seconds: created.seconds + 30 * 60 };
    if (compareInstants(edited, created) >= 0 && compareInstants(edited, deadline) <= 0) {
      order.lines.push(...event.addedLines.map((line) => ({ ...line })));
    }
  }
  return [...orders.values()];
}

export function sortOrdersByCreation(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => compareInstants(parseInstant(a.createdAt), parseInstant(b.createdAt)));
}
