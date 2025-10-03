export default function ExcelUploadSectionForCGPA({ semIndex, onUpload }) {
  const inputId = `file-input-${semIndex}`; // make IDs unique per sem

  return (
    <div className='upload-section'>
      <label className='form-label' htmlFor={inputId}>
        Choose File (Sem {semIndex})
      </label>

      <input
        id={inputId}
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={(e) => onUpload(e, semIndex)}   
        className='file-input'
        aria-describedby={`${inputId}-help`}
      />

      <div id={`${inputId}-help`} className='file-info'>
        Accepted formats: .csv, .xls, .xlsx (Max size: 10MB)
      </div>
    </div>
  );
}
