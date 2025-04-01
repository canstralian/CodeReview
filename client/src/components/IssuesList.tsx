import { CodeIssue } from '../types';
import { Button } from "@/components/ui/button";

interface IssuesListProps {
  issues: CodeIssue[];
  onFixIssue: (issue: CodeIssue) => void;
}

const IssuesList: React.FC<IssuesListProps> = ({ issues, onFixIssue }) => {
  if (!issues.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Detected Issues</h3>
        <p className="text-gray-500">No issues detected in this file.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Detected Issues</h3>
      <div className="space-y-3">
        {issues.map((issue) => {
          // Determine styling based on issue type
          const getIssueStyling = () => {
            switch (issue.issueType) {
              case 'bug':
                return {
                  bgColor: 'bg-red-50',
                  borderColor: 'border-[#EA4335]',
                  textColor: 'text-[#EA4335]',
                  icon: 'fas fa-bug'
                };
              case 'warning':
                return {
                  bgColor: 'bg-yellow-50',
                  borderColor: 'border-[#FBBC05]',
                  textColor: 'text-[#FBBC05]',
                  icon: 'fas fa-exclamation-triangle'
                };
              case 'info':
                return {
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-[#4285F4]',
                  textColor: 'text-[#4285F4]',
                  icon: 'fas fa-info-circle'
                };
              default:
                return {
                  bgColor: 'bg-gray-50',
                  borderColor: 'border-gray-400',
                  textColor: 'text-gray-400',
                  icon: 'fas fa-exclamation-circle'
                };
            }
          };

          const { bgColor, borderColor, textColor, icon } = getIssueStyling();

          return (
            <div 
              key={issue.id} 
              className={`flex items-start p-3 ${bgColor} rounded border-l-4 ${borderColor}`}
            >
              <div className={`flex-shrink-0 ${textColor} mt-0.5`}>
                <i className={icon}></i>
              </div>
              <div className="ml-3 flex-grow">
                <h4 className="font-medium">
                  {issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1)}:&nbsp;
                  {issue.message}
                </h4>
                <p className="text-sm text-gray-600">
                  Line {issue.lineNumber}: {issue.code}
                </p>
                {issue.suggestion && (
                  <div className="mt-2 text-sm">
                    <Button
                      variant="link"
                      className="text-[#4285F4] cursor-pointer hover:underline p-0 h-auto"
                      onClick={() => onFixIssue(issue)}
                    >
                      Fix issue
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IssuesList;
