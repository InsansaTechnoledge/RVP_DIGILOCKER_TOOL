// utils/excelTrimHelper.js
import * as XLSX from "xlsx";
import JSZip from "jszip";

export const WANTED_HEADERS = [
  "ORG_NAME","ACADEMIC_COURSE_ID","COURSE_NAME","STREAM","REGN_NO","RROLL",
  "CNAME","GENDER","DOB","MRKS_REC_STATUS","RESULT","YEAR","DIVISION",
  "DOI","CERT_NO","CGPA","REMARKS","AADHAAR_NAME"
];

// Date columns to output as TEXT, normalized to DD/MM/YYYY when parseable
const DATE_FIELDS = ["DOB", "DOI"];

// ---------- helpers ----------
function isNumericLike(x) {
  return typeof x === "number" || (typeof x === "string" && /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(x.trim()));
}

// Final DigiLocker/NAD-compliant date string
function fmtDMY_slash(y, m, d) {
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String(y).padStart(4,"0")}`;
}

// Try to parse common date strings and return {y,m,d} or null.
// Assumptions (India): ambiguous like 10/6/2003 -> D/M/Y (=> 10/06/2003)
function parseYMDFromString(s) {
  if (!s) return null;
  const src = String(s).trim();

  // yyyy-mm-dd or yyyy/mm/dd or yyyy.mm.dd
  let m = src.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) {
    const y = +m[1], mm = +m[2], dd = +m[3];
    if (y >= 1800 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return { y, m: mm, d: dd };
  }

  // d-m-yyyy or d/m/yyyy or d.m.yyyy  (treat as D/M/Y)
  m = src.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    let dd = +m[1], mm = +m[2], y = +m[3];
    if (y < 100) y += (y >= 30 ? 1900 : 2000); // simple 2-digit year rule
    if (y >= 1800 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return { y, m: mm, d: dd };
  }

  // Words (e.g., "10 Jun 2003", "June 10, 2003")
  m = src.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
  if (m) {
    const dd = +m[1], mon = monthIndex(m[2]); let y = +m[3];
    if (y < 100) y += (y >= 30 ? 1900 : 2000);
    if (mon && dd >= 1 && dd <= 31 && y >= 1800) return { y, m: mon, d: dd };
  }
  m = src.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{2,4})$/);
  if (m) {
    const mon = monthIndex(m[1]); const dd = +m[2]; let y = +m[3];
    if (y < 100) y += (y >= 30 ? 1900 : 2000);
    if (mon && dd >= 1 && dd <= 31 && y >= 1800) return { y, m: mon, d: dd };
  }

  return null;
}

function monthIndex(mstr) {
  const s = mstr.toLowerCase();
  const table = {
    jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4,
    may:5, jun:6, june:6, jul:7, july:7, aug:8, august:8,
    sep:9, sept:9, september:9, oct:10, october:10, nov:11, november:11, dec:12, december:12
  };
  return table[s] || null;
}

/**
 * Build a map from header name -> column index (0-based),
 * using the first row of the sheet as headers.
 */
function getHeaderMap(ws) {
  const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  const headerRow = rows2D[0] || [];
  const map = {};
  headerRow.forEach((name, idx) => {
    if (typeof name === "string" && name.trim()) {
      map[name.trim()] = idx;
    }
  });
  return { headerRow, rows2D };
}

/**
 * Read **text** from a cell (r,c).
 * Priority:
 *  1) ws[cell].w (formatted text from xls/xlsx)
 *  2) else stringify ws[cell].v
 */
function readCellText(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell) return "";
  if (typeof cell.w === "string") return cell.w;
  return cell.v == null ? "" : String(cell.v);
}

/**
 * Always return TEXT for date fields:
 * - Prefer visible cell text (ws[cell].w) when available
 * - If numeric-like -> treat as Excel serial and format DD/MM/YYYY (TEXT)
 * - If recognizable string date -> normalize to DD/MM/YYYY (TEXT)
 * - Otherwise return the original trimmed string
 * No numeric is ever returned from this function.
 */
function getDateText({ ws, sheetRow, col, rowValue, date1904 }) {
  // Prefer the display text from the sheet, then fall back to parsed row value
  const txt = readCellText(ws, sheetRow, col).trim();
  const primary = txt !== "" ? txt : (rowValue == null ? "" : String(rowValue).trim());

  // 1) If numeric-like -> Excel serial -> DD/MM/YYYY
  if (isNumericLike(primary)) {
    const num = Number(primary);
    if (isFinite(num)) {
      const p = XLSX.SSF.parse_date_code(num, { date1904: !!date1904 });
      if (p && p.y && p.m && p.d) return fmtDMY_slash(p.y, p.m, p.d);
    }
  }

  // 2) If string and looks like a date -> normalize to DD/MM/YYYY
  const parsed = parseYMDFromString(primary);
  if (parsed) return fmtDMY_slash(parsed.y, parsed.m, parsed.d);

  // 3) Fallback: keep original as text
  return primary;
}

// Excel-safe wrapper: force Excel to treat as text when opening CSV
function wrapForExcelText(str) {
  if (str == null) return "";
  const s = String(str);
  return s === "" ? "" : `'${s}`; // apostrophe not shown in Excel UI
}

