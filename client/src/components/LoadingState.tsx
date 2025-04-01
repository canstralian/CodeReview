import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center mt-12">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#4285F4] border-solid mb-4"></div>
      <p className="text-gray-600">Analyzing repository...</p>
    </div>
  );
};

export default LoadingState;
