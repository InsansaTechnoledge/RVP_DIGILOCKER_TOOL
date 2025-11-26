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

// add these to HEADER_ALIASES
// Add once (if not already present)
const HEADER_ALIASES = {
  TOTAL_CREDIT: ["TOTAL_CREDIT","TOTAL_CREDITS","TOT_CREDIT","SUM_CREDIT","TOT_CR"],
  TOTAL_CREDIT_POINT: [
    "TOTAL_CREDIT_POINT","TOTAL_CREDIT_POINTS","TOT_CREDIT_POINTS","CREDIT_POINTS","TOTAL_POINTS","TOT_CP"
  ],
  // NEW
  TOTAL_DUE_CREDITS: ["TOTAL_DUE_CREDITS","TOT_DUE_CREDITS","DUE_CREDITS","DUE_CR"],
  TOTAL_DUE_CREDIT_POINTS: ["TOTAL_DUE_CREDIT_POINTS","TOT_DUE_CP","DUE_CREDIT_POINTS","DUE_POINTS","DUE_CP"],

  SGPA: ["SGPA","SEM_SGPA","SemSGPA"],
  GRAND_TOT_MRKS: ["GRAND_TOT_MRKS","GRAND_TOTAL_MARKS","GRAND_TOTAL","GRAND_TOT","GRAND_MARKS"],
  TOT_MRKS: ["TOT_MRKS","TOTAL_MARKS","TOT_MARKS","TOTAL_MRKS"],
};

export function resolveHeaderMapFromRows(rows) {
  if (!rows?.length) return {};
  const keys = Object.keys(rows[0]);
  return {
    TOTAL_CREDIT: findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT),
    TOTAL_CREDIT_POINT: findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT_POINT),
    TOTAL_DUE_CREDITS: findFirstKey(keys, HEADER_ALIASES.TOTAL_DUE_CREDITS),
    TOTAL_DUE_CREDIT_POINTS: findFirstKey(keys, HEADER_ALIASES.TOTAL_DUE_CREDIT_POINTS),
    SGPA: findFirstKey(keys, HEADER_ALIASES.SGPA),
    GRAND_TOT_MRKS: findFirstKey(keys, HEADER_ALIASES.GRAND_TOT_MRKS),
    TOT_MRKS: findFirstKey(keys, HEADER_ALIASES.TOT_MRKS),
  };
}


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

// export function resolveHeaderMapFromRows(rows) {
//   if (!rows?.length) return {};
//   const keys = Object.keys(rows[0]);
//   return {
//     TOTAL_CREDIT:           findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT),
//     TOTAL_CREDIT_POINT:     findFirstKey(keys, HEADER_ALIASES.TOTAL_CREDIT_POINT),

//     // NEW
//     TOTAL_DUE_CREDITS:         findFirstKey(keys, HEADER_ALIASES.TOTAL_DUE_CREDITS),
//     TOTAL_DUE_CREDIT_POINTS:   findFirstKey(keys, HEADER_ALIASES.TOTAL_DUE_CREDIT_POINTS),

//     SGPA:                   findFirstKey(keys, HEADER_ALIASES.SGPA),
//     GRAND_TOT_MRKS:         findFirstKey(keys, HEADER_ALIASES.GRAND_TOT_MRKS),
//     TOT_MRKS:               findFirstKey(keys, HEADER_ALIASES.TOT_MRKS),
//   };
// }


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
/**
 * Returns:
 *  - totalCredits / totalCreditPoints: for **CGPA** accumulation (base + due)
 *  - sgpaOrNull: **SGPA** computed strictly from base totals (no "due" added)
 */
export function computeTotalsFromAggregates(studentRows, headerMap) {
  // SGPA requires base totals to exist
  if (!headerMap.TOTAL_CREDIT || !headerMap.TOTAL_CREDIT_POINT) {
    throw new Error("Sheet must contain TOTAL_CREDIT and TOTAL_CREDIT_POINT for SGPA.");
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  for (const r of studentRows) {
    // Base (for SGPA)
    const baseCredits = num(r[headerMap.TOTAL_CREDIT]);
    const basePoints  = num(r[headerMap.TOTAL_CREDIT_POINT]);

    // Compute SGPA from base only
    const sgpa =
      baseCredits > 0 ? Number((basePoints / baseCredits).toFixed(2)) : null;

    // Add DUE only for CGPA totals
    const dueCredits = headerMap.TOTAL_DUE_CREDITS
      ? num(r[headerMap.TOTAL_DUE_CREDITS])
      : 0;
    const duePoints = headerMap.TOTAL_DUE_CREDIT_POINTS
      ? num(r[headerMap.TOTAL_DUE_CREDIT_POINTS])
      : 0;

    const cgpaCredits = baseCredits;
    const cgpaPoints  = basePoints + duePoints;

    console.log("check", cgpaCredits , cgpaPoints , dueCredits, duePoints);
    

    // If there is any meaningful total, return combined for CGPA + base-only SGPA
    if (cgpaCredits > 0 || cgpaPoints > 0 || sgpa !== null) {
      return {
        totalCredits: cgpaCredits,        // use these for CGPA accumulation
        totalCreditPoints: cgpaPoints,    // use these for CGPA accumulation
        sgpaOrNull: sgpa,                 // base-only SGPA
      };
    }
  }

  return { totalCredits: 0, totalCreditPoints: 0, sgpaOrNull: null };
}

// Weighted CGPA helpers across semesters for a single student
// Uses perSem entries already stored in semResults (which already include base+due)
export function computeCgpaTotalsForReg(reg, semResults) {
  let sumCredits = 0;
  let sumCreditPoints = 0;

  const semIdxs = Object.keys(semResults).map(Number).sort((a, b) => a - b);
  for (const s of semIdxs) {
    const entry = semResults[s]?.[reg];
    if (!entry) continue;
    const { totalCredits, totalCreditPoints } = entry;
    if (!totalCredits || !totalCreditPoints) continue;
    sumCredits += Number(totalCredits) || 0;
    sumCreditPoints += Number(totalCreditPoints) || 0;
  }

  const cgpa = sumCredits ? Number((sumCreditPoints / sumCredits).toFixed(2)) : null;
  return { sumCredits, sumCreditPoints, cgpa };
}
