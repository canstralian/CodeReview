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

    const lines = file.content.split('\n');
    let result = '';

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Safely filter issues, ensuring we have a valid array
      const issuesOnLine = Array.isArray(issues) 
        ? issues.filter(i => i && i.lineNumber === lineNumber)
        : [];

      // Add line number
      const lineNumberElement = document.createElement('span');
      lineNumberElement.className = 'text-gray-500';
      lineNumberElement.textContent = lineNumber.toString();
      result += `<span class="text-gray-500">${lineNumber}</span> `;

      // Add line with highlighting if there are issues
      if (issuesOnLine.length > 0 && issuesOnLine[0] && issuesOnLine[0].issueType) {
        const issueClass = getIssueHighlightClass(issuesOnLine[0].issueType);
        // Safely escape line content to prevent XSS
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        result += `<span class="${issueClass}">${escapedLine}</span>`;
      } else {
        // Safely escape line content to prevent XSS
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        result += escapedLine;
      }

      // Add line break
      if (index < lines.length - 1) {
        result += '\n';
      }
    });

    return result;
  };

  // Get highlighting class based on issue type
  const getIssueHighlightClass = (issueType: string) => {
    if (!issueType) return '';

    switch (issueType) {
      case 'bug':
        return 'bg-red-100 p-1 rounded';
      case 'warning':
        return 'bg-yellow-100 p-1 rounded';
      case 'info':
        return 'bg-blue-100 p-1 rounded';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-4">
      <div className="flex items-center border-b px-4 py-2">
        <span className="text-sm font-medium">{file.filePath || 'Unknown file'}</span>
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
            <code dangerouslySetInnerHTML={{ __html: prepareCodeWithIssues() }} />
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeViewer;
```import { useEffect, useRef } from 'react';
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

    const lines = file.content.split('\n');
    let result = '';

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Safely filter issues, ensuring we have a valid array
      const issuesOnLine = Array.isArray(issues) 
        ? issues.filter(i => i && i.lineNumber === lineNumber)
        : [];

      // Add line number
      const lineNumberElement = document.createElement('span');
      lineNumberElement.className = 'text-gray-500';
      lineNumberElement.textContent = lineNumber.toString();

      // Add line with highlighting if there are issues
      if (issuesOnLine.length > 0 && issuesOnLine[0] && issuesOnLine[0].issueType) {
        const issueClass = getIssueHighlightClass(issuesOnLine[0].issueType);
        // Safely escape line content to prevent XSS
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        result += `<span class="${issueClass}">${escapedLine}</span>`;
      } else {
        // Safely escape line content to prevent XSS
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        result += escapedLine;
      }

      // Add line break
      if (index < lines.length - 1) {
        result += '\n';
      }
    });

    return result;
  };

  // Get highlighting class based on issue type
  const getIssueHighlightClass = (issueType: string) => {
    if (!issueType) return '';

    switch (issueType) {
      case 'bug':
        return 'bg-red-100 p-1 rounded';
      case 'warning':
        return 'bg-yellow-100 p-1 rounded';
      case 'info':
        return 'bg-blue-100 p-1 rounded';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-4">
      <div className="flex items-center border-b px-4 py-2">
        <span className="text-sm font-medium">{file.filePath || 'Unknown file'}</span>
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
            <code dangerouslySetInnerHTML={{ __html: prepareCodeWithIssues() }} />
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeViewer;