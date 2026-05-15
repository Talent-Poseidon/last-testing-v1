import type { Kamus } from "@prisma/client";
import type { ParsedKamusRow } from "./parser";

export interface KamusDiff {
  added: ParsedKamusRow[];
  updated: {
    code: string;
    before: Pick<Kamus, "name" | "type" | "description" | "behavioralIndicators">;
    after: Pick<ParsedKamusRow, "name" | "type" | "description" | "behavioralIndicators">;
  }[];
  removed: { code: string; name: string }[];
  unchanged: number;
}

export function diffKamus(existing: Kamus[], incoming: ParsedKamusRow[]): KamusDiff {
  const existingByCode = new Map(existing.map((k) => [k.code, k]));
  const incomingByCode = new Map(incoming.map((k) => [k.code, k]));

  const added: ParsedKamusRow[] = [];
  const updated: KamusDiff["updated"] = [];
  let unchanged = 0;

  for (const row of incoming) {
    const prev = existingByCode.get(row.code);
    if (!prev) {
      added.push(row);
      continue;
    }
    const changed =
      prev.name !== row.name ||
      prev.type !== row.type ||
      prev.description !== row.description ||
      prev.behavioralIndicators !== row.behavioralIndicators;
    if (changed) {
      updated.push({
        code: row.code,
        before: {
          name: prev.name,
          type: prev.type,
          description: prev.description,
          behavioralIndicators: prev.behavioralIndicators,
        },
        after: {
          name: row.name,
          type: row.type,
          description: row.description,
          behavioralIndicators: row.behavioralIndicators,
        },
      });
    } else {
      unchanged++;
    }
  }

  const removed: { code: string; name: string }[] = [];
  for (const prev of existing) {
    if (!incomingByCode.has(prev.code)) {
      removed.push({ code: prev.code, name: prev.name });
    }
  }

  return { added, updated, removed, unchanged };
}
