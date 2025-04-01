import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { insertRepositorySchema, insertCodeIssueSchema, insertRepositoryFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// GitHub API base URL
const GITHUB_API_BASE_URL = "https://api.github.com";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix with /api
  
  // Get repository information
  app.get("/api/repository", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "Repository URL is required" });
      }
      
      // Extract owner and repo name from GitHub URL
      // Format could be: https://github.com/owner/repo or github.com/owner/repo
      const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
      const match = url.match(urlPattern);
      
      if (!match) {
        return res.status(400).json({ message: "Invalid GitHub repository URL" });
      }
      
      const [, owner, repo] = match;
      const fullName = `${owner}/${repo}`;
      
      // Check if repository exists in our storage
      let repository = await storage.getRepositoryByFullName(fullName);
      
      if (!repository) {
        // Fetch repository data from GitHub API
        try {
          const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${fullName}`, {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "CodeReview-Tool",
            },
          });
          
          const repoData = response.data;
          
          // Create repository in our storage
          const newRepo = insertRepositorySchema.parse({
            fullName: repoData.full_name,
            name: repoData.name,
            owner: repoData.owner.login,
            description: repoData.description,
            url: repoData.html_url,
            visibility: repoData.private ? "Private" : "Public",
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            watchers: repoData.watchers_count,
            issues: repoData.open_issues_count,
            pullRequests: 0, // We'll fetch this separately
            language: repoData.language,
            lastUpdated: new Date(repoData.updated_at),
            codeQuality: Math.floor(Math.random() * 30) + 70, // Simulated score
            testCoverage: Math.floor(Math.random() * 40) + 60, // Simulated coverage
            issuesCount: 0,
            metaData: { owner: repoData.owner },
            fileStructure: {}
          });
          
          repository = await storage.createRepository(newRepo);
          
          // Fetch repository file structure
          await fetchRepositoryFiles(fullName, repository.id);
          
          // Generate some simulated code issues
          await generateCodeIssues(repository.id);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({ 
              message: `GitHub API error: ${error.response.data.message || "Unknown error"}` 
            });
          }
          return res.status(500).json({ message: "Failed to fetch repository data" });
        }
      }
      
      // Return repository data along with files and issues
      const files = await storage.getFilesByRepositoryId(repository.id);
      const issues = await storage.getIssuesByRepositoryId(repository.id);
      
      return res.json({
        repository,
        files,
        issues
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get file content
  app.get("/api/file", async (req, res) => {
    try {
      const { repo, path } = req.query;
      
      if (!repo || typeof repo !== "string" || !path || typeof path !== "string") {
        return res.status(400).json({ message: "Repository and file path are required" });
      }
      
      // Get repository by fullName
      const repository = await storage.getRepositoryByFullName(repo);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Get file by path
      const file = await storage.getFileByPath(repository.id, path);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // If file content is not cached, fetch from GitHub
      if (!file.content) {
        try {
          // Encode file path for GitHub API
          const encodedPath = encodeURIComponent(path);
          const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${repo}/contents/${encodedPath}`, {
            headers: {
              Accept: "application/vnd.github.v3.raw",
              "User-Agent": "CodeReview-Tool",
            },
          });
          
          // Update file with content
          file.content = response.data;
          
          // Get issues for this file
          const issues = await storage.getIssuesByRepositoryId(repository.id);
          const fileIssues = issues.filter(issue => issue.filePath === path);
          
          return res.json({ file, issues: fileIssues });
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({ 
              message: `GitHub API error: ${error.response.data.message || "Unknown error"}` 
            });
          }
          return res.status(500).json({ message: "Failed to fetch file content" });
        }
      }
      
      // Get issues for this file
      const issues = await storage.getIssuesByRepositoryId(repository.id);
      const fileIssues = issues.filter(issue => issue.filePath === path);
      
      return res.json({ file, issues: fileIssues });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Helper function to fetch repository files
  async function fetchRepositoryFiles(fullName: string, repositoryId: number) {
    try {
      const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${fullName}/contents`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeReview-Tool",
        },
      });
      
      const files = response.data;
      
      // Create file entries
      for (const file of files) {
        const fileData = insertRepositoryFileSchema.parse({
          repositoryId,
          filePath: file.path,
          type: file.type, // file or dir
          language: getLanguageFromPath(file.path),
          content: null, // We'll fetch content on demand
        });
        
        await storage.createRepositoryFile(fileData);
      }
      
      return true;
    } catch (error) {
      console.error("Error fetching repository files:", error);
      return false;
    }
  }
  
  // Helper function to generate simulated code issues for demo
  async function generateCodeIssues(repositoryId: number) {
    const files = await storage.getFilesByRepositoryId(repositoryId);
    const codeFiles = files.filter(file => file.type === "file" && file.language !== null);
    
    if (codeFiles.length === 0) return;
    
    // Add sample issues for the first few code files
    for (let i = 0; i < Math.min(3, codeFiles.length); i++) {
      const file = codeFiles[i];
      
      // Add a bug issue
      await storage.createCodeIssue({
        repositoryId,
        filePath: file.filePath,
        lineNumber: Math.floor(Math.random() * 20) + 5,
        issueType: "bug",
        severity: "high",
        message: "Missing validation before using value",
        code: "result = processValue(input)",
        suggestion: "if (input !== null && input !== undefined) { result = processValue(input); }"
      });
      
      // Add a warning issue
      await storage.createCodeIssue({
        repositoryId,
        filePath: file.filePath,
        lineNumber: Math.floor(Math.random() * 20) + 30,
        issueType: "warning",
        severity: "medium",
        message: "Magic number in code",
        code: "if (retries > 3) { /* ... */ }",
        suggestion: "const MAX_RETRIES = 3;\nif (retries > MAX_RETRIES) { /* ... */ }"
      });
      
      // Add an info issue
      await storage.createCodeIssue({
        repositoryId,
        filePath: file.filePath,
        lineNumber: Math.floor(Math.random() * 20) + 50,
        issueType: "info",
        severity: "low",
        message: "Missing function documentation",
        code: "function process(data) { /* ... */ }",
        suggestion: "/**\n * Process the input data\n * @param {Object} data - The data to process\n * @returns {Object} The processed result\n */\nfunction process(data) { /* ... */ }"
      });
    }
  }
  
  // Helper function to determine language from file path
  function getLanguageFromPath(path: string): string | null {
    const extension = path.split('.').pop()?.toLowerCase();
    
    if (!extension) return null;
    
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      ts: 'TypeScript',
      jsx: 'JavaScript',
      tsx: 'TypeScript',
      py: 'Python',
      java: 'Java',
      rb: 'Ruby',
      php: 'PHP',
      go: 'Go',
      rs: 'Rust',
      c: 'C',
      cpp: 'C++',
      cs: 'C#',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      md: 'Markdown',
    };
    
    return languageMap[extension] || null;
  }

  const httpServer = createServer(app);
  return httpServer;
}
