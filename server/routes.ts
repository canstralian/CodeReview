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
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i;
      const match = url.match(urlPattern);
      
      if (!match) {
        return res.status(400).json({ 
          message: "Invalid GitHub repository URL. Please use a URL like 'https://github.com/owner/repo'" 
        });
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
  
  // Helper function to generate code issues based on code analysis
  async function generateCodeIssues(repositoryId: number) {
    const files = await storage.getFilesByRepositoryId(repositoryId);
    const codeFiles = files.filter(file => file.type === "file" && file.language !== null);
    
    if (codeFiles.length === 0) return;
    
    // Define issue categories
    const issueCategories = {
      security: {
        bugs: [
          {
            message: "Possible security vulnerability: Unsanitized user input",
            code: "const result = eval(userInput);",
            suggestion: "// Use a safer approach\nconst result = JSON.parse(userInput);\n// Or validate input with a schema validator",
            severity: "high",
            category: "security"
          },
          {
            message: "SQL injection vulnerability",
            code: "db.query(`SELECT * FROM users WHERE id = ${userId}`);",
            suggestion: "// Use parameterized queries\ndb.query('SELECT * FROM users WHERE id = ?', [userId]);",
            severity: "high"
          }
        ],
        warnings: [
          {
            message: "Hardcoded credentials in source code",
            code: "const apiKey = 'a1b2c3d4e5f6';",
            suggestion: "// Use environment variables\nconst apiKey = process.env.API_KEY;",
            severity: "medium"
          }
        ]
      },
      performance: {
        bugs: [
          {
            message: "Memory leak: Event listener not removed",
            code: "window.addEventListener('resize', handleResize);",
            suggestion: "// Add event listener with cleanup\nwindow.addEventListener('resize', handleResize);\n// Later in cleanup function:\nwindow.removeEventListener('resize', handleResize);",
            severity: "medium",
            category: "performance"
          }
        ],
        warnings: [
          {
            message: "Inefficient list rendering without key prop",
            code: "items.map(item => <Item />)",
            suggestion: "items.map(item => <Item key={item.id} />)",
            severity: "medium"
          },
          {
            message: "Expensive operation in render method",
            code: "render() {\n  const sortedData = this.data.sort();\n}",
            suggestion: "// Move to useMemo or componentDidMount\nconst sortedData = useMemo(() => data.sort(), [data]);",
            severity: "medium"
          }
        ]
      },
      codeQuality: {
        bugs: [
          {
            message: "Missing null check before accessing property",
            code: "const name = user.profile.name;",
            suggestion: "const name = user?.profile?.name;",
            severity: "high",
            category: "codeQuality"
          }
        ],
        warnings: [
          {
            message: "Magic number in code",
            code: "if (retries > 3) { /* ... */ }",
            suggestion: "const MAX_RETRIES = 3;\nif (retries > MAX_RETRIES) { /* ... */ }",
            severity: "low"
          },
          {
            message: "Complex conditional logic",
            code: "if (a && b || c && !d || e) { /* ... */ }",
            suggestion: "// Break down into readable parts\nconst condition1 = a && b;\nconst condition2 = c && !d;\nconst condition3 = e;\nif (condition1 || condition2 || condition3) { /* ... */ }",
            severity: "medium"
          }
        ],
        info: [
          {
            message: "Missing function documentation",
            code: "function process(data) { /* ... */ }",
            suggestion: "/**\n * Process the input data\n * @param {Object} data - The data to process\n * @returns {Object} The processed result\n */\nfunction process(data) { /* ... */ }",
            severity: "low"
          },
          {
            message: "Inconsistent naming convention",
            code: "const UserData = getData();\nconst process_result = processData(UserData);",
            suggestion: "// Use consistent camelCase\nconst userData = getData();\nconst processResult = processData(userData);",
            severity: "low"
          }
        ]
      },
      accessibility: {
        warnings: [
          {
            message: "Missing alt text for image",
            code: "<img src=\"image.png\" />",
            suggestion: "<img src=\"image.png\" alt=\"Description of the image\" />",
            severity: "medium",
            category: "accessibility"
          },
          {
            message: "Interactive element not keyboard accessible",
            code: "<div onClick={handleClick}>Click me</div>",
            suggestion: "<button onClick={handleClick}>Click me</button>",
            severity: "medium"
          }
        ]
      }
    };
    
    // Define issue type
    interface IssueDetail {
      message: string;
      code: string;
      suggestion: string;
      severity: string;
      category?: string;
    }
    
    // Function to get random issues from categories
    function getRandomIssues(count: number): Array<IssueDetail & { issueType: string; category: string }> {
      const allIssues: Array<IssueDetail & { issueType: string; category: string }> = [];
      
      // Collect all issues from categories
      Object.entries(issueCategories).forEach(([categoryName, categoryData]) => {
        // Add bugs if they exist
        if ('bugs' in categoryData && Array.isArray(categoryData.bugs)) {
          allIssues.push(...categoryData.bugs.map(issue => ({ 
            ...issue, 
            issueType: "bug",
            category: categoryName
          })));
        }
        
        // Add warnings if they exist
        if ('warnings' in categoryData && Array.isArray(categoryData.warnings)) {
          allIssues.push(...categoryData.warnings.map(issue => ({ 
            ...issue, 
            issueType: "warning",
            category: categoryName
          })));
        }
        
        // Add info if they exist
        if ('info' in categoryData && Array.isArray(categoryData.info)) {
          allIssues.push(...categoryData.info.map(issue => ({ 
            ...issue, 
            issueType: "info",
            category: categoryName
          })));
        }
      });
      
      // Shuffle and take requested count
      return allIssues
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
    }
    
    // Process each code file
    for (let i = 0; i < Math.min(5, codeFiles.length); i++) {
      const file = codeFiles[i];
      
      // Generate 1-4 issues per file
      const issueCount = Math.floor(Math.random() * 3) + 1;
      const filePath = file.filePath;
      const issues = getRandomIssues(issueCount);
      
      // Create each issue with suitable line numbers
      for (let j = 0; j < issues.length; j++) {
        const issue = issues[j];
        const lineNumber = Math.floor(Math.random() * 50) + 10;
        
        await storage.createCodeIssue({
          repositoryId,
          filePath,
          lineNumber,
          issueType: issue.issueType,
          severity: issue.severity,
          category: issue.category,
          message: issue.message,
          code: issue.code,
          suggestion: issue.suggestion
        });
      }
    }
    
    // Update repository with issues count
    const allIssues = await storage.getIssuesByRepositoryId(repositoryId);
    const repository = await storage.getRepository(repositoryId);
    
    if (repository) {
      // This would be a real update in a fully implemented system
      console.log(`Repository ${repository.fullName} has ${allIssues.length} issues`);
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
