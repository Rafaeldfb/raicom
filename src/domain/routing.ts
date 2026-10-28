import type { CatalogOutput } from "../schemas/catalog.schema";
import type { OrderEventsOutput, OrderLineOutput, ShipToOutput } from "../schemas/order.schema";
import type { PostalAssessmentOutput, ZipPrefix } from "../schemas/zip.schema";
import type { WarehouseOutput, WarehousesOutput } from "../schemas/warehouse.schema";
import type { ZonesOutput } from "../schemas/zones.schema";
import { readCatalog } from "../repositories/catalog.repository";
import { readOrderEvents } from "../repositories/orders.repository";
import { readWarehouses } from "../repositories/warehouses.repository";
import { readZones } from "../repositories/zones.repository";
import { writeRoutes } from "../repositories/routes.repository";

export type PostalFallbackReason = "missing-zip" | "unrecognized-zip" | "unmapped-prefix";
export type PostalCoverage =
  | { covered: true; prefix: ZipPrefix }
  | { covered: false; reason: PostalFallbackReason };

export type ZonedCandidate = { warehouse: WarehouseOutput; zone: number };

export type RoutingContext = {
  events: OrderEventsOutput;
  catalog: CatalogOutput;
  zones: ZonesOutput;
  warehouses: WarehousesOutput;
};

const WAREHOUSE_PRIORITY = ["WH-NJ", "WH-GA", "WH-NV", "WH-TX"] as const;

export type RoutingResult = { orderNumber: string } & (
  | { kind: "partner"; reason: "outside-us" | PostalFallbackReason | "insufficient-stock" }
  | { kind: "warehouse"; warehouseCode: string; zone: number }
);

export async function prepareRoutingRun(): Promise<RoutingContext> {
  return {
    events: await readOrderEvents(),
    catalog: await readCatalog(),
    zones: await readZones(),
    warehouses: await readWarehouses(),
  };
}

export async function publishRoutes(routes: RoutingResult[]): Promise<void> {
  await writeRoutes(routes);
}

export function isUsDestination(destination: ShipToOutput): boolean {
  return destination.country === "US";
}

// Consume the existing assessment; never reinterpret normalized ZIP text as raw input.
export function checkPostalCoverage(
  assessment: PostalAssessmentOutput | null,
  zones: ZonesOutput,
): PostalCoverage {
  if (assessment === null) throw new Error("US postal assessment is required");
  if (assessment.kind === "missing") return { covered: false, reason: "missing-zip" };
  if (assessment.kind === "unrecognized") return { covered: false, reason: "unrecognized-zip" };

  const covered = Object.entries(zones).some(([code, map]) =>
    code !== "_note" && typeof map !== "string" && map[assessment.prefix] !== undefined,
  );
  return covered
    ? { covered: true, prefix: assessment.prefix }
    : { covered: false, reason: "unmapped-prefix" };
}

export function findEligibleWarehouses(
  warehouses: WarehousesOutput,
  products: OrderLineOutput[],
): WarehousesOutput {
  return warehouses.filter((warehouse) => warehouse.enabled && products.every((product) =>
    (warehouse.inventory[product.sku]?.available ?? 0) >= product.quantity,
  ));
}

// Each ranking step must preserve [] so the application can apply rule 7.
export function retainLowestZone(
  candidates: WarehousesOutput,
  prefix: ZipPrefix,
  zones: ZonesOutput,
): ZonedCandidate[] {
  const covered = candidates.flatMap((warehouse): ZonedCandidate[] => {
    const map = zones[warehouse.code];
    if (!map || typeof map === "string") return [];
    const zone = map[prefix];
    return zone === undefined ? [] : [{ warehouse, zone }];
  });
  const lowest = covered.reduce((minimum, candidate) => Math.min(minimum, candidate.zone), Infinity);
  return covered.filter((candidate) => candidate.zone === lowest);
}

// Maximize min(available / dailyVelocity) over this order's products, before reservation.
export function retainHighestOrderCover(
  candidates: ZonedCandidate[],
  products: OrderLineOutput[],
): ZonedCandidate[] {
  const assessed = candidates.map((candidate) => {
    const cover = products.reduce((minimum, product) => {
      const stock = candidate.warehouse.inventory[product.sku];
      if (!stock || stock.available < product.quantity) {
        throw new Error("Cover requires a warehouse eligible for the whole order");
      }
      return Math.min(minimum, stock.available / stock.dailyVelocity);
    }, Infinity);
    return { candidate, cover };
  });
  const highest = assessed.reduce((maximum, item) => Math.max(maximum, item.cover), -Infinity);
  return assessed.filter((item) => item.cover === highest).map((item) => item.candidate);
}

// An empty list must produce undefined, never a default warehouse.
export function applyWarehousePriority(
  candidates: ZonedCandidate[],
): ZonedCandidate | undefined {
  if (candidates.length <= 1) return candidates[0];
  for (const code of WAREHOUSE_PRIORITY) {
    const selected = candidates.find((candidate) => candidate.warehouse.code === code);
    if (selected) return selected;
  }
  throw new Error("applyWarehousePriority: other warehouse priorities not implemented");
}
