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
  category?: 'security' | 'performance' | 'codeQuality' | 'accessibility' | string;
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

// User repositories response
export interface UserRepositoriesResponse {
  repositories: Repository[];
}

// Repository comparison item
export interface RepositoryComparisonItem {
  repositoryId: number;
  repositoryName: string;
  filePath: string;
  language: string | null;
  similarity: number; // 0-1 scale
}

// Repository overlap
export interface RepositoryOverlap {
  repositories: {
    id: number;
    name: string;
    fullName: string;
  }[];
  similarFiles: {
    file1: {
      repositoryId: number;
      filePath: string;
      language: string | null;
    };
    file2: {
      repositoryId: number;
      filePath: string;
      language: string | null;
    };
    similarityScore: number;
  }[];
  description: string;
  mergeRecommendation: string;
}

// Repository comparison response
export interface RepositoryComparisonResponse {
  overlaps: RepositoryOverlap[];
  projectOverview: {
    totalRepositories: number;
    totalFiles: number;
    languageDistribution: Record<string, number>;
    duplicateCodePercentage: number;
  };
}
