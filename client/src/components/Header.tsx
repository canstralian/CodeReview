import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="mt-8 sm:mt-16 flex justify-center">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center">
          <div className="text-3xl sm:text-4xl font-bold">
            <span className="text-[#4285F4]">Code</span><span className="text-[#EA4335]">Review</span>
          </div>
          <div className="ml-2 text-[#202124]">
            <i className="fas fa-code text-2xl"></i>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
