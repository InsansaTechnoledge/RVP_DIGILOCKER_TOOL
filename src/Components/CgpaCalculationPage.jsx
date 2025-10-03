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

      // Uppercase the detected student ID column in-place (REG_NO/REGN_NO/RROLL/etc.)
      const studentKey =
        uppercaseStudentIdsInPlace(rows) || findStudentKey(Object.keys(rows[0]));
      if (!studentKey)
        throw new Error(
          "Student key not found (REGN_NO/RROLL/ROLL_NO/ENROLLMENT/REG_NO...)."
        );

      // resolve totals headers (aggregates)
      const headerMap = resolveHeaderMapFromRows(rows);
      if (!headerMap.TOTAL_CREDIT || !headerMap.TOTAL_CREDIT_POINT) {
        throw new Error(
          "Sheet must contain TOTAL_CREDIT and TOTAL_CREDIT_POINT columns."
        );
      }

      // group rows per student (IDs already uppercased)
      const byStudent = {};
      for (const r of rows) {
        const id = r[studentKey];
        if (!id) continue;
        if (!byStudent[id]) byStudent[id] = [];
        byStudent[id].push(r);
      }

      // Build per-sem entries by reading pre-aggregated totals
      const perSem = {};
      for (const [reg, list] of Object.entries(byStudent)) {
        const { totalCredits, totalCreditPoints, sgpaOrNull } =
          computeTotalsFromAggregates(list, headerMap);
        perSem[reg] = {
          totalCredits,
          totalCreditPoints,
          sgpa: sgpaOrNull, // may be null if not derivable
        };
      }

      // store this semester’s result
      setSemResults((prev) => {
        const next = { ...prev, [semIndex]: perSem };
        // remember last sem raw rows for appending (already uppercased)
        if (semIndex === totalSems) {
          setLastSemRows(rows);
          setLastSemSheetName(wsName);
        }
        // recompute merged after state copy made
        setTimeout(() => recomputeMerged(next), 0);
        return next;
      });

      // if this was the LAST semester, immediately build & download final file
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

  // Weighted CGPA for one student across all uploaded sems:
  // CGPA = (Σ total_credit_point) / (Σ total_credit)
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
    // find the student key on the LAST sheet
    const studentKey = findStudentKey(Object.keys(lastSemRows[0]));
    if (!studentKey) {
      alert("Could not find REGN_NO/RROLL/ROLL_NO on the last semester sheet.");
      return null;
    }

    // Resolve headers on the last-sem sheet (for masking check)
    const headerMapLast = resolveHeaderMapFromRows(lastSemRows);

    const semIdxs = Object.keys(semResults).map(Number).sort((a, b) => a - b);

    const out = lastSemRows.map((row) => {
      const reg = row[studentKey];
      const copy = { ...row };

      // Append SGPA per sem (from merged view, for visibility)
      const semObj = merged[reg]; // { sem1, sem2, ... } = sgpa per sem
      for (const s of semIdxs) {
        copy[`SGPA_SEM_${s}`] = semObj?.[`sem${s}`] ?? "";
      }

      // If GRAND_TOT_MRKS or TOT_MRKS are masked (***, ***** ...), force CGPA = "***"
      if (shouldMaskCgpa(copy, headerMapLast)) {
        copy["CGPA"] = "***";
      } else {
        // Weighted CGPA (Σ tcp / Σ tc)
        copy["CGPA"] = computeCgpaWeightedForReg(reg) ?? "";
      }

      return copy;
    });

    return out;
  }

  function downloadFinal() {
    const rows = buildFinalRows();
    if (!rows) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
    XLSX.utils.book_append_sheet(wb, ws, lastSemSheetName || "Final");
    const fileName = `${course || "Course"}_CGPA_Final.xlsx`;
    XLSX.writeFile(wb, fileName);
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

          <button className="primary-button mt-2" type="button" onClick={downloadFinal}>
            Download Final Now
          </button>
        </div>
      )}
    </div>
  );
};

export default CgpaCalculationPage;
