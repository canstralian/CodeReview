/**
 * GitHub API Client Service
 * 
 * A TypeScript service for interacting with the GitHub REST API v3.
 * Handles repository operations, file fetching, and API authentication.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubUserRepository {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export class GitHubClient {
  private readonly baseURL: string = 'https://api.github.com';
  private readonly client: AxiosInstance;
  private readonly token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || process.env.GH_ACCESS_TOKEN;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeReview-Tool/1.0',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      timeout: 10000, // 10 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // GitHub API error response
          const status = error.response.status;
          const message = error.response.data?.message || 'GitHub API error';
          
          if (status === 401) {
            throw new Error('GitHub API authentication failed. Please check your token.');
          } else if (status === 403) {
            throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
          } else if (status === 404) {
            throw new Error('Repository or resource not found.');
          }
          
          throw new Error(`GitHub API error (${status}): ${message}`);
        }
        
        throw new Error('Failed to connect to GitHub API. Please check your internet connection.');
      }
    );
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response: AxiosResponse<GitHubRepository> = await this.client.get(
        `/repos/${owner}/${repo}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch repository ${owner}/${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repository contents at a specific path
   */
  async getRepositoryContents(
    owner: string,
    repo: string,
    path: string = ''
  ): Promise<GitHubFile[]> {
    try {
      const response: AxiosResponse<GitHubFile | GitHubFile[]> = await this.client.get(
        `/repos/${owner}/${repo}/contents/${path}`
      );
      
      // GitHub API returns a single file object if path points to a file,
      // or an array if it points to a directory
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      throw new Error(`Failed to fetch contents for ${owner}/${repo}${path ? `/${path}` : ''}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file content (for files only)
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      const response: AxiosResponse<GitHubFile> = await this.client.get(
        `/repos/${owner}/${repo}/contents/${path}`
      );
      
      const file = response.data;
      
      if (file.type !== 'file') {
        throw new Error(`Path ${path} is not a file`);
      }
      
      if (!file.content) {
        throw new Error(`No content available for file ${path}`);
      }
      
      // Decode base64 content
      return Buffer.from(file.content, 'base64').toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to fetch file content for ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(
    username: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<GitHubRepository[]> {
    try {
      const response: AxiosResponse<GitHubRepository[]> = await this.client.get(
        `/users/${username}/repos`,
        {
          params: {
            page,
            per_page: perPage,
            sort: 'updated',
            direction: 'desc'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch repositories for user ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search repositories
   */
  async searchRepositories(
    query: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<GitHubUserRepository> {
    try {
      const response: AxiosResponse<GitHubUserRepository> = await this.client.get(
        '/search/repositories',
        {
          params: {
            q: query,
            page,
            per_page: perPage,
            sort: 'updated',
            order: 'desc'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repository tree (recursive directory listing)
   */
  async getRepositoryTree(
    owner: string,
    repo: string,
    sha: string = 'HEAD',
    recursive: boolean = true
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/repos/${owner}/${repo}/git/trees/${sha}`,
        {
          params: {
            recursive: recursive ? 1 : 0
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch repository tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the client has authentication
   */
  hasAuthentication(): boolean {
    return !!this.token;
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<any> {
    try {
      const response = await this.client.get('/rate_limit');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    return null;
  }
}

export default GitHubClient;