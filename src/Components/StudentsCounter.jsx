// StudentsCounterDnD.jsx
import React, { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  Users,
  Trash2,
} from "lucide-react";

// Helper: recursively walk folder structure from DataTransferItemList
async function getFilesFromDataTransferItems(dataTransferItems) {
  const files = [];

  const traverseEntry = (entry, path = "") =>
    new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          // Store full path for display (optional)
          file.fullPath = path + entry.name;
          files.push(file);
          resolve();
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = () => {
          dirReader.readEntries(async (entries) => {
            if (!entries.length) {
              resolve();
            } else {
              await Promise.all(
                entries.map((ent) =>
                  traverseEntry(ent, path + entry.name + "/")
                )
              );
              readEntries();
            }
          });
        };
        readEntries();
      } else {
        resolve();
      }
    });

  await Promise.all(
    Array.from(dataTransferItems).map((item) => {
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (entry) return traverseEntry(entry);
      return Promise.resolve();
    })
  );

  return files;
}

// Normalize a name so duplicates can be detected better
function normalizeName(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // basic normalization: case-insensitive + collapse spaces
  return s.toLowerCase().replace(/\s+/g, " ");
}

// Decide which header is the "name" column
function isNameHeader(cell) {
  if (cell == null) return false;
  const v = String(cell).trim().toLowerCase();
  if (!v) return false;

  // Direct matches (includes your columns)
  const directMatches = [
    "name",
    "student name",
    "full name",
    "student_name",
    "studentname",
    "cname",           // your CSV
    "aadhaar_name",    // your CSV
    "aadhar_name",
    "candidate name",
    "candidate_name",
  ];

  if (directMatches.includes(v)) return true;

  // Generic " ... name" (but avoid fname/mname)
  if ((v.includes(" name") || v.startsWith("name ")) && v !== "fname" && v !== "mname") {
    return true;
  }

  return false;
}

