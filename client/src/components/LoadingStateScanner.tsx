import React from 'react';

const LoadingStateScanner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex mb-6">
        <div className="animate-bounce delay-75 h-4 w-4 rounded-full bg-[#4285F4] mr-2"></div>
        <div className="animate-bounce delay-150 h-4 w-4 rounded-full bg-[#EA4335] mr-2"></div>
        <div className="animate-bounce delay-300 h-4 w-4 rounded-full bg-[#FBBC05] mr-2"></div>
        <div className="animate-bounce delay-500 h-4 w-4 rounded-full bg-[#34A853]"></div>
      </div>
      
      <h3 className="text-xl font-medium text-gray-800 mb-2">Scanning repositories</h3>
      <p className="text-gray-600 text-center max-w-md">
        We're analyzing code across multiple repositories to identify patterns and redundancies.
        This may take a moment...
      </p>
      
      <div className="mt-6 w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-[#4285F4] h-2.5 rounded-full animate-pulse"
          style={{ width: '65%' }}
        ></div>
      </div>
    </div>
  );
};

export default LoadingStateScanner;