import { KAMUS_TEMPLATE_HEADERS, KAMUS_TYPES, KamusType } from "./template";

export interface ParsedKamusRow {
  rowNumber: number;
  code: string;
  name: string;
  type: KamusType;
  description: string;
  behavioralIndicators: string;
}

export interface ParseError {
  rowNumber: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedKamusRow[];
  errors: ParseError[];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === ",") {
        out.push(current);
        current = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  out.push(current);
  return out.map((s) => s.trim());
}

export function parseKamusCsv(content: string): ParseResult {
  const errors: ParseError[] = [];
  const rows: ParsedKamusRow[] = [];

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const allLines = normalized.split("\n").filter((l) => l.length > 0);

  if (allLines.length === 0) {
    errors.push({ rowNumber: 0, message: "File is empty" });
    return { rows, errors };
  }

  const header = splitCsvLine(allLines[0]).map((h) => h.toLowerCase());
  const expected = KAMUS_TEMPLATE_HEADERS.map((h) => h.toLowerCase());
  const headerMatches =
    header.length === expected.length &&
    expected.every((h, i) => header[i] === h);

  if (!headerMatches) {
    errors.push({
      rowNumber: 1,
      message: `Invalid header. Expected: ${KAMUS_TEMPLATE_HEADERS.join(", ")}`,
    });
    return { rows, errors };
  }

  const seenCodes = new Set<string>();

  for (let i = 1; i < allLines.length; i++) {
    const rowNumber = i + 1;
    const cols = splitCsvLine(allLines[i]);
    if (cols.length !== KAMUS_TEMPLATE_HEADERS.length) {
      errors.push({
        rowNumber,
        message: `Expected ${KAMUS_TEMPLATE_HEADERS.length} columns, got ${cols.length}`,
      });
      continue;
    }
    const [code, name, typeRaw, description, behavioralIndicators] = cols;
    const type = typeRaw.toLowerCase();

    const rowErrors: string[] = [];
    if (!code) rowErrors.push("code is required");
    if (!name) rowErrors.push("name is required");
    if (!type) rowErrors.push("type is required");
    if (!description) rowErrors.push("description is required");
    if (!behavioralIndicators) rowErrors.push("behavioralIndicators is required");
    if (type && !(KAMUS_TYPES as readonly string[]).includes(type)) {
      rowErrors.push(`type must be one of ${KAMUS_TYPES.join(" / ")}`);
    }
    if (code && seenCodes.has(code)) {
      rowErrors.push(`duplicate code "${code}" in file`);
    }

    if (rowErrors.length > 0) {
      errors.push({ rowNumber, message: rowErrors.join("; ") });
      continue;
    }

    seenCodes.add(code);
    rows.push({
      rowNumber,
      code,
      name,
      type: type as KamusType,
      description,
      behavioralIndicators,
    });
  }

  return { rows, errors };
}
