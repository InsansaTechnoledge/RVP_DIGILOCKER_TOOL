import React, { useEffect, useMemo, useRef, useState } from 'react';
import { courses } from '../constants';

const SelectCoursesComponent = ({ setCourse }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  // Focus search with "/" key (like many dashboards)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const normalize = (s) =>
    (s ?? '').toString().trim().toLowerCase();

  const filteredCourses = useMemo(() => {
    const q = normalize(query);
    if (!q) return courses;
    return courses.filter((c) => {
      const name = normalize(c.name);
      const code = normalize(c.code);     // if your objects have a "code"
      const dept = normalize(c.department); // if you store a department
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [query]);

  const handleCourseChange = (e) => {
    const value = e.target.value;
    setSelectedCourse(value);
    setCourse(value);
  };

  const isCourseCBCS = (cbcs) => {
    if (cbcs === true) return 'CBCS';
    if (cbcs === false) return 'NON-CBCS';
    return 'No Data Available';
  };

  const clearSearch = () => setQuery('');

  return (
    <div className='form-section'>
      {/* Heading Section */}
      <div>
        <h1 className='secondary-heading mb-2'>Select Course</h1>
        <p className='text-gray-500 text-sm mb-4'>
          Choose a course from the available options to get started
        </p>
      </div>

      {/* Search input */}
      <div className='mb-3 relative'>
        <label className='form-label' htmlFor='course-search'>
          Search Courses <span className='text-xs text-gray-400'>(press “/”)</span>
        </label>
        <div className='flex items-center gap-2'>
          <input
            id='course-search'
            ref={searchRef}
            type='text'
            placeholder='Type course name, code, or department...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='input w-full'
            aria-label='Search courses'
          />
          {query && (
            <button
              type='button'
              onClick={clearSearch}
              className='px-3 py-2 rounded-lg border text-sm hover:bg-gray-50'
              aria-label='Clear search'
            >
              Clear
            </button>
          )}
        </div>
        <div className='mt-1 text-xs text-gray-400'>
          Showing {filteredCourses.length} of {courses.length} courses
        </div>
      </div>

      {/* Select Dropdown */}
      <div>
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
            aria-label='Select a course from filtered options'
          >
            <option value=''>-- Choose your course --</option>

            {filteredCourses.length === 0 ? (
              <option disabled value=''>
                No courses match “{query}”
              </option>
            ) : (
              filteredCourses.map((course, index) => (
                <option key={course.id || index} value={course.name}>
                  {course.name} {course.code ? `(${course.code})` : ''} — {isCourseCBCS(course.CBCS)}
                </option>
              ))
            )}
          </select>

          {/* Custom dropdown arrow */}
          <div className='select-icon'>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
          </div>
        </div>

        {/* Selected Course Display */}
        {selectedCourse && (
          <div className='mt-4 bg-blue-50 rounded-xl border border-blue-200 p-3'>
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
          {filteredCourses.length} of {courses.length} courses available
        </div>
      </div>
    </div>
  );
};

export default SelectCoursesComponent;
