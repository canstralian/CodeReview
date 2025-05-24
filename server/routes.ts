import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import axios from "axios";
import { ZodError } from "zod";
import { insertRepositorySchema, insertCodeIssueSchema, insertRepositoryFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// GitHub API base URL
const GITHUB_API_BASE_URL = "https://api.github.com";

// GitHub Authentication token (to increase rate limit)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Code analysis utility functions
function detectLanguage(code: string): string {
  // Simple language detection based on keywords and syntax
  if (code.includes('import React') || code.includes('useState') || code.includes('export default')) {
    return 'javascript';
  } else if (code.includes('def ') && code.includes(':') && (code.includes('print(') || code.includes('return '))) {
    return 'python';
  } else if (code.includes('public class') || code.includes('private void') || code.includes('System.out.println')) {
    return 'java';
  } else if (code.includes('using namespace') || code.includes('#include') || code.includes('int main()')) {
    return 'cpp';
  } else {
    return 'unknown';
  }
}

// Security analysis for code snippets
function analyzeCodeSecurity(code: string, language: string): Array<any> {
  const securityIssues = [];

  // Common security issues across languages
  if (code.includes('eval(') || code.includes('exec(')) {
    securityIssues.push({
      type: 'security',
      severity: 'high',
      line: getLineNumber(code, 'eval('),
      message: 'Use of eval() or exec() can lead to code injection vulnerabilities',
      suggestion: 'Avoid using eval() or exec(). Use safer alternatives for dynamic code execution.'
    });
  }

  if (code.match(/password\s*=\s*['"][^'"]+['"]/) || code.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/) || code.match(/secret\s*=\s*['"][^'"]+['"]/) || code.match(/token\s*=\s*['"][^'"]+['"]/)) {
    securityIssues.push({
      type: 'security',
      severity: 'critical',
      line: getLineNumber(code, 'password'),
      message: 'Hardcoded credentials detected in source code',
      suggestion: 'Never hardcode credentials in source code. Use environment variables or a secure vault service.'
    });
  }

  if (code.includes('SELECT') && code.includes('FROM') && !code.includes('?') && (code.includes('${') || code.includes("' +") || code.includes("\" +"))) {
    securityIssues.push({
      type: 'security',
      severity: 'critical',
      line: getLineNumber(code, 'SELECT'),
      message: 'Potential SQL injection vulnerability',
      suggestion: 'Use parameterized queries instead of string concatenation for SQL statements.'
    });
  }

  // Language-specific security checks
  if (language === 'javascript') {
    if (code.includes('innerHTML') || code.includes('document.write(')) {
      securityIssues.push({
        type: 'security',
        severity: 'high',
        line: getLineNumber(code, 'innerHTML'),
        message: 'Potential XSS vulnerability with direct DOM manipulation',
        suggestion: 'Use textContent or safer alternatives like React\'s JSX to prevent XSS attacks.'
      });
    }
  } else if (language === 'python') {
    if (code.includes('pickle.loads') || code.includes('yaml.load(')) {
      securityIssues.push({
        type: 'security',
        severity: 'high',
        line: getLineNumber(code, 'pickle.loads'),
        message: 'Use of unsafe deserialization functions',
        suggestion: 'Use safer alternatives like pickle.loads(data, encoding="ASCII") or yaml.safe_load().'
      });
    }
  }

  return securityIssues;
}

// Code quality analysis
function analyzeCodeQuality(code: string, language: string): Array<any> {
  const qualityIssues = [];

  // Check for long functions (lines > 30)
  const lines = code.split('\n');
  if (lines.length > 30) {
    qualityIssues.push({
      type: 'quality',
      severity: 'medium',
      line: 1,
      message: 'Function is too long (exceeds 30 lines)',
      suggestion: 'Break down long functions into smaller, more focused functions with clear responsibilities.'
    });
  }

  // Check for deep nesting
  let maxIndentation = 0;
  let currentIndentation = 0;
  for (const line of lines) {
    const indentMatch = line.match(/^(\s+)/);
    currentIndentation = indentMatch ? indentMatch[1].length : 0;
    maxIndentation = Math.max(maxIndentation, currentIndentation);
  }

  if (maxIndentation >= 12) {  // More than 3 levels of indentation (assuming 4 spaces per level)
    qualityIssues.push({
      type: 'quality',
      severity: 'medium',
      line: 1,
      message: 'Deep nesting detected in code',
      suggestion: 'Refactor to reduce nesting. Consider extracting code into helper functions or using early returns.'
    });
  }

  // Language-specific quality checks
  if (language === 'javascript') {
    // Check for console.log statements
    if (code.includes('console.log(')) {
      qualityIssues.push({
        type: 'quality',
        severity: 'low',
        line: getLineNumber(code, 'console.log'),
        message: 'Debug console.log() statements should be removed in production code',
        suggestion: 'Remove debug statements or replace with a proper logging system with different log levels.'
      });
    }
  } else if (language === 'python') {
    // Check for print statements
    if (code.includes('print(')) {
      qualityIssues.push({
        type: 'quality',
        severity: 'low',
        line: getLineNumber(code, 'print('),
        message: 'Debug print() statements should be removed in production code',
        suggestion: 'Remove debug statements or replace with a proper logging system like the logging module.'
      });
    }
  }

  return qualityIssues;
}

