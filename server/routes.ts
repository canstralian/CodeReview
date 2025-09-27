import type { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertRepositorySchema, insertCodeIssueSchema, insertRepositoryFileSchema } from "@shared/schema";
import GitHubClient from "./services/githubClient";
import { SecurityScanner } from "./services/securityScanner";
import { AISuggestionsService } from "./services/aiSuggestions";
import { QualityTrendsService } from "./services/qualityTrends";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import type { Express } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { graphql } from "@octokit/graphql";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize GitHub GraphQL client
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

// -------------------------------------------------------------------------------------
// Interface to represent a single security issue found in code
// -------------------------------------------------------------------------------------
interface SecurityIssue {
  type: "security";
  severity: "low" | "medium" | "high" | "critical";
  line: number;                // 1-based line number where issue was detected
  message: string;             // Human-readable description of the issue
  suggestion: string;          // Advice on how to fix or mitigate the issue
  language?: string;           // (Optional) language context, e.g. 'javascript' / 'python'
}

// -------------------------------------------------------------------------------------
// GitHub client instance (unused in this snippet but assumed to be used elsewhere).
// -------------------------------------------------------------------------------------
const githubClient = new GitHubClient();
const securityScanner = new SecurityScanner();
const aiSuggestionsService = new AISuggestionsService();
const qualityTrendsService = new QualityTrendsService();

// -------------------------------------------------------------------------------------
// Splits the code by newline and finds the first line index where `searchedSubstring`
// appears. Returns a 1-based line number. If not found, returns -1.
// -------------------------------------------------------------------------------------
function getLineNumber(code: string, searchedSubstring: string): number {
  const lines = code.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchedSubstring)) {
      return i + 1;   // return 1-based index
    }
  }
  return -1;          // substring not found
}

// -------------------------------------------------------------------------------------
// perform a very naive language detection based on code keywords. Returns a string.
// -------------------------------------------------------------------------------------
function detectLanguage(code: string): string {
  if (code.includes("import React") || code.includes("useState") || code.includes("export default")) {
    return "javascript";
  } else if (
    code.includes("def ") &&
    code.includes(":") &&
    (code.includes("print(") || code.includes("return "))
  ) {
    return "python";
  } else if (
    code.includes("public class") ||
    code.includes("private void") ||
    code.includes("System.out.println")
  ) {
    return "java";
  } else if (code.includes("using namespace") || code.includes("#include") || code.includes("int main()")) {
    return "cpp";
  } else {
    return "unknown";
  }
}

// -------------------------------------------------------------------------------------
// analyzeCodeSecurity
//   - code: full source code as a string (with newlines, etc.)
//   - language: the detected or declared language (e.g. 'javascript', 'python')
//
// Returns an array of SecurityIssue objects for each finding.
// -------------------------------------------------------------------------------------
function analyzeCodeSecurity(code: string, language: string): SecurityIssue[] {
  const securityIssues: SecurityIssue[] = [];

  // -----------------------------------------------------
  // 1) eval()/exec() detection → high severity
  // -----------------------------------------------------
  if (code.includes("eval(") || code.includes("exec(")) {
    const substring = code.includes("eval(") ? "eval(" : "exec(";
    securityIssues.push({
      type: "security",
      severity: "high",
      line: getLineNumber(code, substring),
      message: "Use of eval() or exec() can lead to code injection vulnerabilities.",
      suggestion: "Avoid using eval() or exec(). Use safer alternatives (e.g., Function constructor, sandboxed VMs).",
      language,
    });
  }

  // -----------------------------------------------------
  // 2) Hardcoded credentials detection → critical severity
  // -----------------------------------------------------
  //    We look for patterns like `password = "..."`, `api_key = '...'`, `secret = "..."`, `token = "..."`.
  const credentialRegex = /(?:password|api[_-]?key|secret|token)\s*=\s*['"][^'"]+['"]/i;
  if (credentialRegex.test(code)) {
    // Find whichever keyword appears first to get a line number
    const match = code.match(/password\s*=\s*['"][^'"]+['"]/) ||
                  code.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/) ||
                  code.match(/secret\s*=\s*['"][^'"]+['"]/) ||
                  code.match(/token\s*=\s*['"][^'"]+['"]/);

    // If we matched something, figure out which substring to search for line number.
    let searchKey = "";
    if (match) {
      const matchedText = match[0];
      // Extract the key name out of the matched text:
      if (/password\s*=/.test(matchedText)) {
        searchKey = "password";
      } else if (/api[_-]?key\s*=/.test(matchedText)) {
        searchKey = matchedText.split("=")[0].trim(); // e.g. "api_key" or "api-key"
      } else if (/secret\s*=/.test(matchedText)) {
        searchKey = "secret";
      } else if (/token\s*=/.test(matchedText)) {
        searchKey = "token";
      }
    }

    securityIssues.push({
      type: "security",
      severity: "critical",
      line: searchKey ? getLineNumber(code, searchKey) : -1,
      message: "Hardcoded credentials detected in source code.",
      suggestion: "Never hardcode credentials in source code. Use environment variables or a secrets manager.",
      language,
    });
  }

  // -----------------------------------------------------
  // 3) SQL injection detection → critical severity
  // -----------------------------------------------------
  if (code.includes('SELECT') && code.includes('FROM') && !code.includes('?') && (code.includes('${') || code.includes("' +") || code.includes("\" +"))) {
    securityIssues.push({
      type: 'security',
      severity: 'critical',
      line: getLineNumber(code, 'SELECT'),
      message: 'Potential SQL injection vulnerability detected',
      suggestion: 'Use parameterized queries or prepared statements to prevent SQL injection attacks.',
      language,
    });
  }

  // -----------------------------------------------------
  // 4) Language-specific issues
  // -----------------------------------------------------
  if (language === 'javascript' || language === 'typescript') {
    if (code.includes('document.write(') || code.includes('innerHTML') || code.includes('outerHTML')) {
      securityIssues.push({
        type: 'security',
        severity: 'high',
        line: getLineNumber(code, 'innerHTML'),
        message: 'Potential Cross-Site Scripting (XSS) vulnerability',
        suggestion: 'Use textContent instead of innerHTML, or sanitize user input before inserting into DOM.',
        language,
      });
    }
  } else if (language === 'python') {
    if (code.includes('pickle.loads(') || code.includes('yaml.load(') || code.includes('subprocess.call(')) {
      securityIssues.push({
        type: 'security',
        severity: 'high',
        line: getLineNumber(code, 'pickle.loads('),
        message: 'Potentially unsafe deserialization or command execution',
        suggestion: 'Use pickle.loads() with trusted data only. Use yaml.safe_load() instead of yaml.load(). Use subprocess.call() with care.',
        language,
      });
    }
  }

  // Finally, return whatever issues we found (could be an empty array).
  return securityIssues;
}

