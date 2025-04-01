import { useEffect, useRef } from 'react';
import { RepositoryFile, CodeIssue } from '../types';
import { Skeleton } from "@/components/ui/skeleton";

interface CodeViewerProps {
  file: RepositoryFile;
  issues: CodeIssue[];
  isLoading: boolean;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file, issues, isLoading }) => {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Highlight code using Prism.js when the component mounts or file changes
    if (file.content && !isLoading && preRef.current) {
      if ((window as any).Prism) {
        (window as any).Prism.highlightElement(preRef.current);
      }
    }
  }, [file.content, isLoading]);

  // Determine the language class for syntax highlighting
  const getLanguageClass = () => {
    if (!file.language) return 'language-plaintext';
    
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
    if (!file.content) return '';
    
    const lines = file.content.split('\n');
    let result = '';
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const issuesOnLine = issues.filter(i => i.lineNumber === lineNumber);
      
      // Add line number
      result += `<span class="text-gray-500">${lineNumber}</span> `;
      
      // Add line with highlighting if there are issues
      if (issuesOnLine.length > 0) {
        const issueClass = getIssueHighlightClass(issuesOnLine[0].issueType);
        result += `<span class="${issueClass}">${line}</span>`;
      } else {
        result += line;
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
        <span className="text-sm font-medium">{file.filePath}</span>
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
