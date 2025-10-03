import React from 'react'

const ExcelUploadSection = ({handleFileUpload}) => {
  return (
    <div className='upload-section'>
        <label className='form-label' htmlFor='file-input'>
          Choose File
        </label>
        <input 
          id='file-input'
          type="file" 
          onChange={handleFileUpload}
          className='file-input'
          aria-describedby='file-help'
        />
        <div id='file-help' className='file-info'>
          Accepted formats: .csv, .xls, .xlsx (Max size: 10MB)
        </div>
    </div>
  )
}

export default ExcelUploadSection
