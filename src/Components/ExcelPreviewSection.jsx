import React from 'react'

const ExcelPreviewSection = ({viewUploadedData , data}) => {
  return (
    <div>
         {viewUploadedData && data?.length > 0 && (
        <div className='data-preview'>
          <div className='preview-header'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z' clipRule='evenodd' />
            </svg>
            <span>Data Preview ({data.length} rows)</span>
          </div>
          
          <div className='overflow-auto'>
            <table className='data-table'>
              <thead>
                {data[0] && (
                  <tr>
                    {data[0].map((header, index) => (
                      <th key={index} className='data-header-cell'>
                        {header || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {data.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className='data-cell'>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExcelPreviewSection
