import { useState } from 'react';
import { CodeIssue } from '../types';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface IssuesListProps {
  issues: CodeIssue[];
  onFixIssue: (issue: CodeIssue) => void;
}

const IssuesList: React.FC<IssuesListProps> = ({ issues = [], onFixIssue }) => {
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Check if issues is null, undefined, or empty
  if (!issues || !Array.isArray(issues) || issues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center mt-4">
        <h3 className="text-lg font-semibold mb-4">Detected Issues</h3>
        <p className="text-gray-500">No issues detected in this file.</p>
      </div>
    );
  }

  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    // Default to codeQuality if no category provided
    const category = issue.category || 'codeQuality';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(issue);
    return acc;
  }, {} as Record<string, CodeIssue[]>);

  // Map category to readable name and icon
  const categoryInfo: Record<string, { label: string; icon: string; color: string }> = {
    security: { 
      label: 'Security', 
      icon: 'fas fa-shield-alt', 
      color: 'border-red-500 text-red-500'
    },
    performance: { 
      label: 'Performance', 
      icon: 'fas fa-tachometer-alt', 
      color: 'border-orange-500 text-orange-500'
    },
    codeQuality: { 
      label: 'Code Quality', 
      icon: 'fas fa-code', 
      color: 'border-blue-500 text-blue-500'
    },
    accessibility: { 
      label: 'Accessibility', 
      icon: 'fas fa-universal-access', 
      color: 'border-green-500 text-green-500'
    }
  };

  // Count issues by type
  const bugCount = issues.filter(issue => issue.issueType === 'bug').length;
  const warningCount = issues.filter(issue => issue.issueType === 'warning').length;
  const infoCount = issues.filter(issue => issue.issueType === 'info').length;

  // Issue rendering helper
  const renderIssue = (issue: CodeIssue) => {
    // Skip rendering if the issue is invalid
    if (!issue || !issue.issueType) {
      return null;
    }
    
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
    
    // Generate a reliable key - fallback to index if id is missing
    const key = issue.id ? issue.id : Math.random().toString(36).substring(2, 9);

    return (
      <div 
        key={key}
        className={`flex items-start p-3 mb-3 ${bgColor} rounded border-l-4 ${borderColor}`}
      >
        <div className={`flex-shrink-0 ${textColor} mt-0.5`}>
          <i className={icon}></i>
        </div>
        <div className="ml-3 flex-grow">
          <div className="flex items-center mb-1">
            <h4 className="font-medium flex-grow">
              {(issue.issueType || '').charAt(0).toUpperCase() + (issue.issueType || '').slice(1)}:&nbsp;
              {issue.message || 'Unknown issue'}
            </h4>
            <Badge variant="outline" className={`ml-2 ${categoryInfo[issue.category || 'codeQuality'].color}`}>
              <i className={`${categoryInfo[issue.category || 'codeQuality'].icon} mr-1`}></i>
              {categoryInfo[issue.category || 'codeQuality'].label}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Line {issue.lineNumber || '?'}: <code className="text-xs bg-gray-100 p-1 rounded">{issue.code || 'Unknown code snippet'}</code>
          </p>
          {issue.suggestion && (
            <div className="mt-2">
              <div className="bg-gray-50 p-2 rounded text-xs font-mono mb-2">
                {issue.suggestion.split('\n').map((line, i) => (
                  <div key={i} className="whitespace-pre">{line}</div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-[#4285F4] hover:bg-blue-50"
                onClick={() => {
                  if (onFixIssue && typeof onFixIssue === 'function') {
                    onFixIssue(issue);
                  }
                }}
              >
                <i className="fas fa-wrench mr-1"></i> Apply Fix
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Detected Issues</h3>
        <div className="flex items-center space-x-3 text-sm">
          <span className="flex items-center">
            <i className="fas fa-bug text-[#EA4335] mr-1"></i> {bugCount} bugs
          </span>
          <span className="flex items-center">
            <i className="fas fa-exclamation-triangle text-[#FBBC05] mr-1"></i> {warningCount} warnings
          </span>
          <span className="flex items-center">
            <i className="fas fa-info-circle text-[#4285F4] mr-1"></i> {infoCount} info
          </span>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">All Issues</TabsTrigger>
          {Object.keys(groupedIssues).map(category => (
            <TabsTrigger key={category} value={category}>
              <i className={`${categoryInfo[category]?.icon || 'fas fa-code'} mr-1`}></i>
              {categoryInfo[category]?.label || 'Unknown'}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="all">
          <div className="space-y-1">
            {issues.map(renderIssue)}
          </div>
        </TabsContent>
        
        {Object.entries(groupedIssues).map(([category, categoryIssues]) => (
          <TabsContent key={category} value={category}>
            <div className="space-y-1">
              {categoryIssues.map(renderIssue)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default IssuesList;
