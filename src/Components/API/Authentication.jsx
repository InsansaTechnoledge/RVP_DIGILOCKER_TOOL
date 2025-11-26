import React, { useState } from 'react'
import axios from 'axios';


const Authentication = ({data , setData}) => {
    const [customer_id , setClientId] = useState('in.edu.jrnrvu');
    const [customer_secret_key , setSecretKey] = useState('');
    const [error , setError] = useState('');

    const handleAuthTokenGeneration = async () => {
        const formData = {
            customer_id,
            customer_secret_key
        }
        try{
            const generate = await axios.post('https://nadapi.digilocker.gov.in/v1/oauth' , formData)

            setData(generate.data);
            setError('');
        } catch(e) {
            console.error(e.response?.data );
            setError(`${e.response?.data.error }`)
            setData('')
        }
    }

    return (
        <div className='p-8'>

            <div className='mx-auto border border-gray-400/30 rounded-2xl shadow-2xl mt-10 max-w-6xl'>
                <h1 className='text-3xl font-bold text-center py-4'>Authentication</h1>
                <div className='flex flex-col p-4 gap-6'>
                    <div className='flex flex-col gap-6'>
                        <label className=''>clientId</label>
                        <input 
                            type="text" 
                            value={customer_id}
                            disabled
                            className='border w-lg px-4 py-2 rounded-md border-gray-500/40 text-gray-500 cursor-not-allowed'
                        />
                    </div>
                    <div className='flex flex-col gap-6'>
                        <label className=''>secret-key</label>
                        <input 
                            type="password" 
                            value={customer_secret_key}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder='enter your secret key'
                            className='border w-lg px-4 py-2 rounded-md border-gray-500/40 text-gray-500 '
                        />
                    </div>
                </div>
                <div className='p-4'>
                    <button 
                        disabled={!customer_secret_key || data}
                        onClick={() => handleAuthTokenGeneration()}
                        className='bg-green-600 rounded-md text-md text-gray-100 py-2 px-3 hover:scale-105 disabled:bg-gray-400 disabled:text-red-500 disabled:scale-100'
                        >
                        Generate AuthToken
                    </button>
                </div>
            </div>

            {
                data && (
                    <div className='mx-auto border border-gray-400/30 rounded-2xl shadow-2xl mt-10 max-w-6xl'>
                        <h1 className='text-3xl text-green-600 font-bold text-center py-4'>Authentication Successfull</h1>
                            <p className='text-center text-gray-500'>expires in {data.expires_in}</p>
                            <p className='text-center text-gray-500 mt-2'>token type: <span className='font-bold text-gray-600'>{data.token_type}</span></p>

                        <div className='flex mt-4'>
                        <div className='flex flex-col p-4'>
                            <label>access token</label>
                            <textarea
                                className='px-3 py-2 border w-lg  rounded-md border-gray-500/40 text-gray-500'
                                disabled
                                value={data.access_token}
                            />
                           
                        </div>

                        <div className='flex flex-col p-4'>
                            <label>encrypt key</label>
                            <textarea
                                className='px-3 py-2 border w-lg  rounded-md border-gray-500/40 text-gray-500'
                                disabled
                                value={data.encrypt_key}
                            />
                           
                        </div>
                        </div>
                    </div>
                )
            }
            {
                error && (
                    <div className='max-w-4xl text-xl mt-10 py-4 px-5 mx-auto bg-red-50 border border-red-500/40 text-red-500 rounded-lg'>
                        {error}
                    </div>
                )
            }
        </div>
    )
}

export default Authentication