import React from 'react';

interface EmptyStateComparisonProps {
  hasError?: boolean;
}

const EmptyStateComparison: React.FC<EmptyStateComparisonProps> = ({ hasError = false }) => {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-[#F8F9FA]">
        <i className="fas fa-code-branch text-5xl text-[#4285F4] opacity-80"></i>
      </div>
      
      <h3 className="text-xl font-medium text-gray-800 mb-2">
        {hasError ? "Repository scan failed" : "Scan GitHub repositories"}
      </h3>
      
      <div className="text-base text-gray-600 mb-3 max-w-md">
        {hasError 
          ? "We couldn't complete the scan for the username provided." 
          : "Enter a GitHub username to scan all repositories and identify code overlaps."}
      </div>
      
      <div className="text-sm text-gray-400 mt-2">
        Example: reactjs, facebook, microsoft
      </div>
      
      {hasError && (
        <div className="mt-6 p-4 border-l-4 border-[#EA4335] bg-[#FCE8E6] rounded text-[#C5221F] w-full max-w-md">
          <p className="font-medium mb-2">Common issues:</p>
          <ul className="list-disc pl-5 text-left text-sm space-y-1">
            <li>Ensure the GitHub username exists</li>
            <li>Check if the user has public repositories</li>
            <li>GitHub API rate limits may have been exceeded</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmptyStateComparison;