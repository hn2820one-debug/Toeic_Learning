/** Escape a single CSV field (RFC-style quoting for commas, quotes, newlines). */
export function csvEscapeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return csvEscapeCell(value.toISOString());
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscapeCell(row[h])).join(",")),
  ];
  return lines.join("\n");
}
