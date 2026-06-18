export interface ReportRequest {
  organisationId: string;
  plantIds: string[];
  dateFrom: string;
  dateTo: string;
  format: "csv" | "xlsx" | "pdf";
}

export interface ReportDefinition {
  key: string;
  title: string;
  requiredPermission: string;
}

export interface PdfTableDocument {
  title: string;
  subtitle?: string;
  summary?: Array<[string, string | number]>;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function renderTablePdf(document: PdfTableDocument): Uint8Array {
  const lines = [
    document.title,
    document.subtitle ?? "",
    ...(document.summary ?? []).map(([label, value]) => `${label}: ${value}`),
    "",
    document.headers.join(" | "),
    ...document.rows.map((row) => row.map((value) => String(value)).join(" | "))
  ].filter((line) => line.length > 0);

  const content = [
    "BT",
    "/F1 16 Tf",
    "50 790 Td",
    `(${escapePdfText(document.title)}) Tj`,
    "/F1 9 Tf",
    ...lines.slice(1, 46).flatMap((line) => ["0 -16 Td", `(${escapePdfText(truncate(line, 118))}) Tj`]),
    "ET"
  ].join("\n");

  return createPdf(content);
}

function createPdf(content: string): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let output = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(output);
}

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
