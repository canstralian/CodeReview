import React, { useState, useEffect } from 'react';
import SessionStatus from './SessionStatus';

interface LoadingStateProps {
  progress?: number;
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  progress, 
  message = "Analyzing repository..." 
}) => {
  const [loadingProgress, setLoadingProgress] = useState(progress || 0);
  
  // Simulate progress if not provided
  useEffect(() => {
    if (progress === undefined) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          // Slow down as we approach 90%
          if (prev >= 90) return prev;
          const increment = prev < 50 ? 10 : prev < 80 ? 5 : 2;
          return Math.min(90, prev + increment);
        });
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(progress);
    }
  }, [progress]);

  return (
    <div className="flex flex-col items-center justify-center mt-12 w-full max-w-2xl">
      <SessionStatus 
        status="loading" 
        message={message}
        progress={loadingProgress}
      />
      <div className="mt-4 text-sm text-gray-500 text-center">
        <p>This may take a few moments depending on repository size</p>
      </div>
    </div>
  );
};

export default LoadingState;
