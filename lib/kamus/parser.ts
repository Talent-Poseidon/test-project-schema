import { KAMUS_TEMPLATE_HEADERS } from "./template";

export interface ParsedKamusRow {
  rowNumber: number;
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

export interface RowError {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedKamusRow[];
  errors: RowError[];
}

const VALID_TYPES = new Set(["potensi", "kompetensi"]);

export function parseCsv(content: string): string[][] {
  const trimmed = content.replace(/^﻿/, "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (inQuotes) {
      if (char === '"') {
        if (trimmed[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      } else if (char === "\r") {
        // skip
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseKamusFile(content: string): ParseResult {
  const errors: RowError[] = [];
  const rows: ParsedKamusRow[] = [];
  const rawRows = parseCsv(content);

  if (rawRows.length === 0) {
    errors.push({ rowNumber: 0, message: "File is empty" });
    return { rows, errors };
  }

  const header = rawRows[0].map((h) => h.trim());
  const expectedHeader = [...KAMUS_TEMPLATE_HEADERS];
  const headerMismatch =
    header.length < expectedHeader.length ||
    !expectedHeader.every((h, i) => header[i] === h);
  if (headerMismatch) {
    errors.push({
      rowNumber: 1,
      message: `Invalid header. Expected: ${expectedHeader.join(",")}`,
    });
    return { rows, errors };
  }

  const seenCodes = new Map<string, number>();

  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = i + 1;
    const code = (raw[0] ?? "").trim();
    const name = (raw[1] ?? "").trim();
    const type = (raw[2] ?? "").trim().toLowerCase();
    const description = (raw[3] ?? "").trim();
    const behavioralIndicators = (raw[4] ?? "").trim();

    const rowErrors: RowError[] = [];
    if (!code) {
      rowErrors.push({ rowNumber, field: "code", message: "code is required" });
    }
    if (!name) {
      rowErrors.push({ rowNumber, field: "name", message: "name is required" });
    }
    if (!type) {
      rowErrors.push({ rowNumber, field: "type", message: "type is required" });
    } else if (!VALID_TYPES.has(type)) {
      rowErrors.push({
        rowNumber,
        field: "type",
        message: `type must be 'potensi' or 'kompetensi' (got '${type}')`,
      });
    }
    if (!description) {
      rowErrors.push({
        rowNumber,
        field: "description",
        message: "description is required",
      });
    }
    if (!behavioralIndicators) {
      rowErrors.push({
        rowNumber,
        field: "behavioralIndicators",
        message: "behavioralIndicators is required",
      });
    }

    if (code) {
      const prev = seenCodes.get(code);
      if (prev !== undefined) {
        rowErrors.push({
          rowNumber,
          field: "code",
          message: `Duplicate code '${code}' (also on row ${prev})`,
        });
      } else {
        seenCodes.set(code, rowNumber);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      rowNumber,
      code,
      name,
      type,
      description,
      behavioralIndicators,
    });
  }

  return { rows, errors };
}
