import React, { useState } from "react";
import axios from "axios";

export const TrackingID = ({ authToken }) => {
    const [trackingId, setTrackingId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusResponse, setStatusResponse] = useState(null);
  
    const hasAuthToken =
      typeof authToken === "string" && authToken.trim().length > 0;
  
    const handleCheckStatus = async () => {
      setError(null);
      setStatusResponse(null);
  
      if (!hasAuthToken) {
        setError("Auth token is missing. Please generate token first.");
        return;
      }
  
      if (!trackingId.trim()) {
        setError("Please enter a Tracking ID.");
        return;
      }
  
      try {
        setLoading(true);
  
        const url = `https://nadapi.digilocker.gov.in/v1/status/tracking_id/${encodeURIComponent(
          trackingId.trim()
        )}`;
  
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
  
        // Handle token-expired shape:
        // { "status": "Token is Expired" }
        if (res.data && res.data.status === "Token is Expired") {
          setError("Token is expired. Please generate a new token and try again.");
          return;
        }
  
        setStatusResponse(res.data);
      } catch (e) {
        console.error("Status check error:", e.response?.data || e.message);
        const server = e.response?.data;
        if (server?.status === "Token is Expired") {
          setError("Token is expired. Please generate a new token and try again.");
        } else {
          setError(
            server?.message ||
              server?.status ||
              e.message ||
              "Failed to fetch status. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };
  
    // Small helper for status badge color
    const getStatusBadgeClasses = (status, message) => {
      const s = (status || "").toLowerCase();
      const m = (message || "").toLowerCase();
  
      if (s === "pending") {
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      }
  
      if (s === "completed") {
        if (m.includes("failed")) {
          return "bg-red-100 text-red-800 border border-red-200";
        }
        if (m.includes("pending for verification")) {
          return "bg-blue-100 text-blue-800 border border-blue-200";
        }
        if (m.includes("in process")) {
          return "bg-green-100 text-green-800 border border-green-200";
        }
        return "bg-gray-100 text-gray-800 border border-gray-200";
      }
  
      return "bg-gray-100 text-gray-800 border border-gray-200";
    };
  
    const data = statusResponse?.data;
    const fileStatus = data?.file_status;
    const fileMessage = fileStatus?.message;
    const badgeClasses = getStatusBadgeClasses(data?.status, fileMessage);
  
    return (
      <div className="p-8">
        <p className="mb-2">
          authToken :{" "}
          <span className={hasAuthToken ? "text-green-600" : "text-red-600"}>
            {hasAuthToken ? "Token exists" : "Generate auth token"}
          </span>
        </p>
  
        <div className="mx-auto border border-gray-400/30 rounded-2xl shadow-2xl mt-6 max-w-6xl">
          <h1 className="text-3xl font-bold text-center py-4">Track Your File</h1>
  
          <div className="p-6 flex flex-col gap-4">
            {/* Tracking ID input */}
            <div className="flex flex-col gap-2 max-w-xl">
              <label className="text-sm font-medium text-gray-700">
                Tracking ID
              </label>
              <input
                type="text"
                placeholder="Enter tracking_id returned from upload API"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="border px-4 py-2 rounded-md border-gray-500/40 text-gray-700"
              />
              <p className="text-xs text-gray-500">
                Example: <code>ab3aa13440b05653cc801db06d5ef280</code>
              </p>
            </div>
  
            {/* Action button */}
            <div>
              <button
                onClick={handleCheckStatus}
                disabled={!trackingId.trim() || !hasAuthToken || loading}
                className="bg-indigo-600 rounded-md text-sm md:text-base text-gray-100 py-2 px-4
                           hover:scale-105 disabled:bg-gray-400 disabled:text-red-500
                           disabled:scale-100 transition-transform"
              >
                {loading ? "Checking..." : "Check Status"}
              </button>
            </div>
  
            {/* Error box */}
            {error && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 max-w-xl">
                <strong>Error:</strong> {error}
              </div>
            )}
  
            {/* Status result */}
            {statusResponse && !error && (
              <div className="mt-4 max-w-3xl">
                <h2 className="text-lg font-semibold mb-2">Status Details</h2>
  
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Tracking ID
                      </p>
                      <p className="text-sm font-mono text-gray-800 break-all">
                        {data?.tracking_id || trackingId}
                      </p>
                    </div>
  
                    <div>
                      <span
                        className={
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                          badgeClasses
                        }
                      >
                        {data?.status
                          ? data.status.charAt(0).toUpperCase() +
                            data.status.slice(1)
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
  
                  {/* Message */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Message
                    </p>
                    <p className="text-sm text-gray-800">
                      {fileMessage || "No file status message provided."}
                    </p>
                  </div>
  
                  {/* Counts if present */}
                  {fileStatus && typeof fileStatus.total_records !== "undefined" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
                      <div className="rounded-md bg-gray-50 border border-gray-200 p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Total Records
                        </p>
                        <p className="text-base font-semibold text-gray-800">
                          {fileStatus.total_records}
                        </p>
                      </div>
                      <div className="rounded-md bg-gray-50 border border-gray-200 p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Processed
                        </p>
                        <p className="text-base font-semibold text-gray-800">
                          {fileStatus.processed_records}
                        </p>
                      </div>
                      <div className="rounded-md bg-gray-50 border border-gray-200 p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Failed
                        </p>
                        <p className="text-base font-semibold text-gray-800">
                          {fileStatus.failed_records}
                        </p>
                      </div>
                    </div>
                  )}
  
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-gray-500">
                      View raw response
                    </summary>
                    <pre className="mt-2 text-[11px] bg-gray-50 border border-gray-200 rounded-md p-2 max-h-64 overflow-auto">
                      {JSON.stringify(statusResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  