// Performance analysis
function analyzePerformance(code: string, language: string): Array<any> {
  const performanceIssues = [];

  // Check for inefficient loops
  if ((code.includes('for') && code.includes('for')) || 
      (code.includes('while') && code.includes('while'))) {
    performanceIssues.push({
      type: 'performance',
      severity: 'medium',
      line: getLineNumber(code, 'for'),
      message: 'Nested loops detected, potential O(n²) time complexity',
      suggestion: 'Consider restructuring the algorithm to avoid nested loops when possible, or ensure the inner loop doesn\'t iterate over a large dataset.'
    });
  }

  // Language-specific performance checks
  if (language === 'javascript') {
    // Check for inefficient array operations
    if (code.includes('.forEach') && code.includes('splice')) {
      performanceIssues.push({
        type: 'performance',
        severity: 'medium',
        line: getLineNumber(code, 'splice'),
        message: 'Inefficient array modification inside loop',
        suggestion: 'Modifying arrays inside a loop with methods like splice() is inefficient. Consider using filter() or map() instead.'
      });
    }
  } else if (language === 'python') {
    // Check for inefficient list operations
    if (code.includes('for') && code.includes('+ [')) {
      performanceIssues.push({
        type: 'performance',
        severity: 'medium',
        line: getLineNumber(code, '+ ['),
        message: 'Inefficient list concatenation in loop',
        suggestion: 'Use list comprehensions or extend() instead of + for list concatenation inside loops.'
      });
    }
  }

  return performanceIssues;
}

// Helper to get line number for reporting issues
function getLineNumber(code: string, searchTerm: string): number {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchTerm)) {
      return i + 1;
    }
  }
  return 1;
}

// Calculate security score based on issues
function calculateSecurityScore(issues: Array<any>): number {
  const baseScore = 100;
  let deductions = 0;
  
  for (const issue of issues) {
    if (issue.severity === 'critical') {
      deductions += 25;
    } else if (issue.severity === 'high') {
      deductions += 15;
    } else if (issue.severity === 'medium') {
      deductions += 10;
    } else {
      deductions += 5;
    }
  }
  
  return Math.max(0, baseScore - deductions);
}

// Calculate code quality score
function calculateQualityScore(issues: Array<any>): number {
  const baseScore = 100;
  let deductions = 0;
  
  for (const issue of issues) {
    if (issue.severity === 'high') {
      deductions += 15;
    } else if (issue.severity === 'medium') {
      deductions += 10;
    } else {
      deductions += 5;
    }
  }
  
  return Math.max(0, baseScore - deductions);
}

// Calculate performance score
function calculatePerformanceScore(issues: Array<any>): number {
  const baseScore = 100;
  let deductions = 0;
  
  for (const issue of issues) {
    if (issue.severity === 'high') {
      deductions += 15;
    } else if (issue.severity === 'medium') {
      deductions += 10;
    } else {
      deductions += 5;
    }
  }
  
  return Math.max(0, baseScore - deductions);
}

