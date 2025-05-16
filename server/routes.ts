import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { insertRepositorySchema, insertCodeIssueSchema, insertRepositoryFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// GitHub API base URL
const GITHUB_API_BASE_URL = "https://api.github.com";

// GitHub Authentication token (to increase rate limit)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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
          const headers: Record<string, string> = {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "CodeReview-Tool",
          };
          
          // Add authorization header if token exists
          if (GITHUB_TOKEN) {
              headers["Authorization"] = `token ${GITHUB_TOKEN}`;
          }
          
          const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${fullName}`, {
            headers,
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
          const headers: Record<string, string> = {
              Accept: "application/vnd.github.v3.raw",
              "User-Agent": "CodeReview-Tool",
          };
          
          // Add authorization header if token exists
          if (GITHUB_TOKEN) {
              headers["Authorization"] = `token ${GITHUB_TOKEN}`;
          }
          
          const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${repo}/contents/${encodedPath}`, {
            headers,
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
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CodeReview-Tool",
      };
      
      // Add authorization header if token exists
      if (GITHUB_TOKEN) {
        headers["Authorization"] = `token ${GITHUB_TOKEN}`;
      }
      
      const response = await axios.get(`${GITHUB_API_BASE_URL}/repos/${fullName}/contents`, {
        headers,
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

  // Get user repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "GitHub username is required" });
      }
      
      // Fetch user repositories from GitHub API
      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeReview-Tool",
        };
        
        // Add authorization header if token exists
        if (GITHUB_TOKEN) {
          headers["Authorization"] = `token ${GITHUB_TOKEN}`;
        }
        
        const response = await axios.get(`${GITHUB_API_BASE_URL}/users/${username}/repos`, {
          headers,
        });
        
        const repositories = await Promise.all(
          response.data.map(async (repoData: any) => {
            // Check if repository exists in our storage
            let repository = await storage.getRepositoryByFullName(repoData.full_name);
            
            if (!repository) {
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
                pullRequests: 0,
                language: repoData.language,
                lastUpdated: new Date(repoData.updated_at),
                codeQuality: Math.floor(Math.random() * 30) + 70, // Simulated score
                testCoverage: Math.floor(Math.random() * 40) + 60, // Simulated coverage
                issuesCount: 0,
                metaData: { owner: repoData.owner },
                fileStructure: {}
              });
              
              repository = await storage.createRepository(newRepo);
            }
            
            return repository;
          })
        );
        
        return res.json({ repositories });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          return res.status(error.response.status).json({ 
            message: `GitHub API error: ${error.response.data.message || "Unknown error"}` 
          });
        }
        return res.status(500).json({ message: "Failed to fetch user repositories" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Compare repositories
  app.post("/api/compare-repositories", async (req, res) => {
    try {
      const { repositoryIds } = req.body;
      
      if (!repositoryIds || !Array.isArray(repositoryIds) || repositoryIds.length < 2) {
        return res.status(400).json({ message: "At least two repository IDs are required" });
      }
      
      // Fetch repository data
      const repositories = await Promise.all(
        repositoryIds.map(id => storage.getRepository(id))
      );
      
      // Filter out any undefined repositories
      const validRepositories = repositories.filter(repo => repo !== undefined) as any[];
      
      if (validRepositories.length < 2) {
        return res.status(400).json({ message: "At least two valid repositories are required" });
      }
      
      // Fetch files for each repository
      const repoFiles = await Promise.all(
        validRepositories.map(repo => storage.getFilesByRepositoryId(repo.id))
      );
      
      // Combine repository data with files
      const reposWithFiles = validRepositories.map((repo, index) => ({
        ...repo,
        files: repoFiles[index]
      }));
      
      // Find overlaps in files
      const overlaps = findRepositoryOverlaps(reposWithFiles);
      
      // Calculate project overview
      const projectOverview = calculateProjectOverview(reposWithFiles);
      
      return res.json({
        overlaps,
        projectOverview
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Scan all repositories
  app.get("/api/scan-repositories", async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "GitHub username is required" });
      }
      
      // Fetch user repositories
      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeReview-Tool",
        };
        
        // Add authorization header if token exists
        if (GITHUB_TOKEN) {
          headers["Authorization"] = `token ${GITHUB_TOKEN}`;
        }
        
        const response = await axios.get(`${GITHUB_API_BASE_URL}/users/${username}/repos`, {
          headers,
        });
        
        // Process each repository
        const repositories = await Promise.all(
          response.data.map(async (repoData: any) => {
            // Check if repository exists in our storage
            let repository = await storage.getRepositoryByFullName(repoData.full_name);
            
            if (!repository) {
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
                pullRequests: 0,
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
              await fetchRepositoryFiles(repoData.full_name, repository.id);
              
              // Generate code issues
              await generateCodeIssues(repository.id);
            }
            
            return repository;
          })
        );
        
        // Fetch files for each repository
        const repoFiles = await Promise.all(
          repositories.map(repo => storage.getFilesByRepositoryId(repo.id))
        );
        
        // Combine repository data with files
        const reposWithFiles = repositories.map((repo, index) => ({
          ...repo,
          files: repoFiles[index]
        }));
        
        // Find overlaps in files
        const overlaps = findRepositoryOverlaps(reposWithFiles);
        
        // Calculate project overview
        const projectOverview = calculateProjectOverview(reposWithFiles);
        
        return res.json({
          overlaps,
          projectOverview
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          return res.status(error.response.status).json({ 
            message: `GitHub API error: ${error.response.data.message || "Unknown error"}` 
          });
        }
        return res.status(500).json({ message: "Failed to scan repositories" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Helper function to identify overlaps and similarities between repositories
  function findRepositoryOverlaps(reposWithFiles: any[]) {
    const overlaps: any[] = [];
    
    // Define minimum similarity threshold
    const MIN_SIMILARITY = 0.5;
    
    // Compare each repository with every other repository
    for (let i = 0; i < reposWithFiles.length; i++) {
      for (let j = i + 1; j < reposWithFiles.length; j++) {
        const repo1 = reposWithFiles[i];
        const repo2 = reposWithFiles[j];
        
        // Skip if repositories don't have files
        if (!repo1.files || !repo2.files) continue;
        
        const similarFiles: any[] = [];
        
        // Find similar files between repositories
        for (const file1 of repo1.files) {
          for (const file2 of repo2.files) {
            // Skip if files are not of the same type or language
            if (file1.type !== 'file' || file2.type !== 'file') continue;
            if (!file1.language || !file2.language || file1.language !== file2.language) continue;
            
            // Calculate similarity based on file path
            const similarityScore = calculateFileSimilarity(file1, file2);
            
            if (similarityScore >= MIN_SIMILARITY) {
              similarFiles.push({
                file1: {
                  repositoryId: file1.repositoryId,
                  filePath: file1.filePath,
                  language: file1.language,
                },
                file2: {
                  repositoryId: file2.repositoryId,
                  filePath: file2.filePath,
                  language: file2.language,
                },
                similarityScore,
              });
            }
          }
        }
        
        // If we found similar files, create an overlap entry
        if (similarFiles.length > 0) {
          const description = generateOverlapDescription(repo1, repo2, similarFiles);
          const mergeRecommendation = generateMergeRecommendation(repo1, repo2, similarFiles);
          
          overlaps.push({
            repositories: [
              { id: repo1.id, name: repo1.name, fullName: repo1.fullName },
              { id: repo2.id, name: repo2.name, fullName: repo2.fullName },
            ],
            similarFiles,
            description,
            mergeRecommendation,
          });
        }
      }
    }
    
    return overlaps;
  }
  
  // Helper function to calculate project overview metrics
  function calculateProjectOverview(reposWithFiles: any[]) {
    // Total repositories
    const totalRepositories = reposWithFiles.length;
    
    // Count total files and calculate language distribution
    let totalFiles = 0;
    const languageCount: Record<string, number> = {};
    
    for (const repo of reposWithFiles) {
      if (repo.files) {
        for (const file of repo.files) {
          if (file.type === 'file') {
            totalFiles++;
            
            if (file.language) {
              languageCount[file.language] = (languageCount[file.language] || 0) + 1;
            }
          }
        }
      }
    }
    
    // Calculate duplicate code percentage using overlaps
    const overlaps = findRepositoryOverlaps(reposWithFiles);
    let duplicateFileCount = 0;
    
    for (const overlap of overlaps) {
      duplicateFileCount += overlap.similarFiles.length;
    }
    
    const duplicateCodePercentage = totalFiles > 0 ? (duplicateFileCount / totalFiles) * 100 : 0;
    
    return {
      totalRepositories,
      totalFiles,
      languageDistribution: languageCount,
      duplicateCodePercentage,
    };
  }
  
  // Helper function to calculate similarity between two files
  function calculateFileSimilarity(file1: any, file2: any) {
    // Simple similarity based on file names
    const fileName1 = file1.filePath.split('/').pop() || '';
    const fileName2 = file2.filePath.split('/').pop() || '';
    
    // Use Levenshtein distance for file name similarity
    const distance = levenshteinDistance(fileName1, fileName2);
    const maxLength = Math.max(fileName1.length, fileName2.length);
    
    // Normalize distance to a similarity score between 0 and 1
    const nameSimilarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;
    
    // Use file path structure for additional similarity
    const pathParts1 = file1.filePath.split('/');
    const pathParts2 = file2.filePath.split('/');
    
    // Calculate path structure similarity
    let commonPathParts = 0;
    for (let i = 0; i < Math.min(pathParts1.length, pathParts2.length); i++) {
      if (pathParts1[i] === pathParts2[i]) {
        commonPathParts++;
      }
    }
    
    const pathSimilarity = Math.min(pathParts1.length, pathParts2.length) > 0 
      ? commonPathParts / Math.min(pathParts1.length, pathParts2.length) 
      : 0;
    
    // Calculate a combined similarity score (weighted more towards file name)
    return (nameSimilarity * 0.7) + (pathSimilarity * 0.3);
  }
  
  // Helper function for Levenshtein distance calculation
  function levenshteinDistance(a: string, b: string) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize the matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Calculate the distances
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  // Helper function to generate overlap description
  function generateOverlapDescription(repo1: any, repo2: any, similarFiles: any[]) {
    const languages = new Set<string>();
    
    // Collect unique languages from similar files
    similarFiles.forEach(item => {
      if (item.file1.language) {
        languages.add(item.file1.language);
      }
    });
    
    const languagesStr = Array.from(languages).join(', ');
    const filesCount = similarFiles.length;
    
    return `Found ${filesCount} similar ${filesCount === 1 ? 'file' : 'files'} between repositories ${repo1.name} and ${repo2.name}. 
    These repositories share code patterns in ${languagesStr}. There may be opportunities to consolidate functionality.`;
  }
  
  // Helper function to generate merge recommendation
  function generateMergeRecommendation(repo1: any, repo2: any, similarFiles: any[]) {
    const totalFiles = similarFiles.length;
    const averageSimilarity = similarFiles.reduce((sum, item) => sum + item.similarityScore, 0) / totalFiles;
    
    if (averageSimilarity > 0.8) {
      return `High similarity detected. Consider merging ${repo1.name} and ${repo2.name} into a single repository to reduce duplication and maintenance overhead.`;
    } else if (averageSimilarity > 0.6) {
      return `Moderate similarity detected. Consider creating shared libraries or modules for common functionality between ${repo1.name} and ${repo2.name}.`;
    } else {
      return `Low similarity detected. The common patterns may be coincidental, but review the similar files to identify potential opportunities for code reuse.`;
    }
  }
  
  const httpServer = createServer(app);
  return httpServer;
}
