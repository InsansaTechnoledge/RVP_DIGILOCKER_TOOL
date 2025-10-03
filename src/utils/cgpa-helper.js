// src/utils/cgpa-helper.js
import * as XLSX from "xlsx";

/* =========================
   Header normalization + aliases
   ========================= */

export const STUDENT_KEY_ALIASES = [
  "REGN_NO", "REG_NO", "REGISTRATION_NO", "ENROLLMENT_NO", "ENR_NO",
  "ENROLLMENT", "REGISTRATION", "RROLL", "ROLL_NO", "ROLL"
];

export const normalize = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_");

export function findStudentKey(actualKeys) {
  const normalizedActual = actualKeys.map(normalize);
  for (const alias of STUDENT_KEY_ALIASES) {
    const i = normalizedActual.findIndex((k) => k === normalize(alias));
    if (i !== -1) return actualKeys[i]; // return the real key as it appears in the sheet
  }
  return null;
}

/* =========================
   Flexible aliases for totals / SGPA / marks masking
   ========================= */

const HEADER_ALIASES = {
  TOTAL_CREDIT: ["TOTAL_CREDIT", "TOTAL_CREDITS", "TOT_CREDIT", "SUM_CREDIT", "TOT_CR"],
  TOTAL_CREDIT_POINT: [
    "TOTAL_CREDIT_POINT", "TOTAL_CREDIT_POINTS",
    "TOT_CREDIT_POINTS", "CREDIT_POINTS", "TOTAL_POINTS", "TOT_CP"
  ],
  SGPA: ["SGPA", "SEM_SGPA", "SemSGPA"],

  // For masking (***): treat these as potential marks columns
  GRAND_TOT_MRKS: [
    "GRAND_TOT_MRKS", "GRAND_TOTAL_MARKS", "GRAND_TOTAL", "GRAND_TOT", "GRAND_MARKS"
  ],
  TOT_MRKS: [
    "TOT_MRKS", "TOTAL_MARKS", "TOT_MARKS", "TOTAL_MRKS"
  ],
};

function findFirstKey(actualKeys, candidates) {
  const nk = actualKeys.map(normalize);
  for (const c of candidates) {
    const idx = nk.findIndex((k) => k === normalize(c));
    if (idx !== -1) return actualKeys[idx];
  }
  return null;
}

/**
 * Case-insensitive key finder. Returns the actual matching key or null.
 */
export function findKeyCI(keys, name) {
  const target = String(name).toUpperCase();
  return keys.find((k) => String(k).toUpperCase() === target) || null;
}

/**
 * Resolve commonly-used headers from the first row of data.
 * Now includes GRAND_TOT_MRKS and TOT_MRKS for masking logic.
 */
export function resolveHeaderMapFromRows(rows) {
  if (!rows?.length) return {};
  const keys = Object.keys(rows[0]);
  return {
    TOTAL_CREDIT: findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT),
    TOTAL_CREDIT_POINT: findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT_POINT),
    SGPA: findFirstKey(keys, HEADER_ALIASES.SGPA),

    GRAND_TOT_MRKS: findFirstKey(keys, HEADER_ALIASES.GRAND_TOT_MRKS),
    TOT_MRKS: findFirstKey(keys, HEADER_ALIASES.TOT_MRKS),
  };
}

/* =========================
   File reading
   ========================= */

export function readSheetToObjects(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
        resolve({ rows, wsName });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}

/* =========================
   Optional SGPA reader (if sheet also has SGPA column)
   ========================= */

export function pickSgpa(row) {
  if (row.SGPA !== undefined && row.SGPA !== "") {
    const n = Number(row.SGPA);
    if (!Number.isNaN(n)) return n;
  }
  if (row.sgpa !== undefined && row.sgpa !== "") {
    const n = Number(row.sgpa);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/* =========================
   Student ID uppercase utility
   ========================= */

/**
 * Uppercase the detected student key values in-place.
 * - Finds the student key from the sheet headers (REG_NO/REGN_NO/RROLL/etc.)
 * - Uppercases all values in that column (e.g., "2k22/1277" -> "2K22/1277")
 * Returns the detected studentKey (or null if not found).
 */
export function uppercaseStudentIdsInPlace(rows) {
  if (!rows?.length) return null;
  const keys = Object.keys(rows[0]);
  const studentKey = findStudentKey(keys);
  if (!studentKey) return null;

  for (const r of rows) {
    if (r[studentKey] !== undefined && r[studentKey] !== null) {
      r[studentKey] = String(r[studentKey]).trim().toUpperCase();
    }
  }
  return studentKey;
}

/* =========================
   Masking helpers for CGPA suppression
   ========================= */

/**
 * Returns true if a value is composed only of asterisks (***, *****, etc.).
 */
export function isAllAsterisks(v) {
  return typeof v === "string" && /^\*+$/.test(v.trim());
}

/**
 * Determine if CGPA should be suppressed (kept as "***") for a given row.
 * Uses headerMap.GRAND_TOT_MRKS and headerMap.TOT_MRKS (if present).
 */
export function shouldMaskCgpa(row, headerMap) {
  const gKey = headerMap?.GRAND_TOT_MRKS || null;
  const tKey = headerMap?.TOT_MRKS || null;
  const gMasked = gKey ? isAllAsterisks(row[gKey]) : false;
  const tMasked = tKey ? isAllAsterisks(row[tKey]) : false;
  return gMasked || tMasked;
}

/* =========================
   Totals from pre-aggregated columns
   ========================= */

/**
 * Read per-student totals for a semester from pre-aggregated columns.
 * Returns: { totalCredits, totalCreditPoints, sgpaOrNull }
 *
 * Throws if the sheet lacks TOTAL_CREDIT / TOTAL_CREDIT_POINT headers.
 */
export function computeTotalsFromAggregates(studentRows, headerMap) {
  if (!headerMap.TOTAL_CREDIT || !headerMap.TOTAL_CREDIT_POINT) {
    throw new Error("Sheet must contain TOTAL_CREDIT and TOTAL_CREDIT_POINT columns.");
  }

  // Find any row that has numeric totals
  for (const r of studentRows) {
    const tc = Number(r[headerMap.TOTAL_CREDIT]);
    const tcp = Number(r[headerMap.TOTAL_CREDIT_POINT]);
    if (!Number.isNaN(tc) && !Number.isNaN(tcp) && tc > 0) {
      const sgpa = Number((tcp / tc).toFixed(2));
      return { totalCredits: tc, totalCreditPoints: tcp, sgpaOrNull: sgpa };
    }
  }

  // If not found, return zeros (no totals present for that student)
  return { totalCredits: 0, totalCreditPoints: 0, sgpaOrNull: null };
}
