import React from 'react';

interface EmptyStateProps {
  hasError?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasError = false }) => {
  return (
    <div className="flex flex-col items-center text-center max-w-md">
      <div className="text-gray-500 mb-3 text-lg">
        <i className="fas fa-code-branch text-5xl mb-4 text-[#4285F4] opacity-50"></i>
        <p>Enter a GitHub repository URL to analyze.</p>
      </div>
      <div className="text-sm text-gray-400 mt-2">
        Example: https://github.com/facebook/react
      </div>
      
      {hasError && (
        <div className="mt-6 p-4 border border-red-200 bg-red-50 rounded-md text-red-600 w-full max-w-md">
          <p className="font-medium">Common mistakes:</p>
          <ul className="list-disc pl-5 mt-2 text-left text-sm">
            <li>Make sure you're using a GitHub URL (not a token or API key)</li>
            <li>URL should be in format: github.com/owner/repo</li>
            <li>Repository must be public or you must have access to it</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
