import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { validateExcelData } from '../utils/validateExcel';
import axios from 'axios';
import ToastComponent from './ToastComponent';
import ExcelPreviewSection from './ExcelPreviewSection';
import ExcelUploadSection from './ExcelUploadSection';

const API_BASE_URL = 'http://13.204.82.98:8000';

const FileUploadComponent = ({ 
  file, setFile, data, setData, course, 
  viewUploadedData, setViewUploadedData, Toast, showToast  , errors , setErrors
}) => {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      return;
    }

    const allowedExtension = ['csv', 'xls', 'xlsx'];
    const currentExtension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (!allowedExtension.includes(currentExtension)) {
      Toast('File type not supported. Please upload CSV, XLS, or XLSX.', 'error');
      e.target.value = '';
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setErrors([]); // Clear previous errors

    // Read content from excel
    const reader = new FileReader();
    reader.onload = (e) => {
      const binarystr = e.target.result;
      const workbook = XLSX.read(binarystr, { type: 'binary' });
      const worksheetName = workbook.SheetNames[0];
      const workSheet = workbook.Sheets[worksheetName];
      const jsonData = XLSX.utils.sheet_to_json(workSheet, { 
        header: 1, 
        defval: '', 
        raw: false 
      });

      setData(jsonData);

      // const { errors: validationErrors } = validateExcelData(jsonData);
      // setErrors(validationErrors);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const downloadFromResponse = async (res, fallbackName = 'result.csv') => {
    const contentType = res?.headers?.['content-type'] || 'application/octet-stream';
    const cd = res?.headers?.['content-disposition'] || '';
    const m1 = /filename\\*?=(?:UTF-8''|\")(....)(?:;|$|\")/i.exec(cd);
    const filename = m1 ? decodeURIComponent(m1[1].replace(/\"/g, '')) :
                     (contentType.includes('sheet') ? 'result.xlsx' :
                      contentType.includes('csv') ? 'result.csv' : fallbackName);

    const blob = new Blob([res.data], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (contentType.includes('csv')) {
      const text = await blob.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const preview = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      setData(preview);
      setViewUploadedData(true);
    }
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

      await downloadFromResponse(res);
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
            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
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
              <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
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
              <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
            </svg>
            <span>
              {viewUploadedData ? 'Hide Data Preview' : 'Show Data Preview'}
              {data?.length > 0 && ` (${data.length} rows)`}
            </span>
          </div>
        </button>
      )}

      {/* Data Preview */}
      <ExcelPreviewSection viewUploadedData={viewUploadedData} data={data}/>

      {/* Toast Component */}
      {showToast && <ToastComponent message={showToast.message} type={showToast.type} />}
    </div>
  );
};

export default FileUploadComponent;