/**
 * Reads a File (csv/xls/xlsx), keeps DOB/DOI as TEXT:
 * - xls/xlsx: uses visible text where possible; if numeric, converts Excel serial to DD/MM/YYYY TEXT
 * - csv: converts only numeric-like/date-like values to DD/MM/YYYY TEXT; leaves unparseable strings untouched
 * Builds a ZIP with:
 *   - *_digilocker.csv (plain DD/MM/YYYY dates)
 *   - *_excel_safe.csv (dates prefixed with apostrophe for Excel viewing)
 *
 * options:
 *  - archive: 'zip' | 'gzip' | 'none' (default 'zip')
 */
export async function parseAndTrimExcel(file, options = {}) {
  const { archive = "zip" } = options;

  const ext = file.name.split(".").pop().toLowerCase();
  if (!["csv", "xls", "xlsx"].includes(ext)) {
    throw new Error("Please upload a CSV/XLS/XLSX file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large (max 10MB).");
  }

  const buf = await file.arrayBuffer();

  // Keep values raw; do NOT auto-create JS Dates
  const wb = XLSX.read(buf, {
    type: "array",
    cellDates: false,
    cellNF: false,
    cellText: true, // ensure ws[cell].w is populated with visible text
  });

  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  // 1) Headers → column index map
  const { rows2D } = getHeaderMap(ws);
  const headerRow = rows2D[0] || [];
  const colIndex = {};
  headerRow.forEach((name, idx) => {
    const key = typeof name === "string" ? name.trim() : name;
    if (WANTED_HEADERS.includes(key)) colIndex[key] = idx;
  });

  // 2) Parsed rows for non-date fields (we’ll override date fields)
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

  // For xls/xlsx date system
  const date1904 = !!(wb?.Workbook?.WBProps?.date1904);

  // Sheet row index of first data row (skip header)
  const firstDataR = 1;

  const trimmedRows = rows.map((r, i) => {
    const obj = {};
    const sheetRow = firstDataR + i;

    WANTED_HEADERS.forEach((h) => {
      if (h in colIndex) {
        const c = colIndex[h];

        if (DATE_FIELDS.includes(h)) {
          obj[h] = getDateText({
            ws,
            sheetRow,
            col: c,
            rowValue: r[h] ?? "",
            date1904,
          });
        } else {
          const v = r[h] ?? "";
          obj[h] = typeof v === "string" ? v.trim() : v;
        }
      } else {
        obj[h] = "";
      }
    });

    return obj;
  });

  // ---------- Build two CSVs ----------
  // 3a) DigiLocker CSV (plain text dates DD/MM/YYYY)
  const wsDL = XLSX.utils.json_to_sheet(trimmedRows, { header: WANTED_HEADERS });
  const csvDigilocker = XLSX.utils.sheet_to_csv(wsDL);

  // 3b) Excel-safe CSV (dates prefixed with apostrophe)
  const excelSafeRows = trimmedRows.map(row => {
    const r = { ...row };
    for (const key of DATE_FIELDS) {
      if (key in r) r[key] = wrapForExcelText(r[key]); // still DD/MM/YYYY but protected
    }
    return r;
  });
  const wsExcel = XLSX.utils.json_to_sheet(excelSafeRows, { header: WANTED_HEADERS });
  const csvExcelSafe = XLSX.utils.sheet_to_csv(wsExcel);

  const base = file.name.replace(/\.(csv|xls|xlsx)$/i, "");
  const csvDLName = `${base}_digilocker.csv`;
  const csvExcelName = `${base}_excel_safe.csv`;

  if (archive === "zip") {
    const zip = new JSZip();
    zip.file(csvDLName, csvDigilocker);
    zip.file(csvExcelName, csvExcelSafe);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return {
      rows: trimmedRows,
      blobUrl: URL.createObjectURL(zipBlob),
      downloadName: `${base}_trimmed.zip`,
      csvText: csvDigilocker, // primary preview = DigiLocker version
    };
  }

  if (archive === "gzip") {
    const csvBlob = new Blob([csvDigilocker], { type: "text/csv;charset=utf-8" });
    const gzBlob = await gzipBlob(csvBlob);
    return {
      rows: trimmedRows,
      blobUrl: URL.createObjectURL(gzBlob),
      downloadName: `${csvDLName}.gz`,
      csvText: csvDigilocker,
    };
  }

  // default single-file return = DigiLocker CSV
  const csvBlob = new Blob([csvDigilocker], { type: "text/csv;charset=utf-8" });
  return {
    rows: trimmedRows,
    blobUrl: URL.createObjectURL(csvBlob),
    downloadName: csvDLName,
    csvText: csvDigilocker,
  };
}

async function gzipBlob(inputBlob) {
  if (!("CompressionStream" in window)) {
    throw new Error("Gzip not supported in this browser. Use archive='zip' instead.");
  }
  const cs = new CompressionStream("gzip");
  const stream = inputBlob.stream().pipeThrough(cs);
  return new Response(stream).blob();
}
