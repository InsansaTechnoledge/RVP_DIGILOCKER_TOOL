
import React, { useState } from "react";
import PageSeperator from './Helper/PageSeperator';
import Authentication from "./Authentication";
import UploadFile from "./UploadFile";
import { TrackingID } from "./TrackingId";


const API_INTEGRATION = () => {
  const [lock, setLock] = useState(true); // true - prod , false - dev
  const correctPassword = '@Insansa_api_integration'
  const [password , setPassword] = useState('');
   const [data , setData] = useState(''); // for access token 

  const handleCheck = () => {
    if(password === correctPassword) {
      setLock(false);
      return
    }
    else{
      setPassword('')
    }
  }

  return (
    <div>
      {
        lock ? (
          <div className=' flex justify-center items-center min-h-screen'>
            <div className='py-20 px-10 border w-7xl flex flex-col'>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='border px-2 py-1 border-gray-500/40 text-gray-500'
                  placeholder='Enter your password'
                />

                <button onClick={() => handleCheck()} className='mt-5 bg-green-600 text-gray-100 px-3 py-2 rounded-md '>Enter Other Zone</button>
            </div>
          </div>
        ) : (
          <>
             <div className='flex flex-col p-10'>
                  <p className='font-bold text-4xl'>1) Authentication API</p>
                  <div className='w-full'>
                      <Authentication data={data} setData={setData}/>  {/* i will receive access_token from this global data */}
                  </div>
              </div>  

              <PageSeperator/>

              <div className='flex flex-col p-10'>
                  <p className='font-bold text-4xl'>2) Data File Upload API</p>
                  <div className='w-full'>
                      <UploadFile authToken={data.access_token}/>
                  </div>
              </div>  

              <PageSeperator/>

              <div className='flex flex-col p-10'>
                  <p className='font-bold text-4xl'>3) File Tracking Status</p>
                  <div className='w-full'>
                      <TrackingID authToken={data.access_token}/>
                  </div>
              </div>  
          </>
        )
      }
    </div>
  )
}

export default API_INTEGRATION
