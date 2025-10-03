// utils/excelTrimHelper.js
import * as XLSX from "xlsx";

// Keep your required headers in the exact order here
export const WANTED_HEADERS = [
  "ORG_NAME","ACADEMIC_COURSE_ID","COURSE_NAME","STREAM","REGN_NO","RROLL",
  "CNAME","GENDER","DOB","MRKS_REC_STATUS","RESULT","YEAR","DIVISION",
  "DOI","CERT_NO","CGPA","REMARKS","AADHAAR_NAME"
];

/**
 * Reads a File (csv/xls/xlsx), trims columns to WANTED_HEADERS,
 * returns { rows, blobUrl, downloadName }.
 */
export async function parseAndTrimExcel(file, wanted = WANTED_HEADERS) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["csv", "xls", "xlsx"].includes(ext)) {
    throw new Error("Please upload a CSV/XLS/XLSX file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large (max 10MB).");
  }

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Use first sheet
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  // Parse rows with empty default values
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // Trim + order columns; ensure missing headers come as blanks
  const trimmedRows = rows.map((r) => {
    const obj = {};
    wanted.forEach((h) => (obj[h] = r[h] ?? ""));
    return obj;
  });

  // Build a new workbook for trimmed data
  const trimmedWs = XLSX.utils.json_to_sheet(trimmedRows, { header: wanted });
  const trimmedWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(trimmedWb, trimmedWs, "Trimmed");

  const out = XLSX.write(trimmedWb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const blobUrl = URL.createObjectURL(blob);

  const base = file.name.replace(/\.(csv|xls|xlsx)$/i, "");
  const downloadName = `${base}_trimmed.xlsx`;

  return { rows: trimmedRows, blobUrl, downloadName };
}
