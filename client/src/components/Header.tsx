import React from 'react';
import { Link, useLocation } from 'wouter';

const Header: React.FC = () => {
  const [location] = useLocation();
  
  return (
    <header className="mt-8 sm:mt-16 flex flex-col items-center">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center">
          <Link href="/">
            <a className="flex items-center cursor-pointer">
              <div className="text-3xl sm:text-4xl font-bold">
                <span className="text-[#4285F4]">Code</span><span className="text-[#EA4335]">Review</span>
              </div>
              <div className="ml-2 text-[#202124]">
                <i className="fas fa-code text-2xl"></i>
              </div>
            </a>
          </Link>
        </div>
      </div>
      
      <nav className="mb-8">
        <ul className="flex space-x-8">
          <li>
            <Link href="/">
              <a className={`pb-1 px-1 ${location === '/' ? 'border-b-2 border-[#4285F4] font-medium' : 'text-gray-600 hover:text-[#4285F4]'}`}>
                Single Repository
              </a>
            </Link>
          </li>
          <li>
            <Link href="/repo-comparison">
              <a className={`pb-1 px-1 ${location === '/repo-comparison' ? 'border-b-2 border-[#4285F4] font-medium' : 'text-gray-600 hover:text-[#4285F4]'}`}>
                Repository Scanner
              </a>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
