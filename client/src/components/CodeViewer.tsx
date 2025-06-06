import { useEffect, useRef } from 'react';
import { RepositoryFile, CodeIssue } from '../types';
import { Skeleton } from "@/components/ui/skeleton";

interface CodeViewerProps {
  file: RepositoryFile;
  issues: CodeIssue[];
  isLoading: boolean;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file, issues = [], isLoading }) => {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Highlight code using Prism.js when the component mounts or file changes
    // First check if file exists and has content
    if (file && file.content && !isLoading && preRef.current) {
      if ((window as any).Prism) {
        (window as any).Prism.highlightElement(preRef.current);
      }
    }
  }, [file, isLoading]);

  // Check if file is valid before proceeding
  if (!file) {
    return (
      <div className="bg-white rounded-lg shadow-md mb-4">
        <div className="p-4 text-center">
          <p className="text-gray-500">No file selected</p>
        </div>
      </div>
    );
  }

  // Determine the language class for syntax highlighting
  const getLanguageClass = () => {
    if (!file || !file.language) return 'language-plaintext';

    const languageMap: Record<string, string> = {
      'JavaScript': 'language-javascript',
      'TypeScript': 'language-typescript',
      'Python': 'language-python',
      'Java': 'language-java',
      'Ruby': 'language-ruby',
      'PHP': 'language-php',
      'Go': 'language-go',
      'Rust': 'language-rust',
      'C': 'language-c',
      'C++': 'language-cpp',
      'C#': 'language-csharp',
      'HTML': 'language-html',
      'CSS': 'language-css',
      'JSON': 'language-json',
      'Markdown': 'language-markdown',
    };

    return languageMap[file.language] || 'language-plaintext';
  };

  // Add line numbers and issue highlights to the code
  const prepareCodeWithIssues = () => {
    // Safety check for file content
    if (!file || !file.content) return '';

    const code = file.content;
    const codeLines = code.split('\n');

      const createCodeElement = () => {
        const container = document.createElement('div');

        codeLines.forEach((line, index) => {
          const lineNumber = index + 1;
          const issuesOnLine = issues.filter(issue => issue.lineNumber === lineNumber);

          let lineClass = 'hover:bg-gray-50 dark:hover:bg-gray-800';
          let issueClass = '';

          if (issuesOnLine.length > 0) {
            const highestSeverity = issuesOnLine.reduce((prev, current) => {
              const severityOrder = { high: 3, medium: 2, low: 1 };
              return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
            });

            if (highestSeverity.severity === 'high') {
              lineClass += ' bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
              issueClass = 'text-red-600 dark:text-red-400';
            } else if (highestSeverity.severity === 'medium') {
              lineClass += ' bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500';
              issueClass = 'text-yellow-600 dark:text-yellow-400';
            } else {
              lineClass += ' bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500';
              issueClass = 'text-blue-600 dark:text-blue-400';
            }
          }

          const lineDiv = document.createElement('div');
          lineDiv.className = `${lineClass} flex`;

          const lineNumberSpan = document.createElement('span');
          lineNumberSpan.className = 'text-gray-500 select-none pr-4';
          lineNumberSpan.textContent = lineNumber.toString().padStart(3, ' ');

          const lineContentSpan = document.createElement('span');
          lineContentSpan.className = issueClass;
          lineContentSpan.textContent = line;

          lineDiv.appendChild(lineNumberSpan);
          lineDiv.appendChild(lineContentSpan);
          container.appendChild(lineDiv);
        });

        return container.innerHTML;
      };

      const formattedCode = createCodeElement();
    return formattedCode;
  };

  // Get highlighting class based on issue type
  const getIssueHighlightClass = (issueType: string) => {
    if (!issueType) return '';

    switch (issueType) {
      case 'bug':
        return 'bg-red-100 dark:bg-red-900/20 p-1 rounded';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20 p-1 rounded';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/20 p-1 rounded';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {file.filePath || 'Unknown file'}
        </span>
      </div>
      <div className="p-1">
        {isLoading ? (
          <div className="p-3">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full my-2" />
            ))}
          </div>
        ) : (
          <pre
            ref={preRef} 
            className={`overflow-x-auto font-mono text-sm p-3 max-h-[400px] code-scroll ${getLanguageClass()}`}
            style={{ fontFamily: 'Courier New, monospace' }}
          >
            <code 
              className="text-gray-800 dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: prepareCodeWithIssues() }} 
            />
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeViewer;