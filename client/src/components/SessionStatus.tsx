import React from 'react';

interface SessionStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'timeout';
  message?: string;
  progress?: number; // 0-100 for loading progress
}

/**
 * SessionStatus Component
 * Provides clear visual feedback for session states including loading,
 * success, error, and timeout indicators
 */
const SessionStatus: React.FC<SessionStatusProps> = ({ 
  status, 
  message,
  progress 
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'timeout':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
        );
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case 'loading':
        return 'Processing your request...';
      case 'success':
        return 'Operation completed successfully';
      case 'error':
        return 'An error occurred. Please try again.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className={`flex items-start p-4 rounded-lg border ${getStatusColor()} transition-all duration-300`}>
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium">
          {message || getDefaultMessage()}
        </p>
        {status === 'loading' && progress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <p className="text-xs mt-1 text-blue-600">{Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionStatus;