// Code quality analysis
function analyzeCodeQuality(code: string, language: string): Array<any> {
  const qualityIssues = [];

  // General code quality issues
  if (code.match(/\/\/\s*TODO/) || code.match(/\/\*\s*TODO/) || code.match(/#\s*TODO/)) {
    qualityIssues.push({
      type: 'quality',
      severity: 'low',
      line: getLineNumber(code, 'TODO'),
      message: 'TODO comment found in code',
      suggestion: 'Resolve TODOs before committing code to production'
    });
  }

  if (code.includes('console.log(') || code.includes('print(') || code.includes('System.out.println(')) {
    qualityIssues.push({
      type: 'quality',
      severity: 'low',
      line: getLineNumber(code, 'console.log('),
      message: 'Debug statements found in code',
      suggestion: 'Remove debug statements before committing code to production'
    });
  }

  // Check for long functions (more than 50 lines)
  const lines = code.split('\n');
  if (lines.length > 50) {
    qualityIssues.push({
      type: 'quality',
      severity: 'medium',
      line: 1,
      message: 'Function is too long (' + lines.length + ' lines)',
      suggestion: 'Consider breaking down this function into smaller, more manageable pieces'
    });
  }

  // Language-specific issues
  if (language === 'javascript' || language === 'typescript') {
    if (code.includes('var ')) {
      qualityIssues.push({
        type: 'quality',
        severity: 'medium',
        line: getLineNumber(code, 'var '),
        message: 'Use of var keyword',
        suggestion: 'Use const or let instead of var for better scoping'
      });
    }

    if (code.match(/==(?!=)/)) {
      qualityIssues.push({
        type: 'quality',
        severity: 'medium',
        line: getLineNumber(code, '=='),
        message: 'Use of loose equality operator (==)',
        suggestion: 'Use strict equality operator (===) to avoid unexpected type coercion'
      });
    }
  }

  return qualityIssues;
}

// Performance analysis
function analyzePerformance(code: string, language: string): Array<any> {
  const performanceIssues = [];

  // General performance issues
  if (code.includes('for (') && code.includes('.length')) {
    performanceIssues.push({
      type: 'performance',
      severity: 'low',
      line: getLineNumber(code, 'for ('),
      message: 'Potential performance issue with array length calculation in loop condition',
      suggestion: 'Cache the array length before the loop to avoid recalculating it in each iteration'
    });
  }

  // Language-specific issues
  if (language === 'javascript' || language === 'typescript') {
    if (code.includes('document.querySelector') && code.match(/for\s*\(/)) {
      performanceIssues.push({
        type: 'performance',
        severity: 'medium',
        line: getLineNumber(code, 'document.querySelector'),
        message: 'DOM query inside a loop',
        suggestion: 'Cache DOM selections outside of loops to avoid repeated DOM queries'
      });
    }

    if (code.includes('.forEach(') && (code.includes('.map(') || code.includes('.filter('))) {
      performanceIssues.push({
        type: 'performance',
        severity: 'medium',
        line: getLineNumber(code, '.forEach('),
        message: 'Chained array methods may cause unnecessary iterations',
        suggestion: 'Consider combining multiple array operations into a single loop for better performance'
      });
    }
  } else if (language === 'python') {
    if (code.includes('for ') && code.includes('range(len(')) {
      performanceIssues.push({
        type: 'performance',
        severity: 'low',
        line: getLineNumber(code, 'range(len('),
        message: 'Inefficient use of range(len())',
        suggestion: 'Use enumerate() for index access, or iterate directly over the collection if index is not needed'
      });
    }
  }

  return performanceIssues;
}

// Calculate security score based on issues
function calculateSecurityScore(issues: Array<any>): number {
  if (!issues || issues.length === 0) return 100;

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') {
      score -= 25;
    } else if (issue.severity === 'high') {
      score -= 15;
    } else if (issue.severity === 'medium') {
      score -= 10;
    } else if (issue.severity === 'low') {
      score -= 5;
    }
  }

  return Math.max(0, score);
}

// Calculate code quality score based on issues
function calculateQualityScore(issues: Array<any>): number {
  if (!issues || issues.length === 0) return 100;

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'high') {
      score -= 15;
    } else if (issue.severity === 'medium') {
      score -= 10;
    } else if (issue.severity === 'low') {
      score -= 5;
    }
  }

  return Math.max(0, score);
}

// Calculate performance score based on issues
function calculatePerformanceScore(issues: Array<any>): number {
  if (!issues || issues.length === 0) return 100;

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'high') {
      score -= 15;
    } else if (issue.severity === 'medium') {
      score -= 10;
    } else if (issue.severity === 'low') {
      score -= 5;
    }
  }

  return Math.max(0, score);
}

// Generate recommendations based on issues
function generateRecommendations(securityIssues: Array<any>, qualityIssues: Array<any>, performanceIssues: Array<any>): Array<string> {
  const recommendations = [];

  // Add security recommendations
  if (securityIssues.length > 0) {
    recommendations.push("Address security vulnerabilities to prevent potential attacks");

    if (securityIssues.some(issue => issue.message.includes('SQL injection'))) {
      recommendations.push("Implement parameterized queries to prevent SQL injection attacks");
    }

    if (securityIssues.some(issue => issue.message.includes('XSS'))) {
      recommendations.push("Sanitize user input to prevent cross-site scripting (XSS) attacks");
    }

    if (securityIssues.some(issue => issue.message.includes('credentials'))) {
      recommendations.push("Use environment variables or a secure vault service for storing sensitive credentials");
    }
  }

  // Add code quality recommendations
  if (qualityIssues.length > 0) {
    recommendations.push("Improve code quality to enhance maintainability");

    if (qualityIssues.some(issue => issue.message.includes('too long'))) {
      recommendations.push("Break down large functions into smaller, more manageable pieces");
    }

    if (qualityIssues.some(issue => issue.message.includes('var keyword'))) {
      recommendations.push("Replace 'var' with 'const' or 'let' for better variable scoping");
    }

    if (qualityIssues.some(issue => issue.message.includes('TODO'))) {
      recommendations.push("Resolve TODO comments to complete implementation");
    }
  }

  // Add performance recommendations
  if (performanceIssues.length > 0) {
    recommendations.push("Optimize code for better performance");

    if (performanceIssues.some(issue => issue.message.includes('DOM query'))) {
      recommendations.push("Cache DOM selections outside of loops to reduce DOM queries");
    }

    if (performanceIssues.some(issue => issue.message.includes('array length'))) {
      recommendations.push("Cache array lengths outside of loops for better performance");
    }
  }

  return recommendations;
}

// Functions for security scanning (simulated for demonstration)
async function scanDependencies(repo: string, branch?: string): Promise<Array<any>> {
  // Simulate dependency scanning
  console.log(`Scanning dependencies for ${repo}${branch ? ` on branch ${branch}` : ''}`);

  // For demonstration, return simulated results
  return [
    {
      name: "lodash",
      version: "4.17.15",
      vulnerabilities: [
        {
          id: "CVE-2021-23337",
          severity: "high",
          title: "Prototype Pollution in lodash",
          description: "Prototype pollution in lodash versions < 4.17.21",
          recommendation: "Upgrade to lodash 4.17.21 or later"
        }
      ]
    },
    {
      name: "axios",
      version: "0.21.0",
      vulnerabilities: [
        {
          id: "CVE-2021-3749",
          severity: "medium",
          title: "Server-Side Request Forgery in axios",
          description: "Axios before 0.21.1 allows server-side request forgery",
          recommendation: "Upgrade to axios 0.21.1 or later"
        }
      ]
    }
  ];
}

