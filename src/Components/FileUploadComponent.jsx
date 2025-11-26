import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import ToastComponent from './ToastComponent';
import ExcelPreviewSection from './ExcelPreviewSection';
import ExcelUploadSection from './ExcelUploadSection';

import { courses } from '../constants';

const API_BASE_URL = 'https://backend.rvpuni.in';

const baseName = (name) => name.replace(/\.[^/.]+$/, '');


const FileUploadComponent = ({ 
  file, setFile, data, setData, course, 
  viewUploadedData, setViewUploadedData, Toast, showToast, errors, setErrors
}) => {
  const [loading, setLoading] = useState(false);

  // ---------- helpers ----------
  const getTermTypeForCourse = (courseName) => {
    const c = courses.find((x) => x.name === courseName);
    return (c?.TERM_TYPE || 'Semester'); // default fallback if you need it elsewhere
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedExtension = ['csv', 'xls', 'xlsx'];
    const currentExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (!allowedExtension.includes(currentExtension)) {
      Toast('File type not supported. Please upload CSV, XLS, or XLSX.', 'error');
      e.target.value = '';
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const binarystr = ev.target.result;
      const workbook = XLSX.read(binarystr, { type: 'binary' });
      const worksheetName = workbook.SheetNames[0];
      const workSheet = workbook.Sheets[worksheetName];
      // AoA so we preserve raw headers/ordering
      const aoa = XLSX.utils.sheet_to_json(workSheet, { header: 1, defval: '', raw: false });
      setData(aoa);
      setViewUploadedData(true);
    };

    reader.readAsBinaryString(selectedFile);
  };

  // === ALWAYS-CSV downloader (append TERM_TYPE only if missing) ===
  // === ALWAYS-CSV downloader (append TERM_TYPE only if missing) ===
  const downloadFromResponse = async (
    res,
    inputFileNameBase = 'result',          // <— NEW: base name to keep same as input
    termTypeValue = 'Annual'
  ) => {
    const contentType = res?.headers?.['content-type'] || 'application/octet-stream';
    const inBlob = new Blob([res.data], { type: contentType });

    // Read whatever came back (xlsx/csv) into AoA
    let aoa;
    try {
      if (/csv/i.test(contentType)) {
        const text = await inBlob.text();
        const wb = XLSX.read(text, { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      } else {
        const buf = await inBlob.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }
    } catch {
      // Fallback: just download whatever came
      const a0 = document.createElement('a');
      const u0 = URL.createObjectURL(inBlob);
      a0.href = u0; a0.download = `${inputFileNameBase}.csv`;  // keep same base
      document.body.appendChild(a0); a0.click(); a0.remove();
      URL.revokeObjectURL(u0);
      return;
    }

    if (!Array.isArray(aoa) || aoa.length === 0) {
      const blob = new Blob(['\uFEFF'], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${inputFileNameBase}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    // Check & add TERM_TYPE only if missing
    const headers = aoa[0].map(h => String(h || '').trim());
    const hasTermType = headers.some(h => h.toUpperCase() === 'TERM_TYPE');
    if (!hasTermType) {
      aoa[0].push('TERM_TYPE');
      for (let r = 1; r < aoa.length; r++) {
        aoa[r] = Array.isArray(aoa[r]) ? aoa[r] : [];
        aoa[r].push(termTypeValue);
      }
    }

    // ALWAYS export CSV (with UTF-8 BOM for Excel)
    const wsOut = XLSX.utils.aoa_to_sheet(aoa);
    const csv = XLSX.utils.sheet_to_csv(wsOut);
    const outBlob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

    // IMPORTANT: keep the SAME base name as input, no suffixes
    const outName = `${inputFileNameBase}.csv`;

    const url = URL.createObjectURL(outBlob);
    const a = document.createElement('a');
    a.href = url; a.download = outName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    // Update preview in UI
    try {
      const text = await outBlob.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const previewAoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      setData(previewAoa);
      setViewUploadedData(true);
    } catch {}
  };


  const uploadFile = async () => {
    setLoading(true);
    try {
      if (!course) { 
        Toast('No course selected', 'error'); 
        return; 
      }
      if (!file) { 
        Toast('No file selected', 'error'); 
        return; 
      }
      if (errors.length) { 
        Toast('Please fix the errors before uploading.', 'error'); 
        return; 
      }

      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('course', course);

      const res = await axios.post(
        `${API_BASE_URL}/transform`,
        formData,
        {
          responseType: 'blob',
          headers: {
            Accept: 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
      );

      const ct = res?.headers?.['content-type'] || '';
      if (ct.includes('application/json')) {
        const txt = await res.data.text();
        const json = JSON.parse(txt);
        throw new Error(json?.message || 'Server returned JSON instead of a file');
      }

      await downloadFromResponse(
        res, 
        baseName(file.name),                 // keep same base name as input
        getTermTypeForCourse(course)
      );
            Toast(`Successfully uploaded: ${file.name}`, 'success');
    } catch (e) {
      setErrors(prev => [...prev, `Upload failed: ${e.message || 'Unknown error'}`]);
      Toast(`Upload failed: ${e.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className='file-upload-container'>
      {/* Header Section */}
      <div className='upload-section'>
        <h2 className='secondary-heading mb-2'>Upload Excel File</h2>
        <p className='file-info'>
          Select a file to upload and process. Supported formats: CSV, XLS, XLSX
        </p>
      </div>

      {/* File Input Section */}
      <ExcelUploadSection handleFileUpload={handleFileUpload}/>

      {/* File Selected Status */}
      {file && (
        <div className='file-selected'>
          <svg className='w-4 h-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 011.414 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293z' clipRule='evenodd' />
          </svg>
          <span>Selected: {file.name}</span>
          <span className='text-xs text-gray-400'>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <div className='error-container'>
          <div className='flex items-center space-x-2 mb-2'>
            <svg className='w-5 h-5 text-red-500' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.5v4a.75.75 0 001.5 0v-4a.75.75 0 10-1.5 0zm.75 6a1 1 0 100-2 1 1 0 000 2z' />
            </svg>
            <span className='font-medium'>Validation Errors:</span>
          </div>
          <ul className='error-list'>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Button */}
      <div className='upload-section'>
        <button 
          disabled={!file || loading || errors.length > 0} 
          onClick={uploadFile} 
          className={`primary-button ${(loading || errors.length > 0) && 'cursor-not-allowed opacity-50'}`}
        >
          <div className='flex items-center space-x-2'>
            {loading && <div className='loading-spinner'></div>}
            <span>{loading ? 'Uploading...' : 'Upload File'}</span>
          </div>
        </button>
      </div>

      {/* View Data Toggle */}
      {data && (
        <button 
          className='dropdown-button text-left' 
          onClick={() => setViewUploadedData((prev) => !prev)}
        >
          <div className='flex items-center space-x-2'>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${viewUploadedData ? 'rotate-90' : ''}`}
              fill='currentColor' 
              viewBox='0 0 20 20'
            >
              <path d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' />
            </svg>
            <span>
              {viewUploadedData ? 'Hide Data Preview' : 'Show Data Preview'}
              {Array.isArray(data) && data.length > 0 && ` (${data.length - 1} rows)`}
            </span>
          </div>
        </button>
      )}

      {/* Data Preview */}
      <ExcelPreviewSection viewUploadedData={viewUploadedData} data={data}/>


      {showToast && <ToastComponent message={showToast.message} type={showToast.type} />}
    </div>
  );
};

export default FileUploadComponent;
