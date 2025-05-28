import React from 'react';
import { Link, useLocation } from 'wouter';
import { ThemeToggle } from './ThemeToggle';

const Header: React.FC = () => {
  const [location] = useLocation();
  
  return (
    <header className="mt-8 sm:mt-16 flex flex-col items-center relative">
      <div className="absolute top-0 right-4">
        <ThemeToggle />
      </div>
      
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <div className="text-3xl sm:text-4xl font-bold">
                <span className="text-[#4285F4]">Code</span><span className="text-[#EA4335]">Review</span>
              </div>
              <div className="ml-2 text-[#202124] dark:text-gray-300">
                <i className="fas fa-code text-2xl"></i>
              </div>
            </div>
          </Link>
        </div>
      </div>
      
      <nav className="mb-8">
        <ul className="flex space-x-8">
          <li>
            <Link href="/">
              <div className={`pb-1 px-1 cursor-pointer transition-colors ${location === '/' ? 'border-b-2 border-[#4285F4] font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-[#4285F4]'}`}>
                Single Repository
              </div>
            </Link>
          </li>
          <li>
            <Link href="/repo-comparison">
              <div className={`pb-1 px-1 cursor-pointer transition-colors ${location === '/repo-comparison' ? 'border-b-2 border-[#4285F4] font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-[#4285F4]'}`}>
                Repository Scanner
              </div>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
