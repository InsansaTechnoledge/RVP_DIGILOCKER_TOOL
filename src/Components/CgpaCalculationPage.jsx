// src/components/CgpaCalculationPage.jsx
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import SelectCoursesComponent from "./SelectCoursesComponent";
import ExcelUploadSectionForCGPA from "./CGPAExcelUploadSection";
import { courses } from "../constants";

import {
  computeTotalsFromAggregates,
  findStudentKey,
  readSheetToObjects,
  resolveHeaderMapFromRows,
  uppercaseStudentIdsInPlace,
  shouldMaskCgpa,
  computeCgpaTotalsForReg
} from "../utils/cgpa-helper";

const CgpaCalculationPage = ({ setCourse, course }) => {
  const [totalSems, setTotalSems] = useState(0);

  // per-sem structure:
  // semResults[semIndex][reg] = { totalCredits, totalCreditPoints, sgpa }
  const [semResults, setSemResults] = useState({});

  // merged SGPA per student for display/append only (NOT used for CGPA maths)
  // merged[reg] = { sem1: sgpa, sem2: sgpa, ... }
  const [merged, setMerged] = useState({});

  // keep last sem raw rows + sheet name for export
  const [lastSemRows, setLastSemRows] = useState(null);
  const [lastSemSheetName, setLastSemSheetName] = useState(null);

  useEffect(() => {
    const selected = courses.find((c) => c.name === course);
    setTotalSems(selected ? selected.sem : 0);

    // reset when course changes
    setSemResults({});
    setMerged({});
    setLastSemRows(null);
    setLastSemSheetName(null);
  }, [course]);

  function recomputeMerged(nextSemResults) {
    const out = {};
    const semIdxs = Object.keys(nextSemResults).map(Number).sort((a, b) => a - b);
    for (const s of semIdxs) {
      const map = nextSemResults[s] || {};
      for (const [reg, payload] of Object.entries(map)) {
        if (!out[reg]) out[reg] = {};
        out[reg][`sem${s}`] = payload?.sgpa ?? null;
      }
    }
    setMerged(out);
  }

  function sanitizeAsterisksInPlace(rows) {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) {
        const val = row[key];
        if (val == null) continue;

        if (typeof val === "string") {
          // Remove all '*' characters
          const noStars = val.replace(/\*/g, "").trim();
          // If cell had only stars (e.g. "*", "***"), blank it; else keep cleaned text
          row[key] = noStars === "" ? "" : noStars;
        }
      }
    }
  }

  // 🔹 Helper: does this row have '*' in ANY column?
  function rowHasAnyStar(row) {
    if (!row || typeof row !== "object") return false;
    for (const val of Object.values(row)) {
      if (typeof val === "string" && val.includes("*")) {
        return true;
      }
    }
    return false;
  }

  // Weighted CGPA for one student across all uploaded sems:
  // CGPA = (Σ total_credit_point) / (Σ total_credit)

  const handleUpload = async (e, semIndex) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xls", "xlsx"].includes(ext)) {
      alert("Please upload CSV/XLS/XLSX.");
      e.target.value = "";
      return;
    }

    try {
      const { rows, wsName } = await readSheetToObjects(file);
      if (!rows.length) throw new Error("Empty sheet.");

      // 1) UPPERCASE IDs on the ORIGINAL rows (keep stars here)
      const studentKey =
        uppercaseStudentIdsInPlace(rows) || findStudentKey(Object.keys(rows[0]));
      if (!studentKey)
        throw new Error(
          "Student key not found (REGN_NO/RROLL/ROLL_NO/ENROLLMENT/REG_NO...)."
        );

      // 2) Make a SEPARATE copy for maths & clean stars THERE
      const calcRows = rows.map((r) => ({ ...r }));
      sanitizeAsterisksInPlace(calcRows); // <- only affects calcRows

      // 3) Resolve headers from calcRows
      const headerMap = resolveHeaderMapFromRows(calcRows);
      if (!headerMap.TOTAL_CREDIT || !headerMap.TOTAL_CREDIT_POINT) {
        throw new Error(
          "Sheet must contain TOTAL_CREDIT and TOTAL_CREDIT_POINT columns."
        );
      }

      // 4) Group by student using calcRows (IDs already uppercased)
      const byStudent = {};
      for (const r of calcRows) {
        const id = r[studentKey];
        if (!id) continue;
        if (!byStudent[id]) byStudent[id] = [];
        byStudent[id].push(r);
      }

      // 5) Build per-sem entries using sanitized totals
      const perSem = {};
      for (const [reg, list] of Object.entries(byStudent)) {
        const { totalCredits, totalCreditPoints, sgpaOrNull } =
          computeTotalsFromAggregates(list, headerMap);
        perSem[reg] = {
          totalCredits,
          totalCreditPoints,
          sgpa: sgpaOrNull,
        };
      }

      // 6) Store this semester’s result
      setSemResults((prev) => {
        const next = { ...prev, [semIndex]: perSem };
        if (semIndex === totalSems) {
          // store ORIGINAL rows (with stars) for masking & export
          setLastSemRows(rows);
          setLastSemSheetName(wsName);
        }
        setTimeout(() => recomputeMerged(next), 0);
        return next;
      });

      // auto-download on last sem upload
      if (semIndex === totalSems) {
        setTimeout(() => downloadFinal(), 50);
      }

      console.log(
        `Semester ${semIndex} parsed. Students:`,
        Object.keys(perSem).length
      );
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to parse this sheet.");
    }
  };

  function computeCgpaWeightedForReg(reg) {
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

    if (!sumCredits) return null;
    return Number((sumCreditPoints / sumCredits).toFixed(2));
  }

  function buildFinalRows() {
    if (!lastSemRows?.length) {
      alert("Upload the last semester sheet before finalizing.");
      return null;
    }
    const studentKey = findStudentKey(Object.keys(lastSemRows[0]));
    if (!studentKey) {
      alert("Could not find REGN_NO/RROLL/ROLL_NO on the last semester sheet.");
      return null;
    }

    const headerMapLast = resolveHeaderMapFromRows(lastSemRows);
    const semIdxs = Object.keys(semResults).map(Number).sort((a, b) => a - b);

    const out = lastSemRows.map((row) => {
      const reg = row[studentKey];
      const copy = { ...row };

      const semObj = merged[reg];
      const { sumCredits, sumCreditPoints, cgpa } =
        computeCgpaTotalsForReg(reg, semResults);

      // ✅ If ANY column in this student's last-sem row has '*', we mask
      const hasStarAnywhere = rowHasAnyStar(row);
      const shouldMask = hasStarAnywhere || shouldMaskCgpa(copy, headerMapLast);

      if (shouldMask) {
        // ❌ Do NOT show SGPA or CGPA for such students
        for (const s of semIdxs) {
          copy[`SGPA_SEM_${s}`] = "";
        }
        copy["TOTAL_CGPA_CREDITS"] = "";
        copy["TOTAL_CGPA_CREDIT_POINTS"] = "";
        // keep your existing convention: CGPA = 0 (you can change to "" if you like)
        copy["CGPA"] = "";
      } else {
        // ✅ Normal students – append SGPA per sem + CGPA totals
        for (const s of semIdxs) {
          copy[`SGPA_SEM_${s}`] = semObj?.[`sem${s}`] ?? "";
        }
        copy["TOTAL_CGPA_CREDITS"] = sumCredits || "";
        copy["TOTAL_CGPA_CREDIT_POINTS"] = sumCreditPoints || "";
        copy["CGPA"] = cgpa ?? "";
      }

      // 🔚 Final step: strip '*' from the exported data (all columns)
      sanitizeAsterisksInPlace([copy]);

      return copy;
    });

    return out;
  }

  function downloadFinal() {
    const rows = buildFinalRows();
    if (!rows || !rows.length) return;

    // Derive a stable header order from the first row
    const headers = Object.keys(rows[0] || {});

    // Build a sheet using that header order
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers, skipHeader: false });

    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(ws);

    // Create a CSV blob with BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

    // Decide a filename (CSV)
    const fileName = `${course || "Course"}_CGPA_Final.csv`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SelectCoursesComponent setCourse={setCourse} />

      <div className="upload-section">
        <h2 className="secondary-heading">CGPA Builder</h2>
        <p className="file-info">
          Selected: <b>{course || "—"}</b> &nbsp;|&nbsp; Total Semesters:{" "}
          <b>{totalSems || "—"}</b> &nbsp;|&nbsp; Students merged:{" "}
          <b>{Object.keys(merged).length}</b>
        </p>
      </div>

      {course && totalSems > 0 && (
        <div className="upload-section">
          <h2 className="secondary-heading mb-2">
            Upload Semesters (1 → {totalSems})
          </h2>
          <p className="file-info">
            After each upload we merge. On uploading sem {totalSems}, we’ll append
            all SGPA_SEM_x + CGPA to that sheet and download it.
          </p>

          {Array.from({ length: totalSems }).map((_, i) => {
            const semIndex = i + 1;
            const uploadedCount = Object.keys(semResults[semIndex] || {}).length;
            return (
              <div key={semIndex} className="mb-6">
                <p className="text-lg text-blue-600/70 font-bold mb-3 underline">
                  Semester {semIndex}
                </p>
                <ExcelUploadSectionForCGPA
                  semIndex={semIndex}
                  onUpload={handleUpload}
                />
                <div className="mt-2 text-sm text-gray-500">
                  {uploadedCount
                    ? `Parsed ${uploadedCount} students`
                    : "Not uploaded yet"}
                </div>
              </div>
            );
          })}

          <button
            className="primary-button mt-2"
            type="button"
            onClick={downloadFinal}
          >
            Download Final Now
          </button>
        </div>
      )}
    </div>
  );
};

export default CgpaCalculationPage;
