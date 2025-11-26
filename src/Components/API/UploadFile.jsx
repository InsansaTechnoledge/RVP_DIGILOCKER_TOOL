
import React, { useState } from "react";
import axios from "axios";

const UploadFile = ({ authToken }) => {
    const [yearOfExamination, setYearOfExamination] = useState("");
    const [docType, setDocType] = useState("");
    const [institutionType] = useState("University");
    const [zipFile, setZipFile] = useState(null);
  
    const [error, setError] = useState(null);
    const [uploadResponse, setUploadResponse] = useState(null);
    const [loading, setLoading] = useState(false);
  
    const hasAuthToken = typeof authToken === "string" && authToken.trim().length > 0;
  
    const handleUpload = async () => {
      setError(null);
      setUploadResponse(null);
  
      if (!hasAuthToken) {
        setError("Auth token is missing. Please generate token first.");
        return;
      }
  
      if (!zipFile || !docType || !yearOfExamination) {
        setError("Please fill all fields and select a ZIP file.");
        return;
      }
  
      try {
        setLoading(true);
  
        const formData = new FormData();
        formData.append("year_of_exam", yearOfExamination);
        formData.append("doc_type", docType);
        formData.append("institution_type", institutionType);
        formData.append("userfile", zipFile);
  
        const res = await axios.post(
          "https://nadapi.digilocker.gov.in/v1/uploadFileRecords",
          formData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`, 
            },
          }
        );
  
        setUploadResponse(res.data);
      } catch (e) {
        const server = e.response?.data;
        if (server?.status === "Token is Expired") {
          setError("Token is expired. Please generate a new token and try again.");
        } else {
          setError(
            server?.message ||
              server?.status ||
              e.message ||
              "Upload failed. Please check inputs and try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };
  
    const isDisabled =
      !zipFile || !docType || !yearOfExamination || !hasAuthToken || loading;
  
    return (
      <div className="p-8">
        <p>
          authToken :{" "}
          <span className={hasAuthToken ? "text-green-600" : "text-red-600"}>
            {hasAuthToken ? "Token exists" : "Generate auth token"}
          </span>
        </p>
  
        <div className="mx-auto border border-gray-400/30 rounded-2xl shadow-2xl mt-10 max-w-6xl ">
          <h1 className="text-3xl font-bold text-center py-4">Data Upload</h1>
  
          <div className="flex flex-col gap-6 p-4">
            {/* ZIP file input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Upload ZIP file
              </label>
  
              <label
                htmlFor="zipFile"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md
                           bg-indigo-600 text-white text-sm font-medium
                           shadow-sm cursor-pointer
                           hover:bg-indigo-700 focus:outline-none focus:ring-2
                           focus:ring-indigo-500 focus:ring-offset-2"
              >
                Choose file
              </label>
  
              <input
                id="zipFile"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              />
  
              {zipFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {zipFile.name}
                </p>
              )}
            </div>
  
            {/* Doc type */}
            <div className="flex flex-col gap-2">
              <label>Choose Doc type</label>
              <select
                className="border px-4 py-2 rounded-md border-gray-500/40 text-gray-700"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="">---select type---</option>
                <option value="DGMST">DGMST</option>
                <option value="DGCER">DGCER</option>
              </select>
            </div>
  
            {/* Year of exam */}
            <div className="flex flex-col gap-2">
              <label>Year of Exam</label>
              <input
                type="text"
                placeholder="2021"
                value={yearOfExamination}
                onChange={(e) => setYearOfExamination(e.target.value)}
                className="border px-4 py-2 rounded-md border-gray-500/40 text-gray-700"
              />
            </div>
  
            {/* Institution type */}
            <div className="flex flex-col gap-2">
              <label>Institution Type</label>
              <input
                type="text"
                value={institutionType}
                readOnly
                className="border px-4 py-2 rounded-md border-gray-500/40 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
  
          <div className="p-4 flex flex-col gap-3">
            <button
              onClick={handleUpload}
              disabled={isDisabled}
              className="bg-green-600 rounded-md text-md text-gray-100 py-2 px-3 
                         hover:scale-105 disabled:bg-gray-400 disabled:text-red-500 
                         disabled:scale-100 transition-transform"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
  
            {error && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}
  
            {uploadResponse && (
              <pre className="mt-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-800 max-h-60 overflow-auto">
                {JSON.stringify(uploadResponse, null, 2)}
              </pre>
            )}
            {
              uploadResponse && (
                <p>Tracking Id: {uploadResponse.tracking_id}</p>
              )
            }
          </div>
        </div>
      </div>
    );
  };
  

export default UploadFile
