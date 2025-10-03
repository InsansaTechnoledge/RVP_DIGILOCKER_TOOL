import React, { useState } from 'react';
import { courses } from '../constants';

const SelectCoursesComponent = ({ setCourse }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleCourseChange = (e) => {
    const value = e.target.value;
    setSelectedCourse(value);
    setCourse(value);
  };

  return (
    <div className='form-section'>
      {/* Heading Section */}
      <div className=''>
        <h1 className='secondary-heading mb-2'>Select Course</h1>
        <p className='text-gray-500 text-sm mb-4'>
          Choose a course from the available options to get started
        </p>
      </div>

      {/* Select Dropdown */}
      <div className=''>
        <label className='form-label' htmlFor='course-select'>
          Available Courses
        </label>
        
        <div className='select-wrapper'>
          <select 
            id='course-select'
            className='dropdown-enhanced w-full appearance-none'
            value={selectedCourse}
            onChange={handleCourseChange}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            aria-label='Select a course from available options'
          >
            <option value="">
              -- Choose your course --
            </option>
            {courses.map((course, index) => (
              <option key={course.id || index} value={course.name }>
                { course.name }
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className='select-icon'>
            <svg 
              className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Selected Course Display */}
        {selectedCourse && (
          <div className='mt-4  bg-blue-50 rounded-xl border border-blue-200'>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
              <span className='text-blue-700 font-medium text-sm'>
                Selected: {selectedCourse}
              </span>
            </div>
          </div>
        )}

        {/* Course Count Info */}
        <div className='mt-3 text-xs text-gray-400'>
          {courses.length} courses available
        </div>
      </div>
    </div>
  );
};

export default SelectCoursesComponent