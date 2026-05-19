export const KAMUS_TEMPLATE_HEADERS = [
  "code",
  "name",
  "type",
  "description",
  "behavioralIndicators",
] as const;

export const KAMUS_TEMPLATE_SAMPLE_ROWS: string[][] = [
  [
    "POT-001",
    "Analytical Thinking",
    "potensi",
    "Kemampuan menganalisis informasi secara sistematis",
    "Mampu memecah masalah | Mengidentifikasi pola | Menarik kesimpulan logis",
  ],
  [
    "KOM-001",
    "Communication",
    "kompetensi",
    "Kemampuan menyampaikan informasi secara jelas",
    "Menyampaikan ide dengan terstruktur | Mendengarkan aktif",
  ],
];

export function buildEmptyTemplateCsv(): string {
  const header = KAMUS_TEMPLATE_HEADERS.join(",");
  const rows = KAMUS_TEMPLATE_SAMPLE_ROWS.map((row) =>
    row.map(csvEscape).join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

export function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