async function scanForSecrets(repo: string, branch?: string): Promise<Array<any>> {
  // Simulate secret scanning
  console.log(`Scanning for secrets in ${repo}${branch ? ` on branch ${branch}` : ''}`);

  // For demonstration, return simulated results
  return [
    {
      file: "config.js",
      line: 12,
      type: "API Key",
      severity: "critical",
      description: "Hardcoded API key found in source code",
      recommendation: "Move API key to environment variables or secure vault"
    },
    {
      file: "server.js",
      line: 45,
      type: "Database Password",
      severity: "critical",
      description: "Database password found in source code",
      recommendation: "Move database credentials to environment variables or secure configuration"
    }
  ];
}

async function performSASTScan(repo: string, branch?: string): Promise<Array<any>> {
  // Simulate static application security testing
  console.log(`Performing SAST scan on ${repo}${branch ? ` on branch ${branch}` : ''}`);

  // For demonstration, return simulated results
  return [
    {
      file: "login.js",
      line: 28,
      type: "Insecure Authentication",
      severity: "high",
      description: "Password stored in plain text",
      recommendation: "Use a secure password hashing algorithm like bcrypt"
    },
    {
      file: "api.js",
      line: 72,
      type: "Missing Input Validation",
      severity: "medium",
      description: "User input is not validated before processing",
      recommendation: "Implement input validation to prevent injection attacks"
    },
    {
      file: "router.js",
      line: 55,
      type: "Improper Access Control",
      severity: "high",
      description: "Missing authorization check for sensitive operation",
      recommendation: "Implement proper authorization checks for all sensitive operations"
    }
  ];
}

// Generate security recommendations based on vulnerabilities
function generateSecurityRecommendations(vulnerabilities: Array<any>): Array<string> {
  const recommendations = [];

  // Count vulnerability types
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  vulnerabilities.forEach(vuln => {
    if (vuln.severity in counts) {
      counts[vuln.severity as keyof typeof counts]++;
    }
  });

  // Generate general recommendations based on severity counts
  if (counts.critical > 0) {
    recommendations.push(`Address ${counts.critical} critical vulnerabilities immediately to prevent security breaches`);
  }

  if (counts.high > 0) {
    recommendations.push(`Resolve ${counts.high} high-severity security issues as part of the next sprint`);
  }

  if (counts.medium > 0) {
    recommendations.push(`Plan to fix ${counts.medium} medium-severity security issues in the near future`);
  }

  // Add specific recommendations based on vulnerability types
  const hasSecrets = vulnerabilities.some(v => v.type === "API Key" || v.type === "Database Password");
  if (hasSecrets) {
    recommendations.push("Remove hardcoded secrets from the codebase and use environment variables or a secure vault");
  }

  const hasDependencyIssues = vulnerabilities.some(v => v.name);
  if (hasDependencyIssues) {
    recommendations.push("Update vulnerable dependencies to their latest secure versions");
  }

  const hasAuthIssues = vulnerabilities.some(v => v.type === "Insecure Authentication");
  if (hasAuthIssues) {
    recommendations.push("Improve authentication mechanisms using industry-standard practices");
  }

  return recommendations;
}

// Generate security monitoring data for demonstration
function generateSecurityMonitoringData(timeRange: string): any {
  // Simulated security monitoring data
  const now = new Date();
  const data = {
    timeRange,
    summary: {
      total_events: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    timeline: [],
    attack_types: {},
    source_ips: {}
  };

  // Generate different data based on time range
  let days = 1;
  if (timeRange === '7d') days = 7;
  else if (timeRange === '30d') days = 30;
  else if (timeRange === '90d') days = 90;

  // Generate random number of events based on time range
  const totalEvents = Math.floor(Math.random() * 100 * days);
  data.summary.total_events = totalEvents;

  // Distribute events by severity
  data.summary.critical = Math.floor(totalEvents * 0.1);
  data.summary.high = Math.floor(totalEvents * 0.2);
  data.summary.medium = Math.floor(totalEvents * 0.3);
  data.summary.low = totalEvents - data.summary.critical - data.summary.high - data.summary.medium;

  // Generate timeline data
  const attackTypes = ['SQL Injection', 'XSS', 'Brute Force', 'CSRF', 'Path Traversal'];
  const sourceIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8', '1.1.1.1'];

  // Initialize attack types and source IPs counters
  attackTypes.forEach(type => {
    (data.attack_types as Record<string, number>)[type] = 0;
  });

  sourceIPs.forEach(ip => {
    (data.source_ips as Record<string, number>)[ip] = 0;
  });

  // Generate timeline events
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dailyEvents = Math.floor(totalEvents / days) + Math.floor(Math.random() * 10) - 5;

    // Distribute events by attack type and source IP
    for (let j = 0; j < dailyEvents; j++) {
      const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];

      (data.attack_types as Record<string, number>)[attackType]++;
      (data.source_ips as Record<string, number>)[sourceIP]++;

      (data.timeline as Array<any>).push({
        timestamp: date.toISOString(),
        type: attackType,
        severity: j % 10 === 0 ? 'critical' : j % 5 === 0 ? 'high' : j % 3 === 0 ? 'medium' : 'low',
        source_ip: sourceIP
      });
    }
  }

  return data;
}

// Helper function to get language from file path
function getLanguageFromPath(path: string): string | null {
  const extension = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell'
  };

  return extension ? languageMap[extension] || null : null;
}

