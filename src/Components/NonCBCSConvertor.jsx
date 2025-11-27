// File: src/components/NadTransformer.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Exact course names (NON-CBCS course list)
const COURSE_OPTIONS = [
  "B.A.B.ED. (FOUR YEAR INTEGRATED COURSE) - YEARLY",
  "B.A.LL.B. 5 YEAR INTEGRATED COURSE",
  "B.SC.B.ED. (FOUR YEAR INTEGRATED COURSE) - YEARLY",
  "BACHELOR OF BUSINESS ADMINISTRATION",
  "B.ED.-M.ED. -INTEGRATED - YEARLY",
  "BACHELOR OF ARTS (ADDITIONAL) ENGLISH",
  "BACHELOR OF EDUCATION (CHILD DEVELOPMENT) INTEGRATED - YEARLY",
  "BACHELOR OF EDUCATION - YEARLY",
  "BACHELOR OF EDUCATION SPECIAL EDUCATION - HI",
  "BACHELOR OF EDUCATION SPECIAL EDUCATION - MR",
  "BACHELOR OF HOMOEOPATHIC MEDICINE & SURGERY",
  "BACHELOR OF LAWS",
  "BACHELOR OF LIBRARY & INFORMATION SCIENCE",
  "BACHELOR OF PHYSIOTHERAPY",
  "CERTIFICATE COURSE IN ACUPRESSURE TRAINING",
  "CERTIFICATE COURSE IN SPOKEN ENGLISH",
  "CERTIFICATE COURSE IN URDU LANGUAGE",
  "CERTIFICATE IN JYOTISH",
  "CERTIFICATE IN NITYAKARMA POOJA PADDATI & ANUSTHAN & KARMAKAND",
  "CERTIFICATE IN VASTU",
  "DIPLOMA IN ACUPRESSURE",
  "DIPLOMA IN ARCHAEOLOGY",
  "DIPLOMA IN BHARTIYA JYOTISH",
  "DIPLOMA IN CIVIL ENGINEERING",
  "DIPLOMA IN COMPUTER SCIENCE & ENGINEERING",
  "DIPLOMA IN ELECTRICAL & COMMUNICATION ENGINEERING",
  "DIPLOMA IN ELECTRICAL ENGINEERING",
  "DIPLOMA IN HOTEL MANAGEMENT",
  "DIPLOMA IN HOTEL MANAGEMENT - HOUSEKEEPING",
  "DIPLOMA IN LIBRARY AND INFORMATION SCIENCE",
  "DIPLOMA IN MECHANICAL ENGINEERING",
  "DIPLOMA IN MUSIC (SURMALHAR)",
  "DIPLOMA IN NITYAKARMA POOJA PADDATI & ANSUTHAN & KARMAKAND",
  "DIPLOMA IN NITYAKARMA POOJA PADDATI & ANUSTHAN",
  "DIPLOMA IN PHARMACY",
  "DIPLOMA IN VASTU SHASTRA",
  "FELLOWSHIP IN NEUROLOGICAL REHABILITATION",
  "FELLOWSHIP IN PALLIATION CARE & ONCOLOGY REHABILITATION",
  "FELLOWSHIP IN SPORTS REHABILITATION",
  "INTEGERATED B. COM. B. ED. (SPECIAL EDUCATION)",
  "INTEGERATED B. SCI. B.ED. (SPECIAL EDUCATION)",
  "INTEGERATED B.A. B.ED (SPECIAL EDUCATION)",
  "INTEGRATED B.ED.-M.ED. - YEARLY",
  "M.A. EDUCATION",
  "MASTER OF EDUCATION - YEARLY",
  "MASTER OF LAWS",
  "MASTER OF LIBRARY & INFORMATION SCIENCE",
  "MASTER OF PHYSIOTHERAPY",
  "P.G DIPLOMA IN CYBER LAW",
  "P.G DIPLOMA IN GUIDENCE & COUNSELLING",
  "P.G DIPLOMA IN LABOUR LAW",
  "P.G DIPLOMA IN POLICE SCIENCE",
  "P.G DIPLOMA IN YOGA EDUCATION",
  "P.G. DIPLOMA IN HUMAN RESOURCE MANAGEMENT",
  "POST GRADUATE DIPLOMA IN CRIMINAL LAWS AND FORENSIC SCIENCE",
  "POST GRADUATE DIPLOMA IN CYBER LAWS AND FORENSIC SCIENCE",
  "POST GRADUATE DIPLOMA IN G.I.S. & REMOTE SENSING",
  "POST GRADUATE DIPLOMA IN LABOUR WELFARE",
  "POST GRADUATE DIPLOMA IN MENTAL HEALTH & COUNCILING",
  "POST GRADUATE DIPLOMA IN SPORTS COACHING",
  "POST GRADUATE DIPLOMA IN POPULATION STUDIES",
];

