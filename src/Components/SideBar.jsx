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
    <aside 
      className="sidebar-container"
      role="complementary"
      aria-label="Navigation sidebar"
    >
      {/* Header Section */}
      <header className="sidebar-header">
        <div className='flex items-center justify-between px-4 mt-2 mb-4'>
          <img className='w-22 h-22' src="/fianl-logo.png" alt="" />
          <HeadingComponent />
        </div>
        <div className="sidebar-divider" />
      </header>

      {/* Navigation Section */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-button-container">
          {buttons.map((button, index) => (
            <button
              key={button.id || button.name || index}
              className={`
                sidebar-button w-full text-left hover-lift
                ${activeButton === index ? 'sidebar-button-active' : ''}
              `}
              onClick={() => handleButtonClick(button.name, index)}
              type="button"
              aria-label={button.ariaLabel || `Navigate to ${button.name}`}
            >
              <div className="center justify-start space-x-3">
                {button.icon && (
                  <span className="text-lg">
                    {button.icon}
                  </span>
                )}
                <span className="font-medium">
                  {button.displayName || button.name}
                </span>
              </div>
            </button>
          ))}
        </div>

      </nav>
    </aside>
  );
};

export default SideBar;