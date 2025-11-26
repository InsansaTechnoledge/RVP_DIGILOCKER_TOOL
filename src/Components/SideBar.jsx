import React, { useState } from 'react';
import HeadingComponent from './HeadingComponent';
import { buttons } from '../constants';

const SideBar = ({ dispatch }) => {
  const [activeButton, setActiveButton] = useState(null);

  const handleButtonClick = (buttonName, index) => {
    setActiveButton(index);
    dispatch({ type: buttonName });
  };

  return (
    <>
      {/* Desktop / Tablet: left sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:h-screen md:sticky md:top-0 md:shrink-0 border-r bg-white"
        role="complementary"
        aria-label="Navigation sidebar"
      >
        {/* Header */}
        <header className="p-4">
          <div className="flex items-center justify-between">
            <img className="w-20 h-20 object-contain" src="/fianl-logo.png" alt="Logo" />
            <HeadingComponent />
          </div>
          <div className="mt-3 h-px bg-gray-200" />
        </header>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
          <div className="space-y-1">
            {buttons.map((button, index) => (
              <button
                key={button.id || button.name || index}
                className={`w-full text-left px-3 py-2 rounded-lg transition 
                  ${activeButton === index ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-gray-50'}
                `}
                onClick={() => handleButtonClick(button.name, index)}
                type="button"
                aria-label={button.ariaLabel || `Navigate to ${button.name}`}
                aria-current={activeButton === index ? 'page' : undefined}
              >
                <div className="flex items-center gap-3">
                  {button.icon && <span className="text-lg">{button.icon}</span>}
                  <span className="font-medium">{button.displayName || button.name}</span>
                </div>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Mobile: bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t shadow-sm"
        role="navigation"
        aria-label="Mobile bottom navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} 
      >
        <ul className="grid grid-cols-5 gap-0">
          {buttons.slice(0, 5).map((button, index) => (
            <li key={button.id || button.name || index}>
              <button
                type="button"
                onClick={() => handleButtonClick(button.name, index)}
                className={`w-full h-16 flex flex-col items-center justify-center gap-1 text-xs 
                  ${activeButton === index ? 'text-indigo-700' : 'text-gray-600'}`}
                aria-label={button.ariaLabel || `Navigate to ${button.name}`}
                aria-current={activeButton === index ? 'page' : undefined}
              >
                <span className={`text-xl leading-none ${activeButton === index ? 'scale-110' : ''}`}>
                  {button.icon || '•'}
                </span>
                <span className="truncate max-w-[72px]">
                  {button.shortLabel || button.displayName || button.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default SideBar;