// Generate recommendations based on issues
function generateRecommendations(securityIssues: Array<any>, qualityIssues: Array<any>, performanceIssues: Array<any>): Array<string> {
  const recommendations = [];
  
  // Security recommendations
  if (securityIssues.length > 0) {
    if (securityIssues.some(i => i.severity === 'critical')) {
      recommendations.push('Critical security issues detected! Fix immediately before deploying this code.');
    }
    if (securityIssues.some(i => i.message.includes('injection'))) {
      recommendations.push('Implement proper input validation and sanitization to prevent injection attacks.');
    }
    if (securityIssues.some(i => i.message.includes('credentials'))) {
      recommendations.push('Move all credentials and secrets to environment variables or a secure vault service.');
    }
  }
  
  // Quality recommendations
  if (qualityIssues.length > 0) {
    if (qualityIssues.some(i => i.message.includes('long'))) {
      recommendations.push('Refactor long functions into smaller, more focused units to improve readability and maintainability.');
    }
    if (qualityIssues.some(i => i.message.includes('nesting'))) {
      recommendations.push('Reduce code complexity by minimizing nested conditionals and loops.');
    }
  }
  
  // Performance recommendations
  if (performanceIssues.length > 0) {
    if (performanceIssues.some(i => i.message.includes('O(n²)'))) {
      recommendations.push('Review algorithm efficiency to avoid quadratic time complexity where possible.');
    }
  }
  
  return recommendations;
}

// Security scanning functions
async function scanDependencies(repo: string, branch?: string): Promise<Array<any>> {
  // Simulated dependency scanning - in a real implementation, this would call a vulnerability database
  return [
    {
      id: 'GHSA-xvch-5gv4-984h',
      severity: 'high',
      package: 'lodash',
      currentVersion: '4.17.15',
      patchedVersion: '4.17.21',
      description: 'Prototype Pollution in lodash',
      recommendation: 'Upgrade to version 4.17.21 or later'
    },
    {
      id: 'GHSA-7fh5-64p2-3v2j',
      severity: 'medium',
      package: 'axios',
      currentVersion: '0.21.0',
      patchedVersion: '0.21.1',
      description: 'Server-Side Request Forgery in axios',
      recommendation: 'Upgrade to version 0.21.1 or later'
    }
  ];
}

async function scanForSecrets(repo: string, branch?: string): Promise<Array<any>> {
  // Simulated secret scanning - in a real implementation, this would analyze code for hardcoded secrets
  return [
    {
      severity: 'critical',
      type: 'API Key',
      location: 'src/config.js:15',
      description: 'Potential API key found in source code',
      recommendation: 'Move API keys to environment variables or secure vaults'
    }
  ];
}

async function performSASTScan(repo: string, branch?: string): Promise<Array<any>> {
  // Simulated Static Application Security Testing
  return [
    {
      severity: 'high',
      type: 'Cross-Site Scripting (XSS)',
      location: 'src/components/Comments.js:42',
      description: 'Unsanitized user input rendered directly to DOM',
      recommendation: 'Use React\'s JSX or sanitize HTML content before rendering'
    },
    {
      severity: 'medium',
      type: 'Insecure Cookie',
      location: 'src/utils/auth.js:78',
      description: 'Cookies set without secure and httpOnly flags',
      recommendation: 'Add secure and httpOnly flags to sensitive cookies'
    }
  ];
}

function generateSecurityRecommendations(vulnerabilities: Array<any>): Array<string> {
  const recommendations = [];
  
  // Group vulnerabilities by type for targeted recommendations
  const hasDependencyIssues = vulnerabilities.some(v => v.package);
  const hasSecretIssues = vulnerabilities.some(v => v.type === 'API Key');
  const hasXssIssues = vulnerabilities.some(v => v.type === 'Cross-Site Scripting (XSS)');
  const hasCookieIssues = vulnerabilities.some(v => v.type === 'Insecure Cookie');
  
  if (hasDependencyIssues) {
    recommendations.push('Implement a dependency scanning tool in your CI pipeline to catch outdated packages automatically.');
    recommendations.push('Set up automatic security updates for non-breaking patches to dependencies.');
  }
  
  if (hasSecretIssues) {
    recommendations.push('Use a secret scanning tool in pre-commit hooks to prevent credentials from being committed.');
    recommendations.push('Implement a secrets management solution like AWS Secrets Manager, HashiCorp Vault, or GitHub Secrets.');
  }
  
  if (hasXssIssues) {
    recommendations.push('Use content security policy (CSP) headers to mitigate XSS attacks.');
    recommendations.push('Implement input validation on both client and server sides.');
  }
  
  if (hasCookieIssues) {
    recommendations.push('Review all cookie settings to ensure secure, httpOnly, and SameSite attributes are properly set.');
  }
  
  // General recommendations
  recommendations.push('Perform regular security scans and penetration testing on your application.');
  recommendations.push('Establish a security training program for all developers.');
  
  return recommendations;
}

