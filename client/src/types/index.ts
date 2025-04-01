// Repository types
export interface Repository {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  url: string;
  visibility: string;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  pullRequests: number;
  language: string | null;
  lastUpdated: string; // ISO date string
  codeQuality: number;
  testCoverage: number;
  issuesCount: number;
  metaData: any;
  fileStructure: any;
}

// Repository file types
export interface RepositoryFile {
  id: number;
  repositoryId: number;
  filePath: string;
  type: 'file' | 'dir';
  content: string | null;
  language: string | null;
}

// Code issue types
export interface CodeIssue {
  id: number;
  repositoryId: number;
  filePath: string;
  lineNumber: number;
  issueType: 'bug' | 'warning' | 'info';
  severity: 'high' | 'medium' | 'low';
  message: string;
  code: string;
  suggestion: string | null;
}

// Repository analysis response
export interface RepositoryAnalysisResponse {
  repository: Repository;
  files: RepositoryFile[];
  issues: CodeIssue[];
}

// File with issues response
export interface FileWithIssuesResponse {
  file: RepositoryFile;
  issues: CodeIssue[];
}
