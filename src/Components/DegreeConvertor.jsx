import React, { useEffect, useState } from "react";
import ExcelUploadSection from "./ExcelUploadSection";
import { parseAndTrimExcel } from "../utils/excelTrimHelper";

const DegreeConvertor = ({
  degreeFile,
  degreeData,
  setDegreeFile,
  setDegreeData,
}) => {
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("degree_trimmed.zip");
  const [error, setError] = useState("");

  // Revoke object URLs when they change / on unmount to avoid leaks
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFileUpload = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDegreeFile?.(file);

      // Ask helper to produce ZIP (CSV inside)
      const { rows, blobUrl, downloadName: outName } = await parseAndTrimExcel(file, {
        archive: "zip",
      });

      setDegreeData?.(rows);

      // Revoke previous URL if any
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);

      setDownloadUrl(blobUrl);
      setDownloadName(outName || "degree_trimmed.zip");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process file.");
      setDegreeFile?.(null);
      setDegreeData?.([]);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
      setDownloadName("degree_trimmed.zip");
    }
  };

  return (
    <div>
      <div className="upload-section">
        <h2 className="secondary-heading mb-2">Upload Excel File</h2>
        <p className="file-info">
          Supported formats: <strong>CSV, XLS, XLSX</strong>. Output will be a{" "}
          <strong>.zip</strong> containing a trimmed <strong>.csv</strong> with{" "}
          <code>DOB</code> and <code>DOI</code> as <strong>DD/MM/YYYY</strong> text.
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