// Generate simulated security monitoring data
function generateSecurityMonitoringData(timeRange: string): any {
  // Create time points for the data based on the requested range
  const now = new Date();
  let timePoints = [];
  let interval = 0;
  
  if (timeRange === '24h') {
    interval = 60; // minutes
    for (let i = 0; i < 24; i++) {
      const time = new Date(now);
      time.setHours(now.getHours() - 23 + i);
      time.setMinutes(0, 0, 0);
      timePoints.push(time);
    }
  } else if (timeRange === '7d') {
    interval = 24 * 60; // 1 day in minutes
    for (let i = 0; i < 7; i++) {
      const time = new Date(now);
      time.setDate(now.getDate() - 6 + i);
      time.setHours(0, 0, 0, 0);
      timePoints.push(time);
    }
  } else {
    interval = 30 * 24 * 60; // 1 month in minutes
    for (let i = 0; i < 12; i++) {
      const time = new Date(now);
      time.setMonth(now.getMonth() - 11 + i);
      time.setDate(1);
      time.setHours(0, 0, 0, 0);
      timePoints.push(time);
    }
  }
  
  // Generate metrics for each time point
  const metrics = timePoints.map(time => {
    return {
      timestamp: time.toISOString(),
      requestCount: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 0.05,
      avgResponseTime: Math.random() * 200 + 100,
      uniqueIPs: Math.floor(Math.random() * 200) + 50
    };
  });
  
  // Generate simulated alerts
  const alertTypes = ['Authentication Failure', 'Rate Limit Exceeded', 'Suspicious IP Access', 'Abnormal User Behavior'];
  const alerts = [];
  
  // Add some alerts distributed across the time range
  for (let i = 0; i < Math.floor(Math.random() * 5) + 3; i++) {
    const alertTime = timePoints[Math.floor(Math.random() * timePoints.length)];
    alerts.push({
      timestamp: alertTime.toISOString(),
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      source: Math.random() > 0.5 ? 'firewall' : 'application',
      description: 'Potential security event detected.'
    });
  }
  
  // Generate potential breach data
  const potentialBreaches = [];
  if (Math.random() > 0.7) {
    const breachTime = timePoints[Math.floor(Math.random() * timePoints.length)];
    potentialBreaches.push({
      timestamp: breachTime.toISOString(),
      type: 'Multiple Failed Logins',
      targetUser: 'admin_user',
      sourceIP: '203.0.113.' + Math.floor(Math.random() * 255),
      status: 'investigating'
    });
  }
  
  // Generate traffic anomalies
  const trafficAnomalies = [];
  const anomalyTimeIndex = Math.floor(Math.random() * (timePoints.length - 1)) + 1;
  const anomalyTime = timePoints[anomalyTimeIndex];
  
  // Simulate a traffic spike
  if (Math.random() > 0.5) {
    trafficAnomalies.push({
      timestamp: anomalyTime.toISOString(),
      type: 'Traffic Spike',
      normalLevel: '~750 req/min',
      anomalousLevel: '~3500 req/min',
      duration: Math.floor(Math.random() * 30) + 5 + ' minutes',
      status: Math.random() > 0.5 ? 'resolved' : 'ongoing'
    });
  }
  
  return {
    timeRange,
    interval,
    metrics,
    alerts,
    potentialBreaches,
    trafficAnomalies
  };
}

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
        // Log that we're starting the GitHub API request
        console.log(`Fetching repositories for GitHub user: ${username}`);
        console.log(`GitHub Token available: ${GITHUB_TOKEN ? 'Yes' : 'No'}`);
        
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CodeReview-Tool",
        };
        
        // Add authorization header if token exists
        if (GITHUB_TOKEN) {
          headers["Authorization"] = `token ${GITHUB_TOKEN}`;
          console.log("Authorization header added with token");
        } else {
          console.log("No GitHub token available - request will be unauthenticated");
        }
        
        // Log the GitHub API URL we're requesting
        const githubApiUrl = `${GITHUB_API_BASE_URL}/users/${username}/repos`;
        console.log(`Requesting GitHub API URL: ${githubApiUrl}`);
        
        const response = await axios.get(githubApiUrl, {
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
  
  // Add a database health check endpoint
  app.get("/api/db-health", async (req, res) => {
    try {
      // Test database connection by querying a simple table
      const result = await storage.getUserByUsername("test-user");
      
      // Create a test user if it doesn't exist
      if (!result) {
        try {
          await storage.createUser({
            username: "test-user",
            password: "password123"
          });
        } catch (err) {
          console.error("Error creating test user:", err);
        }
      }
      
      // Check tables
      const tables = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      
      return res.json({
        status: "Database connection successful",
        tables: tables.rows.map(row => row.table_name)
      });
    } catch (error) {
      console.error("Database health check error:", error);
      return res.status(500).json({
        status: "Database connection failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Code snippet analysis endpoint
  app.post("/api/analyze-snippet", async (req, res) => {
    try {
      const { code, language, context } = req.body;
      
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Code snippet is required" });
      }
      
      // Determine the language if not provided
      const detectedLanguage = language || detectLanguage(code);
      
      // Analyze the code for different categories of issues
      const securityIssues = analyzeCodeSecurity(code, detectedLanguage);
      const qualityIssues = analyzeCodeQuality(code, detectedLanguage);
      const performanceIssues = analyzePerformance(code, detectedLanguage);
      
      // Combine all feedback
      const analysisResults = {
        language: detectedLanguage,
        securityIssues,
        qualityIssues,
        performanceIssues,
        summary: {
          totalIssues: securityIssues.length + qualityIssues.length + performanceIssues.length,
          securityScore: calculateSecurityScore(securityIssues),
          qualityScore: calculateQualityScore(qualityIssues),
          performanceScore: calculatePerformanceScore(performanceIssues)
        },
        recommendations: generateRecommendations(securityIssues, qualityIssues, performanceIssues)
      };
      
      return res.json(analysisResults);
    } catch (error) {
      console.error("Code analysis error:", error);
      return res.status(500).json({ 
        message: "Failed to analyze code snippet",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Vulnerability scanning endpoint
  app.post("/api/security-scan", async (req, res) => {
    try {
      const { repositoryUrl, branch, scanType } = req.body;
      
      if (!repositoryUrl || typeof repositoryUrl !== "string") {
        return res.status(400).json({ message: "Repository URL is required" });
      }
      
      // Extract owner and repo name from GitHub URL
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i;
      const match = repositoryUrl.match(urlPattern);
      
      if (!match) {
        return res.status(400).json({ 
          message: "Invalid GitHub repository URL. Please use a URL like 'https://github.com/owner/repo'" 
        });
      }
      
      const [, owner, repo] = match;
      const fullName = `${owner}/${repo}`;
      
      // Perform security scan based on scan type
      let vulnerabilities = [];
      let recommendations = [];
      
      if (scanType === 'full' || scanType === 'dependency') {
        // Dependency vulnerability scan
        const dependencyVulnerabilities = await scanDependencies(fullName, branch);
        vulnerabilities = [...vulnerabilities, ...dependencyVulnerabilities];
      }
      
      if (scanType === 'full' || scanType === 'secret') {
        // Secret scanning
        const secretVulnerabilities = await scanForSecrets(fullName, branch);
        vulnerabilities = [...vulnerabilities, ...secretVulnerabilities];
      }
      
      if (scanType === 'full' || scanType === 'sast') {
        // Static Application Security Testing
        const sastVulnerabilities = await performSASTScan(fullName, branch);
        vulnerabilities = [...vulnerabilities, ...sastVulnerabilities];
      }
      
      // Generate recommendations based on findings
      recommendations = generateSecurityRecommendations(vulnerabilities);
      
      return res.json({
        repositoryUrl,
        scanType,
        vulnerabilities,
        recommendations,
        summary: {
          totalVulnerabilities: vulnerabilities.length,
          criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
          highCount: vulnerabilities.filter(v => v.severity === 'high').length,
          mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
          lowCount: vulnerabilities.filter(v => v.severity === 'low').length
        }
      });
    } catch (error) {
      console.error("Security scan error:", error);
      return res.status(500).json({ 
        message: "Failed to perform security scan",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Real-time monitoring data endpoint
  app.get("/api/security-monitoring", async (req, res) => {
    try {
      // Get monitoring data based on time range
      const { timeRange } = req.query;
      const range = typeof timeRange === 'string' ? timeRange : '24h'; // Default to last 24 hours
      
      // Mock data for demonstration purposes
      const monitoringData = generateSecurityMonitoringData(range);
      
      return res.json({
        timeRange: range,
        data: monitoringData,
        summary: {
          alertsTriggered: monitoringData.alerts.length,
          potentialBreaches: monitoringData.potentialBreaches.length,
          trafficAnomalies: monitoringData.trafficAnomalies.length
        }
      });
    } catch (error) {
      console.error("Security monitoring error:", error);
      return res.status(500).json({ 
        message: "Failed to retrieve security monitoring data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
