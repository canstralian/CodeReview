import { useState } from "react";
import type { RepositoryAnalysisResponse, RepositoryFile, CodeIssue } from "../types";
import { formatDate, formatNumber } from "../lib/github";
import FileExplorer from "./FileExplorer";
import CodeViewer from "./CodeViewer";
import IssuesList from "./IssuesList";
import ReplitAgent from "./ReplitAgent";
import { useMutation } from "@tanstack/react-query";
import { getFileWithIssues } from "../lib/github";
import { useToast } from "@/hooks/use-toast";

interface RepositoryViewProps {
  data: RepositoryAnalysisResponse;
}

const RepositoryView: React.FC<RepositoryViewProps> = ({ data }) => {
  // Safely destructure data with defaults in case of undefined properties
  const { 
    repository = {} as any, 
    files = [], 
    issues = [] 
  } = data || {};

  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileIssues, setFileIssues] = useState<CodeIssue[]>([]);
  const { toast } = useToast();

  const fileContentMutation = useMutation({
    mutationFn: ({ repo, path }: { repo: string; path: string }) => 
      getFileWithIssues(repo, path),
    onSuccess: (data) => {
      setSelectedFile(data.file);
      setFileIssues(data.issues);
    },
    onError: (error) => {
      toast({
        title: "Error loading file",
        description: error instanceof Error ? error.message : "Failed to load file content.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: RepositoryFile) => {
    // Skip if file is invalid or repository name is missing
    if (!file || !repository || !repository.fullName || !file.filePath) {
      toast({
        title: "Error",
        description: "Invalid file or repository information",
        variant: "destructive",
      });
      return;
    }

    // Only fetch content for files, not directories
    if (file.type === "file") {
      fileContentMutation.mutate({ 
        repo: repository.fullName, 
        path: file.filePath 
      });
    }
  };

  const handleFixIssue = (issue: CodeIssue) => {
    toast({
      title: "Fix Applied",
      description: "This would apply the suggested fix in a real implementation. The code would be updated and file refreshed.",
    });
  };

  return (
    <div className="w-full max-w-5xl mt-8 mb-16">
      {/* Repository header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap">
          <div>
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-[#202124]">{repository.fullName}</h2>
              <span className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{repository.visibility}</span>
            </div>
            <p className="text-gray-600 mt-1">{repository.description}</p>
          </div>
          <div className="flex space-x-3 text-sm mt-2 sm:mt-0">
            <div className="flex items-center">
              <i className="fas fa-star text-[#FBBC05] mr-1"></i>
              <span>{formatNumber(repository.stars)}</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-code-branch text-[#4285F4] mr-1"></i>
              <span>{formatNumber(repository.forks)}</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-eye text-[#34A853] mr-1"></i>
              <span>{formatNumber(repository.watchers)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap text-sm text-gray-600">
          {repository.language && (
            <div className="mr-6 mb-2">
              <i className="fas fa-code mr-1"></i>
              <span>{repository.language}</span>
            </div>
          )}
          <div className="mr-6 mb-2">
            <i className="fas fa-calendar-alt mr-1"></i>
            <span>Updated {formatDate(repository.lastUpdated)}</span>
          </div>
          <div className="mr-6 mb-2">
            <i className="fas fa-exclamation-circle mr-1"></i>
            <span>{repository.issues} issues</span>
          </div>
          <div className="mb-2">
            <i className="fas fa-code-pull-request mr-1"></i>
            <span>{repository.pullRequests} pull requests</span>
          </div>
        </div>
      </div>

      {/* Analysis overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Code Analysis Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded border border-blue-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Code Quality</span>
              <span className="text-[#4285F4] font-medium">{repository.codeQuality}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[#4285F4] h-2 rounded-full" style={{ width: `${repository.codeQuality}%` }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {repository.codeQuality > 80 
                ? "Good structure with some complex functions that could be refactored." 
                : "Several code quality issues detected. Review recommended."}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded border border-red-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Potential Issues</span>
              <span className="text-[#EA4335] font-medium">{issues.length} issues</span>
            </div>
            <div className="flex text-sm text-gray-600 mt-2">
              <span className="mr-3">
                <i className="fas fa-bug mr-1 text-[#EA4335]"></i> 
                {issues.filter(i => i.issueType === 'bug').length} bugs
              </span>
              <span className="mr-3">
                <i className="fas fa-exclamation-triangle mr-1 text-[#FBBC05]"></i> 
                {issues.filter(i => i.issueType === 'warning').length} warnings
              </span>
              <span>
                <i className="fas fa-info-circle mr-1 text-[#4285F4]"></i> 
                {issues.filter(i => i.issueType === 'info').length} infos
              </span>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Test Coverage</span>
              <span className="text-[#34A853] font-medium">{repository.testCoverage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[#34A853] h-2 rounded-full" style={{ width: `${repository.testCoverage}%` }}></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {repository.testCoverage > 70 
                ? "Core components are well-tested. UI components need more tests." 
                : "Test coverage is below recommended levels. More tests needed."}
            </p>
          </div>
        </div>
      </div>

      {/* Repository explorer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File structure */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Repository Structure</h3>
          <FileExplorer 
            files={files} 
            onSelectFile={handleFileSelect} 
            selectedFilePath={selectedFile?.filePath}
            isLoading={fileContentMutation.isPending}
          />
        </div>

        {/* Code viewer with highlighted code and issues */}
        <div className="md:col-span-2">
          {selectedFile && selectedFile.content ? (
            <>
              <CodeViewer 
                file={selectedFile} 
                issues={fileIssues} 
                isLoading={fileContentMutation.isPending} 
              />

              <IssuesList 
                issues={fileIssues} 
                onFixIssue={handleFixIssue} 
              />
              
              {/* Replit Agent Integration */}
              <div className="mt-6">
                <ReplitAgent 
                  code={selectedFile.content}
                  filePath={selectedFile.filePath}
                  language={selectedFile.language || undefined}
                  repositoryId={repository.id}
                />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-500">
              {fileContentMutation.isPending ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#4285F4] border-solid mb-3"></div>
                  <p>Loading file content...</p>
                </div>
              ) : (
                <>
                  <i className="fas fa-file-code text-4xl mb-3 text-gray-400"></i>
                  <p>Select a file from the repository structure to view its content and issues.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositoryView;