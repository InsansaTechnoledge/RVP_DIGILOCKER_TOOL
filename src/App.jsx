import React, { useReducer, useRef, useState } from 'react'
import FileUploadComponent from './Components/FileUploadComponent'
import SelectCoursesComponent from './Components/SelectCoursesComponent';
import ToastComponent from './Components/ToastComponent';
import SideBar from './Components/SideBar';
import CgpaCalculationPage from './Components/CgpaCalculationPage';
import DegreeConvertor from './Components/DegreeConvertor';
import UniversityOverview from './Components/UniversityOverview';
import LoginPage from './Components/LoginPage';
import NadTransformer from './Components/NonCBCSConvertor';
import API_INTEGRATION from './Components/API/API_INTEGRATION';
import StudentsCounter from './Components/StudentsCounter';

const initialState = { page: 'University Overview' };

const reducer = (state, action) => {
  switch (action.type) {
    case 'Digilocker Marksheet Convertor':
      return { page: 'Digilocker Marksheet Convertor' };
    case 'CGPA Calculator SEM wise':
      return { page: 'CGPA Calculator SEM wise' };
    case 'Digilocker Degree Convertor':
      return { page: 'Digilocker Degree Convertor' };
    case 'University Overview':
      return { page: 'University Overview' };
    case 'NON-CBCS Marksheet Convertor':
      return {page: 'NON-CBCS Marksheet Convertor'}
    case 'Others...':
      return {page: 'API INTEGRATION'}
    case 'Count Students':
      return {page: 'Count Students'}

    default:
      return state;
  }
};

const App = () => {
  const [Credentials, setCredential] = useState({
    id: 'RVP_INSANSA_TOOL',
    pass: 'RVP#1234@'
  });

  const [isCorrect, setIsCorrect] = useState(false);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [degreeFile, setDegreeFile] = useState(null);
  const [degreeData, setDegreeData] = useState(null);
  const [course, setCourse] = useState('');
  const [errors, setErrors] = useState([]);
  const [viewUploadedData, setViewUploadedData] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [page, dispatch] = useReducer(reducer, initialState);
  const [sgpaData, setSgpaData] = useState(10);

  const Toast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      {!isCorrect ? (
        <LoginPage setIsCorrect={setIsCorrect} Credentials={Credentials} />
      ) : (
        <div className="min-h-screen bg-white md:bg-gray-50 md:flex">
          {/* Responsive Sidebar: desktop left / mobile bottom handled inside */}
          <SideBar dispatch={dispatch} />

          {/* Main content — remove old ml-80; add bottom padding for mobile bar */}
          <main className="flex-1 px-4 sm:px-6 md:px-8 pt-6 pb-20 md:pb-0">
            {page.page === 'Digilocker Marksheet Convertor' && (
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
            )}

            {
              page.page === 'NON-CBCS Marksheet Convertor' && (
                <NadTransformer/>
              )
            }

            {page.page === 'CGPA Calculator SEM wise' && (
              <CgpaCalculationPage
                course={course}
                setCourse={setCourse}
                sgpaData={sgpaData}
                setSgpaData={setSgpaData}
                errors={errors}
                setErrors={setErrors}
              />
            )}

            {page.page === 'Digilocker Degree Convertor' && (
              <DegreeConvertor
                degreeFile={degreeFile}
                setDegreeFile={setDegreeFile}
                setDegreeData={setDegreeData}
                degreeData={degreeData}
              />
            )}

            {page.page === 'University Overview' && <UniversityOverview />}

            {
              page.page === 'API INTEGRATION' && <API_INTEGRATION/>
            }
            {/* {
              page.page === 'Count Students' && <StudentsCounter/>
            } */}
          </main>

          {/* Toast (kept above bottom bar) */}
          {toast && (
            <div className="z-[60]">
              <ToastComponent message={toast.message} type={toast.type} />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default App;
