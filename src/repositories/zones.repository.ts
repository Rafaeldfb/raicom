import { loadZones } from "../lib/loader/Loader";
import { ZonesSchema, type ZonesOutput } from "../schemas/zones.schema";

export async function readZones(): Promise<ZonesOutput> {
  return ZonesSchema.parse(await loadZones());
}
