import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center text-center max-w-md">
      <div className="text-gray-500 mb-3 text-lg">
        <i className="fas fa-code-branch text-5xl mb-4 text-[#4285F4] opacity-50"></i>
        <p>Enter a GitHub repository URL or search for repositories to analyze.</p>
      </div>
      <div className="text-sm text-gray-400 mt-2">
        Example: https://github.com/username/repository
      </div>
    </div>
  );
};

export default EmptyState;