// Helper function to fetch real repository files from GitHub
async function generateRealFiles(repositoryId: number, owner: string, repo: string) {
  try {
    // Get repository contents from GitHub
    const contents = await githubClient.getRepositoryContents(owner, repo);

    // Process and store files
    for (const item of contents) {
      const language = getLanguageFromPath(item.path);

      await storage.createRepositoryFile({
        repositoryId,
        filePath: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        language,
        content: null // We'll fetch content on demand
      });
    }

    // If it's a directory, recursively fetch subdirectories (limited depth for performance)
    const directories = contents.filter(item => item.type === 'dir').slice(0, 5); // Limit to 5 directories
    for (const dir of directories) {
      try {
        const subContents = await githubClient.getRepositoryContents(owner, repo, dir.path);
        for (const subItem of subContents.slice(0, 10)) { // Limit files per directory
          const language = getLanguageFromPath(subItem.path);

          await storage.createRepositoryFile({
            repositoryId,
            filePath: subItem.path,
            type: subItem.type === 'dir' ? 'dir' : 'file',
            language,
            content: null
          });
        }
      } catch (error) {
        console.log(`Could not fetch contents of directory ${dir.path}`);
      }
    }
  } catch (error) {
    console.error("Error fetching real files for repository:", { owner, repo, error });
    // Fall back to generating sample files - using the repo name as type
    const repoTypes = ["website", "app", "api", "ui-components", "docs", "utils", "mobile", "server"];
    const repoType = repoTypes.find(type => repo.toLowerCase().includes(type)) || "app";
    // We'll handle this case by creating minimal file structure
    console.log(`Could not fetch real files for ${owner}/${repo}, skipping file generation`);
    return;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Database health check
  app.get("/api/db-health", async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT NOW()`);
      res.json({ 
        status: "ok", 
        timestamp: result.rows[0].now,
        message: "Database connection successful"
      });
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Database connection failed" 
      });
    }
  });

  /**
   * AI-Powered Code Analysis Endpoint
   * Analyzes code using Claude AI and provides detailed suggestions
   */
  app.post("/api/analyze-code", async (req, res) => {
    try {
      const { code, language, repository, filePath } = req.body;

      // Input validation
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
          message: "Code is required and must be a string",
          error: "INVALID_INPUT"
        });
      }

      if (code.length > 100000) {
        return res.status(400).json({ 
          message: "Code is too large. Maximum size is 100KB",
          error: "CODE_TOO_LARGE" 
        });
      }

      if (code.trim().length === 0) {
        return res.status(400).json({ 
          message: "Code cannot be empty",
          error: "EMPTY_CODE"
        });
      }

      // Detect language if not provided
      const detectedLanguage = language || detectLanguage(code);

      // Check if Claude API is available
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn("ANTHROPIC_API_KEY not found, falling back to basic analysis");
        
        // Fallback to basic analysis
        const securityIssues = analyzeCodeSecurity(code, detectedLanguage);
        const qualityIssues = analyzeCodeQuality(code, detectedLanguage);
        const performanceIssues = analyzePerformance(code, detectedLanguage);

        return res.json({
          language: detectedLanguage,
          suggestions: [],
          fallbackAnalysis: {
            security: securityIssues,
            quality: qualityIssues,
            performance: performanceIssues
          },
          generatedAt: new Date().toISOString(),
          source: "fallback"
        });
      }

      // Create prompt for Claude
      const prompt = `Analyze the following ${detectedLanguage} code and provide detailed suggestions for improvement. Focus on:

1. Security vulnerabilities and fixes
2. Performance optimizations
3. Code quality improvements
4. Bug detection and fixes
5. Best practices and refactoring opportunities

Code:
\`\`\`${detectedLanguage}
${code}
\`\`\`

Respond with a JSON object containing an array of suggestions. Each suggestion should have:
- suggestion: A clear, actionable improvement suggestion
- confidence: A number between 0 and 1 indicating how confident you are
- suggestedFix: The actual code fix or improvement
- reasoning: Detailed explanation of why this improvement is needed
- category: One of 'security', 'performance', 'refactor', 'bug-fix'

Example format:
{
  "suggestions": [
    {
      "suggestion": "Use parameterized queries to prevent SQL injection",
      "confidence": 0.95,
      "suggestedFix": "const query = 'SELECT * FROM users WHERE id = ?'; db.query(query, [userId]);",
      "reasoning": "Direct string concatenation in SQL queries allows injection attacks",
      "category": "security"
    }
  ]
}`;

      // Call Claude API
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      // Parse Claude's response
      let suggestions = [];
      try {
        const content = response.content[0];
        if (content.type === 'text') {
          // Extract JSON from Claude's response
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            suggestions = parsed.suggestions || [];
          }
        }
      } catch (parseError) {
        console.error("Failed to parse Claude response:", parseError);
        // If parsing fails, create a basic suggestion from the raw response
        suggestions = [{
          suggestion: "AI analysis completed but response parsing failed",
          confidence: 0.5,
          suggestedFix: "Please review the code manually",
          reasoning: "The AI provided feedback but it couldn't be properly parsed",
          category: "refactor"
        }];
      }

      // Add metadata to suggestions
      const enhancedSuggestions = suggestions.map((suggestion, index) => ({
        id: index + 1,
        ...suggestion,
        filePath: filePath || 'unknown',
        language: detectedLanguage,
        timestamp: new Date().toISOString()
      }));

      return res.json({
        repository: repository || 'unknown',
        filePath: filePath || 'unknown',
        language: detectedLanguage,
        suggestions: enhancedSuggestions,
        totalSuggestions: enhancedSuggestions.length,
        generatedAt: new Date().toISOString(),
        source: "claude-ai"
      });

    } catch (error) {
      console.error("Error in AI code analysis:", error);
      
      // Provide helpful error messages based on error type
      if (error.message?.includes('API key')) {
        return res.status(401).json({ 
          message: "AI service authentication failed",
          error: "API_AUTH_FAILED"
        });
      }
      
      if (error.message?.includes('rate limit')) {
        return res.status(429).json({ 
          message: "AI service rate limit exceeded. Please try again later.",
          error: "RATE_LIMIT_EXCEEDED"
        });
      }

      return res.status(500).json({ 
        message: "Internal server error during code analysis",
        error: "INTERNAL_ERROR"
      });
    }
  });

  /**
   * Team Dashboard Endpoint
   * Fetches repository metrics using GitHub GraphQL API
   */
  app.post("/api/team-dashboard", async (req, res) => {
    try {
      const { repositories } = req.body;

      // Input validation
      if (!repositories || !Array.isArray(repositories)) {
        return res.status(400).json({
          message: "Repositories array is required",
          error: "INVALID_INPUT"
        });
      }

      if (repositories.length === 0) {
        return res.status(400).json({
          message: "At least one repository is required",
          error: "EMPTY_REPOSITORIES"
        });
      }

      if (repositories.length > 10) {
        return res.status(400).json({
          message: "Maximum 10 repositories allowed per request",
          error: "TOO_MANY_REPOSITORIES"
        });
      }

      // Validate repository format
      for (const repo of repositories) {
        if (!repo || typeof repo !== 'string' || !repo.includes('/')) {
          return res.status(400).json({
            message: "Repository format should be 'owner/name'",
            error: "INVALID_REPOSITORY_FORMAT"
          });
        }
      }

      // Check if GitHub token is available
      if (!process.env.GITHUB_TOKEN) {
        return res.status(503).json({
          message: "GitHub integration is not configured",
          error: "GITHUB_TOKEN_MISSING"
        });
      }

      const dashboardData = [];

      for (const repoFullName of repositories) {
        try {
          const [owner, name] = repoFullName.split('/');
          
          // GraphQL query to fetch repository metrics
          const query = `
            query($owner: String!, $name: String!) {
              repository(owner: $owner, name: $name) {
                name
                owner {
                  login
                }
                description
                stargazerCount
                forkCount
                watchers {
                  totalCount
                }
                issues(states: OPEN) {
                  totalCount
                }
                pullRequests(states: OPEN) {
                  totalCount
                }
                releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
                  nodes {
                    tagName
                    createdAt
                  }
                }
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history(first: 1) {
                        nodes {
                          committedDate
                        }
                      }
                    }
                  }
                }
                languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                  edges {
                    size
                    node {
                      name
                      color
                    }
                  }
                }
                vulnerabilityAlerts(first: 10, states: OPEN) {
                  totalCount
                }
              }
            }
          `;

          const response = await graphqlWithAuth(query, {
            owner,
            name
          });

          const repo = response.repository;
          
          if (!repo) {
            dashboardData.push({
              repository: repoFullName,
              error: "Repository not found or access denied",
              status: "error"
            });
            continue;
          }

          // Calculate language distribution
          const totalSize = repo.languages.edges.reduce((sum, edge) => sum + edge.size, 0);
          const languageDistribution = repo.languages.edges.map(edge => ({
            name: edge.node.name,
            color: edge.node.color,
            percentage: totalSize > 0 ? Math.round((edge.size / totalSize) * 100) : 0
          }));

          // Get last commit date
          const lastCommitDate = repo.defaultBranchRef?.target?.history?.nodes?.[0]?.committedDate;
          
          // Get latest release
          const latestRelease = repo.releases.nodes.length > 0 ? repo.releases.nodes[0] : null;

          dashboardData.push({
            repository: repoFullName,
            name: repo.name,
            owner: repo.owner.login,
            description: repo.description,
            metrics: {
              stars: repo.stargazerCount,
              forks: repo.forkCount,
              watchers: repo.watchers.totalCount,
              openIssues: repo.issues.totalCount,
              openPRs: repo.pullRequests.totalCount,
              vulnerabilityAlerts: repo.vulnerabilityAlerts.totalCount
            },
            activity: {
              lastCommit: lastCommitDate,
              latestRelease: latestRelease ? {
                tagName: latestRelease.tagName,
                createdAt: latestRelease.createdAt
              } : null
            },
            languages: languageDistribution,
            status: "success"
          });

        } catch (repoError) {
          console.error(`Error fetching data for ${repoFullName}:`, repoError);
          dashboardData.push({
            repository: repoFullName,
            error: repoError.message || "Failed to fetch repository data",
            status: "error"
          });
        }
      }

      // Calculate summary statistics
      const successfulRepos = dashboardData.filter(repo => repo.status === "success");
      const totalStars = successfulRepos.reduce((sum, repo) => sum + (repo.metrics?.stars || 0), 0);
      const totalForks = successfulRepos.reduce((sum, repo) => sum + (repo.metrics?.forks || 0), 0);
      const totalOpenIssues = successfulRepos.reduce((sum, repo) => sum + (repo.metrics?.openIssues || 0), 0);
      const totalOpenPRs = successfulRepos.reduce((sum, repo) => sum + (repo.metrics?.openPRs || 0), 0);
      const totalVulnerabilities = successfulRepos.reduce((sum, repo) => sum + (repo.metrics?.vulnerabilityAlerts || 0), 0);

      return res.json({
        summary: {
          totalRepositories: repositories.length,
          successfulFetches: successfulRepos.length,
          totalStars,
          totalForks,
          totalOpenIssues,
          totalOpenPRs,
          totalVulnerabilities,
          avgStarsPerRepo: successfulRepos.length > 0 ? Math.round(totalStars / successfulRepos.length) : 0
        },
        repositories: dashboardData,
        generatedAt: new Date().toISOString(),
        source: "github-graphql"
      });

    } catch (error) {
      console.error("Error in team dashboard:", error);
      
      // Provide helpful error messages
      if (error.message?.includes('rate limit')) {
        return res.status(429).json({
          message: "GitHub API rate limit exceeded. Please try again later.",
          error: "RATE_LIMIT_EXCEEDED"
        });
      }

      if (error.message?.includes('Bad credentials')) {
        return res.status(401).json({
          message: "GitHub authentication failed. Please check your token.",
          error: "GITHUB_AUTH_FAILED"
        });
      }

      return res.status(500).json({
        message: "Internal server error while fetching dashboard data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Security monitoring endpoint
  app.get("/api/security-monitoring", (req, res) => {
    try {
      const { timeRange = '7d' } = req.query;

      if (!['1d', '7d', '30d', '90d'].includes(timeRange as string)) {
        return res.status(400).json({ message: "Invalid time range. Supported values: 1d, 7d, 30d, 90d" });
      }

      const monitoringData = generateSecurityMonitoringData(timeRange as string);

      return res.json(monitoringData);
    } catch (error) {
      console.error("Error generating security monitoring data:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Repository endpoint for frontend compatibility
  app.get("/api/repository", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ message: "Repository URL is required" });
      }

      // Extract owner/repo from GitHub URL
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return res.status(400).json({ message: "Invalid GitHub URL format. Use: https://github.com/owner/repo" });
      }

      const [, owner, repo] = match;
      const repository = `${owner}/${repo}`;

      // Get or create repository data
      let repositoryData = await storage.getRepositoryByFullName(repository);

      if (!repositoryData) {
        // Create a new repository entry with simulated data
        const [owner, repo] = repository.split('/');
        const newRepo = {
          fullName: repository,
          name: repo,
          owner: owner,
          description: `${repo} repository`,
          url: `https://github.com/${repository}`,
          visibility: "Public",
          stars: Math.floor(Math.random() * 1000),
          forks: Math.floor(Math.random() * 100),
          watchers: Math.floor(Math.random() * 500),
          issues: Math.floor(Math.random() * 50),
          pullRequests: Math.floor(Math.random() * 20),
          language: "JavaScript",
          lastUpdated: new Date(),
          codeQuality: Math.floor(Math.random() * 30) + 70,
          testCoverage: Math.floor(Math.random() * 40) + 60,
          issuesCount: Math.floor(Math.random() * 20) + 5,
          metaData: {},
          fileStructure: {}};

        repositoryData = await storage.createRepository(newRepo);

        // Generate files and issues
        await generateFiles(repositoryData.id, "app");
        await generateIssues(repositoryData.id);
      }

      const files = await storage.getFilesByRepositoryId(repositoryData.id);
      const issues = await storage.getIssuesByRepositoryId(repositoryData.id);

      return res.json({
        repository: repositoryData,
        files,
        issues
      });
    } catch (error) {
      console.error("Error in repository endpoint:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Comprehensive security scanning endpoint
  app.post("/api/comprehensive-security-scan", async (req, res) => {
    try {
      const { repository, filePath, code } = req.body;

      if (!repository || !filePath || !code) {
        return res.status(400).json({ message: "Repository, filePath, and code are required" });
      }

      // Get repository data
      const repositoryData = await storage.getRepositoryByFullName(repository);
      if (!repositoryData) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Perform comprehensive security scan
      const scanResults = await securityScanner.performComprehensiveScan(
        repositoryData.id,
        code,
        filePath
      );

      // Calculate overall risk score
      const overallRiskScore = scanResults.reduce((total, result) => total + result.riskScore, 0) / scanResults.length;

      return res.json({
        repository,
        filePath,
        scanResults,
        overallRiskScore: Math.round(overallRiskScore),
        scanTimestamp: new Date().toISOString(),
        recommendations: [
          "Prioritize fixing critical and high-severity vulnerabilities",
          "Implement security scanning in your CI/CD pipeline",
          "Consider using security linting tools",
          "Regular dependency updates and security audits"
        ]
      });
    } catch (error) {
      console.error("Error in comprehensive security scan:", error);
      return res.status(500).json({ message: "Server error during security scan" });
    }
  });

  // Quality trends endpoint
  app.get("/api/quality-trends/:repository", async (req, res) => {
    try {
      const { repository } = req.params;
      const { days = "30" } = req.query;

      const repositoryData = await storage.getRepositoryByFullName(repository);
      if (!repositoryData) {
        return res.status(404).json({ message: "Repository not found" });
      }

      const trendData = await qualityTrendsService.getTrendData(
        repositoryData.id,
        parseInt(days as string)
      );

      const qualityMetrics = await qualityTrendsService.getQualityMetrics(repositoryData.id);
      const qualityReport = await qualityTrendsService.generateQualityReport(repositoryData.id);

      return res.json({
        repository,
        timeframe: `${days} days`,
        trends: trendData,
        metrics: qualityMetrics,
        report: qualityReport
      });
    } catch (error) {
      console.error("Error fetching quality trends:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // AI suggestions endpoint
  app.post("/api/ai-suggestions", async (req, res) => {
    try {
      const { repository, filePath, code, language, issues } = req.body;

      if (!repository || !filePath || !code) {
        return res.status(400).json({ message: "Repository, filePath, and code are required" });
      }

      const repositoryData = await storage.getRepositoryByFullName(repository);
      if (!repositoryData) {
        return res.status(404).json({ message: "Repository not found" });
      }

      const context = {
        code,
        filePath,
        language: language || 'javascript',
        issues: issues || []
      };

      const suggestions = await aiSuggestionsService.generateSuggestions(
        repositoryData.id,
        context
      );

      return res.json({
        repository,
        filePath,
        suggestions,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Apply AI suggestion endpoint
  app.post("/api/ai-suggestions/:id/apply", async (req, res) => {
    try {
      const { id } = req.params;
      const suggestionId = parseInt(id);

      if (isNaN(suggestionId)) {
        return res.status(400).json({ message: "Invalid suggestion ID" });
      }

      const success = await aiSuggestionsService.applySuggestion(suggestionId);

      if (success) {
        return res.json({ message: "Suggestion applied successfully" });
      } else {
        return res.status(500).json({ message: "Failed to apply suggestion" });
      }
    } catch (error) {
      console.error("Error applying suggestion:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Reject AI suggestion endpoint
  app.post("/api/ai-suggestions/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const suggestionId = parseInt(id);

      if (isNaN(suggestionId)) {
        return res.status(400).json({ message: "Invalid suggestion ID" });
      }

      const success = await aiSuggestionsService.rejectSuggestion(suggestionId);

      if (success) {
        return res.json({ message: "Suggestion rejected successfully" });
      } else {
        return res.status(500).json({ message: "Failed to reject suggestion" });
      }
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Vulnerability scanning endpoint
  app.post("/api/vulnerability-scan", async (req, res) => {
    try {
      const { repository, branch } = req.body;

      if (!repository) {
        return res.status(400).json({ message: "Repository name is required" });
      }

      // Perform different types of scans
      const dependencyResults = await scanDependencies(repository, branch);
      const secretResults = await scanForSecrets(repository, branch);
      const sastResults = await performSASTScan(repository, branch);

      // Combine all vulnerabilities
      const allVulnerabilities = [
        ...dependencyResults.flatMap(dep => dep.vulnerabilities?.map((v: any) => ({ ...v, source: 'dependency', dependency: dep.name })) || []),
        ...secretResults.map(s => ({ ...s, source: 'secret' })),
        ...sastResults.map(s => ({ ...s, source: 'sast' }))
      ];

      // Count vulnerabilities by severity
      const vulnerabilityCounts = {
        total: allVulnerabilities.length,
        critical: allVulnerabilities.filter(v => v.severity === 'critical').length,
        high: allVulnerabilities.filter(v => v.severity === 'high').length,
        medium: allVulnerabilities.filter(v => v.severity === 'medium').length,
        low: allVulnerabilities.filter(v => v.severity === 'low').length
      };

      // Generate overall security score
      const securityScore = Math.max(0, 100 -
        (vulnerabilityCounts.critical * 25) -
        (vulnerabilityCounts.high * 10) -
        (vulnerabilityCounts.medium * 5) -
        (vulnerabilityCounts.low * 2)
      );

      // Generate recommendations
      const recommendations = generateSecurityRecommendations(allVulnerabilities);

      return res.json({
        repository,
        branch: branch || 'main',
        scan_timestamp: new Date().toISOString(),
        security_score: securityScore,
        vulnerability_counts: vulnerabilityCounts,
        scan_results: {
          dependencies: dependencyResults,
          secrets: secretResults,
          sast: sastResults
        },
        recommendations
      });
    } catch (error) {
      console.error("Error scanning repository:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Analyze GitHub repository
  app.post("/api/analyze-repository", async (req, res) => {
    try {
      const { repository } = req.body;

      if (!repository || typeof repository !== 'string') {
        return res.status(400).json({ message: "Repository name is required and must be a string" });
      }

      // Enhanced input validation for security
      if (repository.length > 200) {
        return res.status(400).json({ message: "Repository name is too long" });
      }

      // Sanitize input - remove any potentially dangerous characters
      const sanitizedRepo = repository.trim().replace(/[^a-zA-Z0-9\-_./]/g, '');

      // Validate repository format (owner/repo)
      const repoParts = sanitizedRepo.split('/');
      if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
        return res.status(400).json({ message: "Repository must be in format 'owner/repo'" });
      }

      // Validate GitHub username/repo name constraints
      const [owner, repo] = repoParts;
      const validNamePattern = /^[a-zA-Z0-9._-]+$/;
      if (!validNamePattern.test(owner) || !validNamePattern.test(repo)) {
        return res.status(400).json({ message: "Invalid characters in repository owner or name" });
      }

      // Additional validation for owner and repo names
      if (owner.length > 100 || repo.length > 100) {
        return res.status(400).json({ message: "Owner or repository name is too long" });
      }
      const fullName = `${owner}/${repo}`;

      let repositoryData = await storage.getRepositoryByFullName(fullName);

      if (!repositoryData) {
        try {
          // Try to fetch from GitHub using the new client
          if (githubClient.hasAuthentication()) {
            try {
              const githubRepo = await githubClient.getRepository(owner, repo);

              // Create repository in our database using real GitHub data
              const newRepo = {
                fullName: githubRepo.full_name,
                name: githubRepo.name,
                owner: githubRepo.owner.login,
                description: githubRepo.description || `${githubRepo.name} repository`,
                url: githubRepo.html_url,
                visibility: githubRepo.private ? "Private" : "Public",
                stars: githubRepo.stargazers_count,
                forks: githubRepo.forks_count,
                watchers: githubRepo.watchers_count,
                issues: githubRepo.open_issues_count,
                pullRequests: 0, // Not directly available from this endpoint
                language: githubRepo.language,
                lastUpdated: new Date(githubRepo.updated_at),
                codeQuality: Math.floor(Math.random() * 30) + 70, // Simulated score
                testCoverage: Math.floor(Math.random() * 40) + 60, // Simulated score
                issuesCount: githubRepo.open_issues_count,
                metaData: githubRepo,
                fileStructure: {}
              };

              repositoryData = await storage.createRepository(newRepo);

              // Fetch real repository structure
              await generateRealFiles(repositoryData.id, owner, repo);
            } catch (githubError) {
              console.error("Error fetching from GitHub:", githubError);
              throw new Error("Failed to fetch repository from GitHub. Please ensure the repository exists and isaccessible.");
            }
          } else {
            throw new Error("GitHub authentication required. Please provide a valid GitHub token to access repository data.");
          }

          // Generate code issues for the repository
          await generateIssues(repositoryData.id);

        } catch (error) {
          console.error("Error creating repository:", error);
          if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
          }
          return res.status(500).json({ message: "Failed to analyze repository" });
        }
      }

      // Get repository files and issues with error handling
      let files, issues;
      try {
        files = await storage.getFilesByRepositoryId(repositoryData.id);
        issues = await storage.getIssuesByRepositoryId(repositoryData.id);

        // Limit results to prevent memory issues
        if (files.length > 1000) {
          files = files.slice(0, 1000);
        }
        if (issues.length > 500) {
          issues = issues.slice(0, 500);
        }
      } catch (dbError) {
        console.error("Database error fetching files/issues:", dbError);
        return res.status(500).json({ message: "Failed to retrieve repository data" });
      }

      return res.json({
        repository: repositoryData,
        files,
        issues
      });
    } catch (error) {
      console.error("Error analyzing repository:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Compare repositories endpoint
  app.post("/api/compare-repositories", async (req, res) => {
    try {
      const { repositoryIds } = req.body;

      if (!repositoryIds || !Array.isArray(repositoryIds) || repositoryIds.length < 2) {
        return res.status(400).json({ message: "At least two repository IDs are required" });
      }

      // Validate that all IDs are numbers
      if (!repositoryIds.every(id => typeof id === 'number' && id > 0)) {
        return res.status(400).json({ message: "All repository IDs must be positive numbers" });
      }

      // Limit the number of repositories to prevent memory issues
      if (repositoryIds.length > 10) {
        return res.status(400).json({ message: "Cannot compare more than 10 repositories at once" });
      }

      // Get repositories with their files
      const repositories = [];
      for (const id of repositoryIds) {
        try {
          const repository = await storage.getRepository(id);
          if (repository) {
            const files = await storage.getFilesByRepositoryId(id);
            repositories.push({ ...repository, files });
          }
        } catch (error) {
          console.error('Error fetching repository id:', error);
          // Continue with other repositories instead of failing completely
        }
      }

      if (repositories.length < 2) {
        return res.status(404).json({ message: "Not enough valid repositories found" });
      }

      // Find overlaps between repositories
      const overlaps = findRepositoryOverlaps(repositories);

      // Calculate project overview
      const projectOverview = calculateProjectOverview(repositories);

      return res.json({
        overlaps,
        projectOverview
      });
    } catch (error) {
      console.error("Error comparing repositories:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get real file content from GitHub
  app.get("/api/file-content", async (req, res) => {
    try {
      const { owner, repo, path } = req.query;

      if (!owner || !repo || !path) {
        return res.status(400).json({ message: "Owner, repo, and path are required" });
      }

      if (typeof owner !== 'string' || typeof repo !== 'string' || typeof path !== 'string') {
        return res.status(400).json({ message: "Parameters must be strings" });
      }

      try {
        const content = await githubClient.getFileContent(owner, repo, path);

        return res.json({
          path,
          content,
          language: getLanguageFromPath(path)
        });
      } catch (error) {
        console.error("Error fetching file content:", error);
        return res.status(404).json({ message: "File not found or could not be accessed" });
      }
    } catch (error) {
      console.error("Error in file content endpoint:", error);
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

      // Validate username format (basic security check)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ message: "Invalid username format" });
      }

      console.log(`Scanning repositories for user: ${username}`);

      // Generate simulated repositories for the user
      const repoTypes = [
        "website", "app", "api", "ui-components",
        "docs", "utils", "mobile", "server"
      ];

      // Create simulated repositories
      const repositories = [];

      for (let i = 0; i < repoTypes.length; i++) {
        const repoName = repoTypes[i];
        const fullName = `${username}/${repoName}`;

        // Check if repository exists in storage
        let repository = await storage.getRepositoryByFullName(fullName);

        if (!repository) {
          // Create repository in database
          const newRepo = {
            fullName,
            name: repoName,
            owner: username,
            description: `${username}'s ${repoName} project`,
            url: `https://github.com/${fullName}`,
            visibility: "Public",
            stars: Math.floor(Math.random() * 1000),
            forks: Math.floor(Math.random() * 200),
            watchers: Math.floor(Math.random() * 100),
            issues: Math.floor(Math.random() * 50),
            pullRequests: Math.floor(Math.random() * 20),
            language: ["JavaScript", "TypeScript", "Python", "Go", "Java"][Math.floor(Math.random() * 5)],
            lastUpdated: new Date(),
            codeQuality: Math.floor(Math.random() * 30) + 70,
            testCoverage: Math.floor(Math.random() * 40) + 60,
            issuesCount: Math.floor(Math.random() * 10),
            metaData: {},
            fileStructure: {}
          };

          repository = await storage.createRepository(newRepo);
          console.log(`Created repository: ${repository.name}`);

          // Generate simulated files
          await generateFiles(repository.id, repoName);

          // Generate code issues
          await generateIssues(repository.id);
        }

        repositories.push(repository);
      }

      // Get files for each repository
      const reposWithFiles = await Promise.all(
        repositories.map(async (repo) => {
          const files = await storage.getFilesByRepositoryId(repo.id);
          return { ...repo, files };
        })
      );

      // Find overlaps between repositories
      const overlaps = findRepositoryOverlaps(reposWithFiles);
      const projectOverview = calculateProjectOverview(reposWithFiles);

      return res.json({
        overlaps,
        projectOverview
      });
    } catch (error) {
      console.error("Error scanning repositories:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Helper function to create simulated repository files

  async function generateFiles(repositoryId: number, repoType: string) {
    const fileStructures: Record<string, string[]> = {
      "website": [
        "index.html",
        "styles.css",
        "script.js",
        "images/logo.png",
        "pages/about.html"
      ],
      "app": [
        "src/index.js",
        "src/App.js",
        "src/components/Header.js",
        "public/index.html",
        "package.json"
      ],
      "api": [
        "server.js",
        "routes/index.js",
        "models/User.js",
        "controllers/auth.js",
        "middleware/auth.js"
      ],
      "ui-components": [
        "src/Button.js",
        "src/Card.js",
        "src/Input.js",
        "src/theme.js",
        "package.json"
      ],
      "docs": [
        "README.md",
        "getting-started.md",
        "api-reference.md",
        "tutorials/basic.md",
        "examples/simple.md"
      ],
      "utils": [
        "src/string.js",
        "src/array.js",
        "src/date.js",
        "src/validation.js",
        "index.js"
      ],
      "mobile": [
        "App.js",
        "screens/Home.js",
        "components/Button.js",
        "styles/theme.js",
        "package.json"
      ],
      "server": [
        "index.js",
        "config/db.js",
        "routes/api.js",
        "models/User.js",
        "middleware/auth.js"
      ]
    };

    // Get file structure for this repo type
    const files = fileStructures[repoType] || fileStructures["app"];

    // Create files in database
    for (const filePath of files) {
      const type = filePath.includes(".") ? "file" : "dir";
      const language = getLanguageFromPath(filePath);

      await storage.createRepositoryFile({
        repositoryId,
        filePath,
        type,
        language,
        content: null
      });
    }
  }



  // Generate code issues for a repository
  async function generateIssues(repositoryId: number) {
    // Get files for the repository
    const files = await storage.getFilesByRepositoryId(repositoryId);

    // Generate random issues for each file
    for (const file of files) {
      if (file.type === "file") {
        // Only generate issues for actual files (not directories)
        const issueCount = Math.floor(Math.random() * 3); // 0-2 issues per file

        for (let i = 0; i < issueCount; i++) {
          // Generate a random issue
          const issueTypes = ["bug", "warning", "info"];
          const severities = ["high", "medium", "low"];
          const categories = ["security", "performance", "codeQuality", "accessibility"];

          const issue = {
            repositoryId: file.repositoryId,
            filePath: file.filePath,
            lineNumber: Math.floor(Math.random() * 100) + 1,
            issueType: issueTypes[Math.floor(Math.random() * issueTypes.length)] as "bug" | "warning" | "info",
            severity: severities[Math.floor(Math.random() * severities.length)] as "high" | "medium" | "low",
            category: categories[Math.floor(Math.random() * categories.length)],
            message: `Issue detected in ${file.filePath}`,
            code: `Sample code from line ${Math.floor(Math.random() * 100) + 1}`,
            suggestion: `Consider refactoring this code to improve ${categories[Math.floor(Math.random() * categories.length)]}`
          };

          await storage.createCodeIssue(issue);
        }
      }
    }
  }

  // Find overlaps between repositories
  function findRepositoryOverlaps(reposWithFiles: any[]) {
    const overlaps = [];

    // Compare each repository with every other repository
    for (let i = 0; i < reposWithFiles.length; i++) {
      for (let j = i + 1; j < reposWithFiles.length; j++) {
        const repo1 = reposWithFiles[i];
        const repo2 = reposWithFiles[j];

        // Find similar files between the two repositories
        const similarFiles = [];

        for (const file1 of repo1.files) {
          for (const file2 of repo2.files) {
            // Calculate similarity based on file path and type
            const similarity = calculateFileSimilarity(file1, file2);

            if (similarity > 0.5) {
              similarFiles.push({
                file1: {
                  repositoryId: file1.repositoryId,
                  filePath: file1.filePath,
                  language: file1.language
                },
                file2: {
                  repositoryId: file2.repositoryId,
                  filePath: file2.filePath,
                  language: file2.language
                },
                similarityScore: similarity
              });
            }
          }
        }

        // Only add overlaps if there are similar files
        if (similarFiles.length > 0) {
          overlaps.push({
            repositories: [
              { id: repo1.id, name: repo1.name, fullName: repo1.fullName },
              { id: repo2.id, name: repo2.name, fullName: repo2.fullName }
            ],
            similarFiles,
            description: generateOverlapDescription(repo1, repo2, similarFiles),
            mergeRecommendation: generateMergeRecommendation(repo1, repo2, similarFiles)
          });
        }
      }
    }

    return overlaps;
  }

  // Calculate similarity between two files
  function calculateFileSimilarity(file1: any, file2: any) {
    // Simple similarity calculation based on file path
    if (file1.filePath === file2.filePath) {
      return 1.0;
    }

    // Check if the file names are the same
    const fileName1 = file1.filePath.split('/').pop();
    const fileName2 = file2.filePath.split('/').pop();

    if (fileName1 === fileName2) {
      return 0.8;
    }

    // Check if the file extensions are the same
    const ext1 = fileName1?.includes('.') ? fileName1.split('.').pop() : null;
    const ext2 = fileName2?.includes('.') ? fileName2.split('.').pop() : null;

    if (ext1 && ext2 && ext1 === ext2) {
      return 0.6;
    }

    // Check if the file languages are the same
    if (file1.language && file2.language && file1.language === file2.language) {
      return 0.5;
    }

    // Check if the directories are similar
    const dir1 = file1.filePath.includes('/') ? file1.filePath.split('/').slice(0, -1).join('/') : null;
    const dir2 = file2.filePath.includes('/') ? file2.filePath.split('/').slice(0, -1).join('/') : null;

    if (dir1 && dir2 && dir1 === dir2) {
      return 0.7;
    }

    return 0.3;
  }

  // Generate a description for the overlap
  function generateOverlapDescription(repo1: any, repo2: any, similarFiles: any[]) {
    return `Found ${similarFiles.length} similar files between ${repo1.name} and ${repo2.name}. These repositories appear to have overlapping functionality.`;
  }

  // Generate a merge recommendation
  function generateMergeRecommendation(repo1: any, repo2: any, similarFiles: any[]) {
    if (similarFiles.length > 3) {
      return `Recommend merging ${repo2.name} into ${repo1.name} to reduce code duplication and improve maintainability.`;
    } else {
      return `Consider extracting common functionality into a shared library used by both ${repo1.name} and ${repo2.name}.`;
    }
  }

  // Calculate project overview
  function calculateProjectOverview(reposWithFiles: any[]) {
    // Calculate total repositories and files
    const totalRepositories = reposWithFiles.length;
    let totalFiles = 0;
    const languageCounts: Record<string, number> = {};
    let duplicateCount = 0;

    // Create a map of file paths to count duplicates
    const filePaths = new Map();

    // Process all files in all repositories
    for (const repo of reposWithFiles) {
      for (const file of repo.files) {
        totalFiles++;

        // Count by language
        if (file.language) {
          languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
        }

        // Check for duplicates
        if (file.type === "file") {
          const filePath = file.filePath;
          if (filePaths.has(filePath)) {
            duplicateCount++;
          } else {
            filePaths.set(filePath, true);
          }
        }
      }
    }

    // Calculate duplicate percentage
    const duplicatePercentage = totalFiles > 0 ? (duplicateCount / totalFiles) * 100 : 0;

    return {
      totalRepositories,
      totalFiles,
      languageDistribution: languageCounts,
      duplicateCodePercentage: Math.round(duplicatePercentage * 10) / 10
    };
  }

  return httpServer;
}

export { detectLanguage, analyzeCodeSecurity, getLineNumber };