import React, { useReducer, useRef, useState } from 'react'
import FileUploadComponent from './Components/FileUploadComponent'
import SelectCoursesComponent from './Components/SelectCoursesComponent';
import ToastComponent from './Components/ToastComponent';
import SideBar from './Components/SideBar';
import CgpaCalculationPage from './Components/CgpaCalculationPage';
import DegreeConvertor from './Components/DegreeConvertor';
import { University } from 'lucide-react';
import UniversityOverview from './Components/UniversityOverview';


const initialState = { page: 'University Overview'}

const reducer = (state , action) => {
  switch(action.type) {
    
    case 'Digilocker Marksheet Convertor' : 
      return { page: 'Digilocker Marksheet Convertor'};
    
    case 'CGPA Calculator SEM wise' :
      return { page: 'CGPA Calculator SEM wise'};
    
    case 'Digilocker Degree Convertor' :
      return {page : 'Digilocker Degree Convertor'};
    
    case 'University Overview' : 
      return {page: 'University Overview'}

    default : 
      return state;
  }
}

const App = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [degreeFile , setDegreeFile] = useState(null);
  const [degreeData , setDegreeData] = useState(null);
  const [course, setCourse] = useState('');
  const [errors, setErrors] = useState([]);
  const [viewUploadedData, setViewUploadedData] = useState(false);
  const [toast, setToast] = useState(null); 
  const toastTimer = useRef(null);
  const [page , dispatch] = useReducer(reducer , initialState);
  const [sgpaData , setSgpaData] = useState(10);

  console.log("fd", page);
  
  const Toast = (message, type = 'success') => {
    // clear any existing timer so the toast duration resets on rapid calls
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className='flex' >
      <SideBar dispatch={dispatch}/>

      <div className='ml-80 px-12 pt-8 flex-1'>
        {
          page.page === 'Digilocker Marksheet Convertor' && (
            <>
              <SelectCoursesComponent setCourse={setCourse} />
              <FileUploadComponent
                file={file}
                setFile={setFile}
                data={data}
                setData={setData}
                course={course}
                viewUploadedData={viewUploadedData}
                setViewUploadedData={setViewUploadedData}
                Toast={Toast}
                errors={errors}
                setErrors={setErrors}
              />
            </>
          ) 
        }
        {
          page.page === 'CGPA Calculator SEM wise' && (
            <CgpaCalculationPage course={course} setCourse={ setCourse } sgpaData={sgpaData} setSgpaData={setSgpaData} errors={errors} setErrors={setErrors}/>
         ) 
        }
        {
          page.page === 'Digilocker Degree Convertor' && (
            <DegreeConvertor degreeFile={degreeFile} setDegreeFile={setDegreeFile} setDegreeData={setDegreeData} degreeData={degreeData}/>
          )
        }
        {
          page.page === 'University Overview' && (
            <UniversityOverview/>
          )
        }
      </div>

      {/* Always mounted toast */}
      {toast && <ToastComponent message={toast.message} type={toast.type} />}
    </div>  

  );
};

export default App;