const StudentsCounterDnD = () => {
  const [totalUniqueNames, setTotalUniqueNames] = useState(0);
  const [totalCommonNames, setTotalCommonNames] = useState(0);
  const [fileSummaries, setFileSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [seenFiles, setSeenFiles] = useState(new Set());

  // Global union of names across ALL files
  const globalUnionRef = useRef(new Set());
  // Global intersection of names across ALL files
  const globalIntersectionRef = useRef(null); // null until first file

  const processFiles = useCallback(
    async (files) => {
      if (!files.length) return;
      setLoading(true);

      const newSummaries = [];
      const newSeenFiles = new Set(seenFiles);
      const globalUnion = globalUnionRef.current;
      let globalIntersection = globalIntersectionRef.current; // Set or null

      for (const file of files) {
        const lower = file.name.toLowerCase();

        // ✅ Allow .csv, .xlsx, .xls
        if (
          !(
            lower.endsWith(".csv") 
            // lower.endsWith(".xlsx") ||
            // lower.endsWith(".xls")
          )
        ) {
          continue;
        }

        // De-duplicate files
        const fileKey = `${file.name}-${file.size}-${file.lastModified || 0}`;
        if (newSeenFiles.has(fileKey)) {
          // Already processed this exact file
          continue;
        }

        const data = await file.arrayBuffer();

        // XLSX can read both CSV & Excel
        const workbook = XLSX.read(data, { type: "array" });

        // Track unique names for THIS file only
        const fileUniqueNames = new Set();

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];

          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
          });

          if (!rows.length) return;

          const headerRow = rows[0] || [];

          // Find "name-like" column index (case-insensitive)
          const nameColIndex = headerRow.findIndex(isNameHeader);

          if (nameColIndex === -1) {
            // No name column in this sheet → skip this sheet
            return;
          }

          const dataRows = rows.slice(1); // ignore header

          dataRows.forEach((row) => {
            if (!Array.isArray(row)) return;
            const rawName = row[nameColIndex];
            const normalized = normalizeName(rawName);
            if (!normalized) return;

            fileUniqueNames.add(normalized);
          });
        });

        // If this file had no valid names at all, skip it for intersection purposes
        if (fileUniqueNames.size === 0) {
          newSeenFiles.add(fileKey);
          continue;
        }

        // Update global UNION
        for (const n of fileUniqueNames) {
          globalUnion.add(n);
        }

        // Update global INTERSECTION
        if (globalIntersection == null) {
          // First file processed: intersection = its set
          globalIntersection = new Set(fileUniqueNames);
        } else {
          const nextIntersection = new Set();
          for (const n of globalIntersection) {
            if (fileUniqueNames.has(n)) {
              nextIntersection.add(n);
            }
          }
          globalIntersection = nextIntersection;
        }

        // Push per-file summary (unique names inside that file)
        newSummaries.push({
          name: file.fullPath || file.name,
          rows: fileUniqueNames.size,
        });

        newSeenFiles.add(fileKey);
      }

      if (newSummaries.length > 0) {
        setFileSummaries((prev) => [...prev, ...newSummaries]);
        setSeenFiles(newSeenFiles);
        globalIntersectionRef.current = globalIntersection;

        // Global unique count (union)
        setTotalUniqueNames(globalUnion.size);
        // Common across ALL processed files (intersection)
        setTotalCommonNames(globalIntersection ? globalIntersection.size : 0);
      }

      setLoading(false);
    },
    [seenFiles]
  );

  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    let files = [];

    // If folders are dropped, use webkitGetAsEntry to walk directories
    if (items && items.length && items[0].webkitGetAsEntry) {
      files = await getFilesFromDataTransferItems(items);
    } else {
      // Fallback: direct files
      files = Array.from(e.dataTransfer.files || []);
    }

    await processFiles(files);
  };

  const handleReset = () => {
    setTotalUniqueNames(0);
    setTotalCommonNames(0);
    setFileSummaries([]);
    setSeenFiles(new Set());
    globalUnionRef.current = new Set();
    globalIntersectionRef.current = null;
  };

  const totalFiles = fileSummaries.length;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-md p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight">
              Count common students across years
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Drop <code>.csv</code>, <code>.xlsx</code>, or <code>.xls</code>{" "}
              files / folders. We look for a name column like{" "}
              <code>CNAME</code>, <code>AADHAAR_NAME</code>,{" "}
              <code>Student Name</code>, etc., and:
              <br />
              <span className="font-medium">
                – Count each name only once overall (union) <br />
                – And also count names common to all files (intersection)
              </span>
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-2 text-xs text-gray-500">
            <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
              .csv · .xlsx · .xls
            </span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl px-4 py-10 mb-6 transition-all cursor-pointer ${
            isDragging
              ? "border-black bg-gray-50"
              : "border-gray-300 bg-gray-50 hover:border-black hover:bg-gray-100"
          }`}
        >
          {/* multiple + webkitdirectory let you pick many folders/files where supported */}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            onChange={handleFilesChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center text-center gap-3 pointer-events-none">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-gray-200">
              {loading ? (
                <Loader2 className="w-7 h-7 text-gray-800 animate-spin" />
              ) : (
                <UploadCloud
                  className={`w-7 h-7 ${
                    isDragging ? "text-black" : "text-gray-700"
                  }`}
                />
              )}
            </div>
            <div>
              <p className="text-sm md:text-base font-medium text-black">
                {isDragging
                  ? "Release to drop files / folders"
                  : "Drag & drop files/folders here, or click to browse"}
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Folders are scanned recursively. We only use the name-like
                column to identify students and compute union + common set.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 text-xs md:text-sm text-gray-700">
          <div className="flex gap-2 items-start">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] text-gray-800">
              1
            </span>
            <p>Drop yearly student files (e.g., 1st–4th year) or folders.</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] text-gray-800">
              2
            </span>
            <p>We detect the name column (CNAME / AADHAAR_NAME / Name…).</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] text-gray-800">
              3
            </span>
            <p>
              You see total unique students and how many are common to all
              files.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-700 text-sm">
            <p>Processing files…</p>
          </div>
        )}

        {/* Stats + Table */}
        {!loading && fileSummaries.length > 0 && (
          <>
            <div className="flex flex-col md:flex-row items-stretch gap-4 mb-5">
              <div className="flex-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-gray-800" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total files</p>
                  <p className="text-xl font-semibold text-black">
                    {totalFiles}
                  </p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-800" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Total unique students (union)
                  </p>
                  <p className="text-xl font-semibold text-black">
                    {totalUniqueNames}
                  </p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-800" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Common students across all files (intersection)
                  </p>
                  <p className="text-xl font-semibold text-black">
                    {totalCommonNames}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs md:text-sm text-gray-900">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-3 md:px-4 py-2 font-medium">
                        File name / path
                      </th>
                      <th className="text-right px-3 md:px-4 py-2 font-medium">
                        Unique names in file
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileSummaries.map((f, idx) => (
                      <tr
                        key={`${f.name}-${idx}`}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-3 md:px-4 py-2 whitespace-nowrap max-w-xs truncate">
                          {f.name}
                        </td>
                        <td className="px-3 md:px-4 py-2 text-right font-medium">
                          {f.rows}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center px-3 md:px-4 py-3 border-t border-gray-200 text-[11px] md:text-xs text-gray-500">
                <span>
                  Processed{" "}
                  <span className="text-gray-900 font-medium">
                    {totalFiles}
                  </span>{" "}
                  file{totalFiles !== 1 ? "s" : ""}.
                </span>
                <span>Union & intersection based on Name-like column</span>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && fileSummaries.length === 0 && (
          <div className="mt-4 text-xs md:text-sm text-gray-500">
            <p>
              No files processed yet. Start by dragging your yearly CSV/Excel
              folder into the drop area, or click it to select. We’ll compute{" "}
              <strong>common students across all files</strong> plus total
              unique.
            </p>
          </div>
        )}

        {/* Reset button */}
        {!loading && (fileSummaries.length > 0 || totalUniqueNames > 0) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Reset all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsCounterDnD;
