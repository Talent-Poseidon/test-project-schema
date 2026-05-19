import type { ParsedKamusRow } from "./parser";

export interface KamusSnapshot {
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

export interface DiffResult {
  toCreate: ParsedKamusRow[];
  toUpdate: { existing: KamusSnapshot; incoming: ParsedKamusRow }[];
  toDelete: KamusSnapshot[];
  unchanged: KamusSnapshot[];
}

export function diffKamus(
  existing: KamusSnapshot[],
  incoming: ParsedKamusRow[],
): DiffResult {
  const existingByCode = new Map(existing.map((e) => [e.code, e]));
  const incomingByCode = new Map(incoming.map((i) => [i.code, i]));

  const toCreate: ParsedKamusRow[] = [];
  const toUpdate: { existing: KamusSnapshot; incoming: ParsedKamusRow }[] = [];
  const unchanged: KamusSnapshot[] = [];

  for (const row of incoming) {
    const prev = existingByCode.get(row.code);
    if (!prev) {
      toCreate.push(row);
      continue;
    }
    if (
      prev.name !== row.name ||
      prev.type !== row.type ||
      prev.description !== row.description ||
      prev.behavioralIndicators !== row.behavioralIndicators
    ) {
      toUpdate.push({ existing: prev, incoming: row });
    } else {
      unchanged.push(prev);
    }
  }

  const toDelete: KamusSnapshot[] = [];
  for (const prev of existing) {
    if (!incomingByCode.has(prev.code)) {
      toDelete.push(prev);
    }
  }

  return { toCreate, toUpdate, toDelete, unchanged };
}