export default function NadTransformer() {
  const [inputFileName, setInputFileName] = useState(null);
  const [recordsProcessed, setRecordsProcessed] = useState(null);
  const [firstRecordPreview, setFirstRecordPreview] = useState(null);

  // NEW: selected course
  const [selectedCourse, setSelectedCourse] = useState("");

  // ====== helpers ======
  const DATE_FIELDS = ["DOB", "DOI"]; // only these should be forced to text dates

  const isNumericLike = (x) =>
    typeof x === "number" ||
    (typeof x === "string" && /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(x.trim()));

  // dd-mm-yyyy (zero-padded)
  const fmtDMY_dash = (y, m, d) =>
    `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${String(y).padStart(4, "0")}`;

  function monthIndex(mstr) {
    const s = String(mstr || "").toLowerCase();
    const t = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
      may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
      sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
    };
    return t[s] || null;
  }

  // Parse strings like "2003-06-10", "10/6/2003", "10 Jun 2003", "June 10, 2003"
  function parseYMDFromString(s) {
    if (!s) return null;
    const src = String(s).trim();

    // yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd
    let m = src.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) {
      const y = +m[1], mm = +m[2], dd = +m[3];
      if (y >= 1800 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return { y, m: mm, d: dd };
    }

    // d-m-yyyy / d/m/yyyy / d.m.yyyy  (India: D/M/Y)
    m = src.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      let dd = +m[1], mm = +m[2], y = +m[3];
      if (y < 100) y += (y >= 30 ? 1900 : 2000);
      if (y >= 1800 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return { y, m: mm, d: dd };
    }

    // "10 Jun 2003"
    m = src.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
    if (m) {
      const dd = +m[1], mon = monthIndex(m[2]); let y = +m[3];
      if (y < 100) y += (y >= 30 ? 1900 : 2000);
      if (mon && dd >= 1 && dd <= 31 && y >= 1800) return { y, m: mon, d: dd };
    }

    // "June 10, 2003"
    m = src.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{2,4})$/);
    if (m) {
      const mon = monthIndex(m[1]); const dd = +m[2]; let y = +m[3];
      if (y < 100) y += (y >= 30 ? 1900 : 2000);
      if (mon && dd >= 1 && dd <= 31 && y >= 1800) return { y, m: mon, d: dd };
    }

    return null;
  }

  function readCellText(ws, r, c) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) return "";
    if (typeof cell.w === "string") return cell.w;
    return cell.v == null ? "" : String(cell.v);
  }

  function getHeaderMap(ws) {
    const rows2D = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    const headerRow = rows2D[0] || [];
    const map = {};
    headerRow.forEach((name, idx) => {
      if (typeof name === "string" && name.trim()) map[name.trim()] = idx;
    });
    return { headerRow, rows2D, map };
  }

  // Convert 0..2000 to words (English). Returns null if out of range.
  function numberToWordsUpTo2000(n) {
    if (!Number.isFinite(n)) return null;
    n = Math.round(n);
    if (n < 0 || n > 2000) return null;

    const small = [
      "zero","one","two","three","four","five","six","seven","eight","nine",
      "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
      "seventeen","eighteen","nineteen"
    ];
    const tens = [
      "","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"
    ];

    const twoDigits = (x) => {
      if (x < 20) return small[x];
      const t = Math.floor(x / 10), r = x % 10;
      return r ? `${tens[t]}-${small[r]}` : tens[t];
    };

    const threeDigits = (x) => {
      if (x < 100) return twoDigits(x);
      const h = Math.floor(x / 100), r = x % 100;
      const head = `${small[h]} hundred`;
      if (!r) return head;
      return `${head} ${twoDigits(r)}`;
    };

    if (n < 1000) return threeDigits(n);
    if (n === 1000) return "one thousand";
    if (n < 2000) {
      const r = n - 1000;
      return r ? `one thousand ${threeDigits(r)}` : "one thousand";
    }
    return "two thousand";
  }

  function parseNumberSafe(x) {
    if (x == null) return NaN;
    const s = String(x).replace(/[, ]/g, "").trim();
    return Number(s);
  }

  function toWordsUpper(n) {
    const w = numberToWordsUpTo2000(n);
    return w ? w.toUpperCase() : "";
  }

  // Merge split fields (DD, MM, YYYY) into targetKey in dd-mm-yyyy
  function mergeSplitDateFields(row, {
    targetKey = "DOB",
    ddKey = "DD",
    mmKey = "MM",
    yyyyKey = "YYYY",
  } = {}) {
    const dayRaw = row[ddKey];
    const monRaw = row[mmKey];
    const yrRaw  = row[yyyyKey];

    if (dayRaw == null || monRaw == null || yrRaw == null) return;

    const d = parseInt(String(dayRaw).trim(), 10);
    const m = parseInt(String(monRaw).trim(), 10);
    let y  = parseInt(String(yrRaw).trim(), 10);

    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return;
    if (y < 100) y += (y >= 30 ? 1900 : 2000);

    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1800) {
      row[targetKey] = fmtDMY_dash(y, m, d);
    }
  }

  // Ensure DOB/DOI become dd-mm-yyyy **text**, never numbers
  function getDateText({ ws, sheetRow, col, rowValue, date1904 }) {
    const txt = readCellText(ws, sheetRow, col).trim();
    const primary = txt !== "" ? txt : (rowValue == null ? "" : String(rowValue).trim());

    // Excel serial?
    if (isNumericLike(primary)) {
      const num = Number(primary);
      if (isFinite(num)) {
        const p = XLSX.SSF.parse_date_code(num, { date1904: !!date1904 });
        if (p && p.y && p.m && p.d) return fmtDMY_dash(p.y, p.m, p.d);
      }
    }

    // Recognizable string date?
    const parsed = parseYMDFromString(primary);
    if (parsed) return fmtDMY_dash(parsed.y, parsed.m, parsed.d);

    // Fallback: keep as typed text
    return primary;
  }

  // ====== clean/isPresent ======
  const cleanValue = (val) => {
    if (val == null) return "";
    if (typeof val === "number") {
      if (!Number.isFinite(val)) return "";
      return String(val).trim();
    }
    const s = String(val).trim();
    return s === "" || s.toLowerCase() === "nan" ? "" : s;
  };

  const isPresent = (val) => {
    if (val === undefined || val === null) return false;
    if (typeof val === "number" && Number.isNaN(val)) return false;
    const s = String(val).trim();
    return s !== "";
  };

  // Return the first present value among possible column names (EA/ME, IA/EI/MI)
  const pickFirst = (row, names) => {
    for (const k of names) {
      if (isPresent(row[k])) return cleanValue(row[k]);
    }
    return "";
  };

  // ====== file handling ======
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setInputFileName(f.name);
    setRecordsProcessed(null);
    setFirstRecordPreview(null);
  };

  const downloadCSV = (csvString, outFilename) => {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Parse file to JSON but **normalize DOB/DOI** using sheet-level info (Excel serial → text)
  const parseFileToJson = (file) =>
    new Promise((resolve, reject) => {
      const filename = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onerror = (err) => reject(err);

      // CSV path — normalize DOB/DOI strings (no serials here, but unify format)
      if (filename.endsWith(".csv")) {
        reader.onload = (evt) => {
          try {
            const text = evt.target.result;
            const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
            const rows = parsed.data || [];
            const out = rows.map((r) => {
              const o = { ...r };

              // Merge plain split headers: DD/MM/YYYY -> DOB
              mergeSplitDateFields(o, { targetKey: "DOB", ddKey: "DD", mmKey: "MM", yyyyKey: "YYYY" });

              // Merge prefixed variants -> DOB/DOI
              mergeSplitDateFields(o, { targetKey: "DOB", ddKey: "DOB_DD", mmKey: "DOB_MM", yyyyKey: "DOB_YYYY" });
              mergeSplitDateFields(o, { targetKey: "DOI", ddKey: "DOI_DD", mmKey: "DOI_MM", yyyyKey: "DOI_YYYY" });

              // Normalize existing date strings to dd-mm-yyyy (if parseable)
              for (const key of DATE_FIELDS) {
                if (key in o && o[key] != null) {
                  const val = String(o[key]).trim();
                  const alreadyDash = /^\d{2}-\d{2}-\d{4}$/.test(val);
                  if (!alreadyDash) {
                    const p = parseYMDFromString(val);
                    if (p) o[key] = fmtDMY_dash(p.y, p.m, p.d);
                  }
                }
              }
              return o;
            });
            resolve(out);
          } catch (e) {
            reject(e);
          }
        };
        reader.readAsText(file);
        return;
      }

      // XLSX/XLS path — use ws cellText and SSF to safely convert date serials
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, {
            type: "binary",
            cellDates: false,
            cellNF: false,
            cellText: true, // populate cell.w with display text
          });

          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];

          const { map: headerMap } = getHeaderMap(ws);
          const date1904 = !!(wb?.Workbook?.WBProps?.date1904);

          // raw rows (we will override DOB/DOI fields below)
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

          // sheetRow index for first data row (0 = header, so start at 1)
          const firstDataR = 1;

          const out = rows.map((r, i) => {
            const obj = { ...r };
            const sheetRow = firstDataR + i;

            // Merge plain split headers: DD/MM/YYYY -> DOB
            mergeSplitDateFields(obj, { targetKey: "DOB", ddKey: "DD", mmKey: "MM", yyyyKey: "YYYY" });

            // Merge prefixed variants -> DOB/DOI
            mergeSplitDateFields(obj, { targetKey: "DOB", ddKey: "DOB_DD", mmKey: "DOB_MM", yyyyKey: "DOB_YYYY" });
            mergeSplitDateFields(obj, { targetKey: "DOI", ddKey: "DOI_DD", mmKey: "DOI_MM", yyyyKey: "DOI_YYYY" });

            // Now override using precise sheet text/serial, unless already merged to dash
            for (const key of DATE_FIELDS) {
              if (headerMap[key] != null) {
                const alreadyMerged = typeof obj[key] === "string" && /^\d{2}-\d{2}-\d{4}$/.test(obj[key]);
                if (!alreadyMerged) {
                  const col = headerMap[key];
                  obj[key] = getDateText({
                    ws,
                    sheetRow,
                    col,
                    rowValue: r[key] ?? "",
                    date1904,
                  });
                  // Ensure dash format if parser produced something else
                  const p = parseYMDFromString(obj[key]);
                  if (p) obj[key] = fmtDMY_dash(p.y, p.m, p.d);
                }
              }
            }
            return obj;
          });

          resolve(out);
        } catch (e) {
          reject(e);
        }
      };

      reader.readAsBinaryString(file);
    });

  // ====== your transform logic (with EA/ME, IA/EI/MI) ======
  const transformRow = (row) => {
    const nad_row = {};

    // AI Details - Mandatory
    nad_row["ORG_NAME"] = cleanValue(row["ORG_NAME"]);

    // Course Details - Mandatory
    nad_row["ACADEMIC_COURSE_ID"] = cleanValue(row["ACADEMIC_COURSE_ID"]);
    // nad_row["ACADEMIC_COURSE_ID"] = '';

    // IMPORTANT: override COURSE_NAME with selectedCourse
    nad_row["COURSE_NAME"] = selectedCourse || cleanValue(row["COURSE_NAME"]);

    nad_row["ADMISSION_YEAR"] = cleanValue(row["ADMISSION_YEAR"]);
    nad_row["STREAM"] = cleanValue(row["STREAM"]);
    nad_row["BATCH"] = cleanValue(row["BATCH"]);
    // nad_row["ABC_ACCOUNT_ID"] = cleanValue(row["ABC_ACCOUNT_ID"] || row["ABCID"]);

    nad_row["ABC_ACCOUNT_ID"] = '';
    
    nad_row["SESSION"] = cleanValue(row["SESSION"]);

    // Student Details - Mandatory
    nad_row["REGN_NO"] = cleanValue(row["ENO"] || row["REGN_NO"]);
    nad_row["RROLL"] = cleanValue(row["RNO"] || row["RROLL"]);
    nad_row["CNAME"] = cleanValue(row["NAME"] || row["CNAME"]);
    nad_row["AADHAAR_NAME"] = cleanValue(row["AADHAAR_NAME"]);
    nad_row["DOB"] = cleanValue(row["DOB"]); // already normalized
    nad_row["GENDER"] = cleanValue(row["SEX"] || row["GENDER"]);

    // Student Details - Optional
    nad_row["CASTE"] = cleanValue(row["CAST"] || row["CASTE"]);
    nad_row["CATEGORY"] = cleanValue(row["CAT"]);
    nad_row["FNAME"] = cleanValue(row["FNAME"]);
    nad_row["MNAME"] = cleanValue(row["MNAME"]);

    // Exam Details
    nad_row["MRKS_REC_STATUS"] = cleanValue(row["MRKS_REC_STATUS"] || "O");
    nad_row["YEAR"] = cleanValue(row["YEAR"]);
    nad_row["MONTH"] = cleanValue(row["MONTH"]);
    nad_row["RESULT"] = cleanValue(row["RESULT"]);
    nad_row["RESULT_TH"] = cleanValue(row["TRES"]);
    nad_row["RESULT_PR"] = cleanValue(row["PRES"]);
    nad_row["DOI"] = cleanValue(row["DOI"]); // already normalized
    nad_row["REMARKS"] = cleanValue(row["REMARKS"]);
    nad_row["CENTRE_NAME"] = cleanValue(row["EXAM_CENTRE"]);
    nad_row["EXAM_TYPE"] = cleanValue(row["EXAM_TYPE"]);

    // Totals
    nad_row["TOT"] = cleanValue(row["GTOT_MAX"] || row["TOT"]);
    nad_row["TOT_MRKS"] = cleanValue(row["GTOT"]);
    nad_row["TOT_TH_MRKS"] = cleanValue(row["TTOT"]);
    nad_row["TOT_PR_MRKS"] = cleanValue(row["PTOT"]);
    nad_row["GRAND_TOT_MAX"] = cleanValue(row["GGTOT_MAX"]);
    nad_row["GRAND_TOT_MRKS"] = cleanValue(row["GGTOT"]);
    nad_row["DIVISION"] = cleanValue(row["DIV"]);

    // Words for total marks
    {
      const totRaw = cleanValue(row["TOT_MRKS"]) || cleanValue(row["GTOT"]);
      const totNum = parseNumberSafe(totRaw);
      if (totRaw !== "" && Number.isFinite(totNum) && totNum >= 0 && totNum <= 2000) {
        nad_row["TOT_MRKS_WRDS"] = toWordsUpper(totNum);
      } else {
        nad_row["TOT_MRKS_WRDS"] = totRaw;
      }
    }

    const termType =
    cleanValue(row["TERM_TYPE"]) || cleanValue(row["TERM TYPE"]); 

    nad_row["TERM_TYPE"] = termType || "ANNUAL";

    // Term Type - default
    // nad_row["TERM_TYPE"] = "ANNUAL";

    let subject_counter = 1;

    // --- COD1..COD20 (theory) ---
    for (let i = 1; i <= 20; i++) {
      const code_col = `COD${i}`;
      const name_col = `SUB${i}`;

      const sub_code = cleanValue(row[code_col]);
      const sub_name = cleanValue(row[name_col]);

      if (!isPresent(sub_code) && !isPresent(sub_name)) continue;

      const prefix = `SUB${subject_counter}`;
      nad_row[`${prefix}NM`] = sub_name;
      nad_row[`${prefix}`] = sub_code;

      const t_col = `T${i}`;
      const t_max_col = `T${i}_MAX`;
      const t_min_col = `T${i}_MIN`;
      const tp_col = `TP${i}`;
      const tp_max_col = `TP${i}_MAX`;
      const tp_min_col = `TP${i}_MIN`;
      const grace = `G${i}`;

      const has_ea_like = isPresent(row[`EA${i}`]) || isPresent(row[`ME${i}`]);
      const ea_like_val = pickFirst(row, [`EA${i}`, `ME${i}`]);

      const has_ia_like = isPresent(row[`IA${i}`]) || isPresent(row[`EI${i}`]) || isPresent(row[`MI${i}`]);
      const ia_like_val = pickFirst(row, [`IA${i}`, `EI${i}`, `MI${i}`]);

      if (has_ea_like) {
        if (isPresent(row[t_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[t_max_col]);
        if (isPresent(row[t_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[t_min_col]);

        nad_row[`${prefix}_TH_MRKS`] = ea_like_val;
        if (has_ia_like) nad_row[`${prefix}_CE_MRKS`] = ia_like_val;
        if (isPresent(row[t_col])) nad_row[`${prefix}_TOT`] = cleanValue(row[t_col]);
      } else if (isPresent(row[tp_col])) {
        if (isPresent(row[tp_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[tp_max_col]);
        if (isPresent(row[tp_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[tp_min_col]);
        nad_row[`${prefix}_TOT`] = cleanValue(row[tp_col]);
      } else if (isPresent(row[t_col])) {
        if (isPresent(row[t_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[t_max_col]);
        if (isPresent(row[t_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[t_min_col]);
        nad_row[`${prefix}_TOT`] = cleanValue(row[t_col]);
      }
      nad_row[`${prefix}_REMARKS`] = cleanValue(row[grace]);

      subject_counter++;
    }

    // --- CODP1..CODP20 (practical) ---
    for (let i = 1; i <= 20; i++) {
      const code_col = `CODP${i}`;
      const name_col = `SUBP${i}`;

      const sub_code = cleanValue(row[code_col]);
      const sub_name = cleanValue(row[name_col]);

      if (!isPresent(sub_code) && !isPresent(sub_name)) continue;

      const prefix = `SUB${subject_counter}`;
      nad_row[`${prefix}NM`] = sub_name;
      nad_row[`${prefix}`] = sub_code;

      const eap_col = `EAP${i}`;
      const eap_max_col = `EAP${i}_MAX`;
      const eap_min_col = `EAP${i}_MIN`;
      const iap_col = `IAP${i}`;
      const iap_max_col = `IAP${i}_MAX`;
      const iap_min_col = `IAP${i}_MIN`;
      const prp_col = `PRP${i}`;
      const prp_max_col = `PRP${i}_MAX`;
      const prp_min_col = `PRP${i}_MIN`;
      const p_col = `P${i}`;
      const p_max_col = `P${i}_MAX`;
      const p_min_col = `P${i}_MIN`;
      const tp_col = `TP${i}`;
      const tp_max_col = `TP${i}_MAX`;
      const tp_min_col = `TP${i}_MIN`;

      const has_dissertation_pattern =
        isPresent(row[eap_col]) && isPresent(row[iap_col]) && isPresent(row[prp_col]);

      if (has_dissertation_pattern) {
        nad_row[`${prefix}_TH_MRKS`] = cleanValue(row[eap_col]);
        nad_row[`${prefix}_CE_MRKS`] = cleanValue(row[iap_col]);
        nad_row[`${prefix}_PR_MRKS`] = cleanValue(row[prp_col]);

        if (isPresent(row[eap_max_col])) nad_row[`${prefix}_TH_MAX`] = cleanValue(row[eap_max_col]);
        if (isPresent(row[eap_min_col])) nad_row[`${prefix}_TH_MIN`] = cleanValue(row[eap_min_col]);
        if (isPresent(row[iap_max_col])) nad_row[`${prefix}_CE_MAX`] = cleanValue(row[iap_max_col]);
        if (isPresent(row[iap_min_col])) nad_row[`${prefix}_CE_MIN`] = cleanValue(row[iap_min_col]);
        if (isPresent(row[prp_max_col])) nad_row[`${prefix}_PR_MAX`] = cleanValue(row[prp_max_col]);
        if (isPresent(row[prp_min_col])) nad_row[`${prefix}_PR_MIN`] = cleanValue(row[prp_min_col]);

        if (isPresent(row[tp_col])) {
          nad_row[`${prefix}_TOT`] = cleanValue(row[tp_col]);
          if (isPresent(row[tp_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[tp_max_col]);
          if (isPresent(row[tp_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[tp_min_col]);
        }
      } else {
        if (isPresent(row[eap_col])) {
          nad_row[`${prefix}_TH_MRKS`] = cleanValue(row[eap_col]);
          if (isPresent(row[iap_col])) nad_row[`${prefix}_CE_MRKS`] = cleanValue(row[iap_col]);

          if (isPresent(row[eap_max_col])) nad_row[`${prefix}_TH_MAX`] = cleanValue(row[eap_max_col]);
          if (isPresent(row[eap_min_col])) nad_row[`${prefix}_CE_MAX`] = cleanValue(row[iap_max_col]); // (kept your original line)
          if (isPresent(row[iap_min_col])) nad_row[`${prefix}_CE_MIN`] = cleanValue(row[iap_min_col]);
        }

        if (isPresent(row[p_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[p_max_col]);
        if (isPresent(row[p_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[p_min_col]);

        if (isPresent(row[tp_col])) {
          nad_row[`${prefix}_TOT`] = cleanValue(row[tp_col]);
          if (isPresent(row[tp_max_col])) nad_row[`${prefix}MAX`] = cleanValue(row[tp_max_col]);
          if (isPresent(row[tp_min_col])) nad_row[`${prefix}MIN`] = cleanValue(row[tp_min_col]);
        } else if (isPresent(row[p_col])) {
          nad_row[`${prefix}_TOT`] = cleanValue(row[p_col]);
        }
      }

      subject_counter++;
    }

    // --- (cases like bhms) ---
    for (let i = 1; i <= 20; i++) {
      const code_col = `CODTP${i}`;
      const name_col = `SUBTP${i}`;

      const sub_code = cleanValue(row[code_col]);
      const sub_name = cleanValue(row[name_col]);

      if (!isPresent(sub_code) && !isPresent(sub_name)) continue;

      const prefix = `SUB${subject_counter}`;
      nad_row[`${prefix}NM`] = sub_name;
      nad_row[`${prefix}`] = sub_code;

      const t_col = `T${i}`;
      const t_max_col = `T${i}_MAX`;
      const tp_col = `P${i}`;
      const tt_col = `TT${i}`;
      const grace = `G${i}`;

      nad_row[`${prefix}MAX`] = cleanValue(row[t_max_col]);
      nad_row[`${prefix}_TH_MRKS`] = cleanValue(row[tt_col]);
      nad_row[`${prefix}_PR_MRKS`] = cleanValue(row[tp_col]);
      nad_row[`${prefix}_REMARKS`] = cleanValue(row[grace]);
      nad_row[`${prefix}_TOT`] = cleanValue(row[t_col]);

      subject_counter++;
    }
    return nad_row;
  };

  const handleTransform = async (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    const inputEl = document.getElementById("nad-input-file");
    const actualFile = file || (inputEl ? inputEl.files[0] : null);

    if (!actualFile) {
      alert("Please select a .csv, .xlsx or .xls file first.");
      return;
    }

    if (!selectedCourse) {
      alert("Please select a Course Name before transforming.");
      return;
    }

    try {
      const jsonRows = await parseFileToJson(actualFile); // <-- DOB/DOI fixed here
      const outputData = [];
      for (let i = 0; i < jsonRows.length; i++) {
        const transformed = transformRow(jsonRows[i]);
        outputData.push(transformed);
      }

      const csv = Papa.unparse(outputData, { quotes: false, delimiter: "," });
      const outFilename = actualFile.name.replace(/\.(xlsx|xls|csv)$/i, "_op.csv");
      downloadCSV(csv, outFilename);

      setRecordsProcessed(outputData.length);
      setFirstRecordPreview(outputData.length > 0 ? outputData[0] : null);
    } catch (err) {
      console.error("Error transforming file:", err);
      alert("Error processing file. Check console for details.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">NAD Format Transformer (React)</h2>

      {/* NEW: Course dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Select Course (will be used as COURSE_NAME for all records)
        </label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">-- Select Course --</option>
          {COURSE_OPTIONS.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Whatever you choose here will override COURSE_NAME in the output CSV.
        </p>
      </div>

      <div className="mb-4">
        <input
          id="nad-input-file"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={(evt) => handleTransform(evt)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Transform &amp; Download CSV
        </button>
        <div className="flex items-center text-sm text-gray-600">
          {inputFileName ? (
            <span>
              Selected: <strong>{inputFileName}</strong>
            </span>
          ) : (
            <span>No file selected</span>
          )}
        </div>
      </div>

      {recordsProcessed !== null && (
        <div className="mb-4">
          <strong>Processed:</strong> {recordsProcessed} record(s). The CSV was downloaded automatically.
        </div>
      )}

      {firstRecordPreview && (
        <div>
          <h4 className="font-medium mb-2">First transformed record preview</h4>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: "360px",
              overflow: "auto",
              background: "#f8f8f8",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            {JSON.stringify(firstRecordPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
