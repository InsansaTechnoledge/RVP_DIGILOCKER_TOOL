import React, { useState } from "react";
import ExcelUploadSection from "./ExcelUploadSection";
import { parseAndTrimExcel } from "../utils/excelTrimHelper";

const DegreeConvertor = ({
  degreeFile,
  degreeData,
  setDegreeFile,
  setDegreeData,
}) => {
  
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("degree.xlsx");
  const [error, setError] = useState("");

  const handleFileUpload = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDegreeFile?.(file);
      const { rows, blobUrl, downloadName } = await parseAndTrimExcel(file);
      setDegreeData?.(rows);
      setDownloadUrl(blobUrl);
      setDownloadName(downloadName);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process file.");
      setDegreeFile?.(null);
      setDegreeData?.([]);
      setDownloadUrl(null);
    }
  };

  return (
    <div>
      <div className="upload-section">
        <h2 className="secondary-heading mb-2">Upload Excel File</h2>
        <p className="file-info">
          Select a file to upload and process. Supported formats: CSV, XLS, XLSX
        </p>
      </div>

      <ExcelUploadSection handleFileUpload={handleFileUpload} />

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {degreeData?.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-700">
            Trimmed rows: <strong>{degreeData.length}</strong>
          </p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-block mt-2 rounded px-3 py-2 bg-indigo-600 text-white"
            >
              Download {downloadName}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default DegreeConvertor;
