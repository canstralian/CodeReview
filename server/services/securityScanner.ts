
import { db } from "../db";
import { securityScans, repositories } from "../../shared/schema";
import { eq } from "drizzle-orm";

interface VulnerabilityData {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  cwe?: string;
  cvss?: number;
  file?: string;
  line?: number;
  recommendation: string;
}

interface ScanResult {
  scanType: string;
  vulnerabilities: VulnerabilityData[];
  riskScore: number;
  findings: any;
}

export class SecurityScanner {
  
  async performComprehensiveScan(repositoryId: number, code: string, filePath: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    
    // SAST (Static Application Security Testing)
    const sastResults = await this.performSASTScan(code, filePath);
    results.push(sastResults);
    
    // Secret Detection
    const secretResults = await this.performSecretScan(code, filePath);
    results.push(secretResults);
    
    // Dependency Scanning (simulated)
    const depResults = await this.performDependencyScan(filePath);
    results.push(depResults);
    
    // Store results in database
    for (const result of results) {
      await db.insert(securityScans).values({
        repositoryId,
        scanType: result.scanType,
        vulnerabilities: result.vulnerabilities,
        riskScore: result.riskScore,
        findings: result.findings,
        status: 'completed'
      });
    }
    
    return results;
  }

  private async performSASTScan(code: string, filePath: string): Promise<ScanResult> {
    const vulnerabilities: VulnerabilityData[] = [];
    let riskScore = 0;

    // Advanced SQL Injection Detection
    const sqlInjectionPatterns = [
      /['"]\s*\+\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\+\s*['"]/, // String concatenation in SQL
      /exec\s*\(\s*['"][^'"]*\$\{[^}]+\}[^'"]*['"]\s*\)/, // Dynamic exec with variables
      /query\s*\(\s*['"][^'"]*\+[^'"]*['"]\s*\)/, // Query concatenation
    ];

    sqlInjectionPatterns.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches) {
        vulnerabilities.push({
          id: `sql-injection-${index}`,
          severity: 'critical',
          title: 'SQL Injection Vulnerability',
          description: 'Dynamic SQL query construction detected that may lead to SQL injection attacks',
          cwe: 'CWE-89',
          cvss: 9.1,
          file: filePath,
          line: this.findLineNumber(code, matches[0]),
          recommendation: 'Use parameterized queries or prepared statements'
        });
        riskScore += 25;
      }
    });

    // XSS Detection
    const xssPatterns = [
      /innerHTML\s*=\s*[^;]+\$\{[^}]+\}/, // innerHTML with template literals
      /document\.write\s*\([^)]*\$\{[^}]+\}[^)]*\)/, // document.write with variables
      /\.html\s*\([^)]*\+[^)]*\)/, // jQuery html() with concatenation
    ];

    xssPatterns.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches) {
        vulnerabilities.push({
          id: `xss-${index}`,
          severity: 'high',
          title: 'Cross-Site Scripting (XSS) Vulnerability',
          description: 'Potential XSS vulnerability through unsanitized user input',
          cwe: 'CWE-79',
          cvss: 7.5,
          file: filePath,
          line: this.findLineNumber(code, matches[0]),
          recommendation: 'Sanitize user input and use safe DOM manipulation methods'
        });
        riskScore += 15;
      }
    });

    // Command Injection
    const commandInjectionPatterns = [
      /exec\s*\([^)]*\$\{[^}]+\}[^)]*\)/, // exec with variables
      /spawn\s*\([^)]*\+[^)]*\)/, // spawn with concatenation
      /system\s*\([^)]*input[^)]*\)/, // system calls with user input
    ];

    commandInjectionPatterns.forEach((pattern, index) => {
      const matches = code.match(pattern);
      if (matches) {
        vulnerabilities.push({
          id: `cmd-injection-${index}`,
          severity: 'critical',
          title: 'Command Injection Vulnerability',
          description: 'Potential command injection through unsanitized user input',
          cwe: 'CWE-78',
          cvss: 8.8,
          file: filePath,
          line: this.findLineNumber(code, matches[0]),
          recommendation: 'Use parameterized commands and input validation'
        });
        riskScore += 20;
      }
    });

    return {
      scanType: 'sast',
      vulnerabilities,
      riskScore: Math.min(riskScore, 100),
      findings: { patterns_checked: sqlInjectionPatterns.length + xssPatterns.length + commandInjectionPatterns.length }
    };
  }

  private async performSecretScan(code: string, filePath: string): Promise<ScanResult> {
    const vulnerabilities: VulnerabilityData[] = [];
    let riskScore = 0;

    // Enhanced secret patterns
    const secretPatterns = [
      { pattern: /(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}/, type: 'AWS Access Key', severity: 'critical' as const },
      { pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/, type: 'GitHub Token', severity: 'critical' as const },
      { pattern: /ya29\.[A-Za-z0-9_-]{68}/, type: 'Google OAuth Token', severity: 'high' as const },
      { pattern: /sk-[A-Za-z0-9]{48}/, type: 'OpenAI API Key', severity: 'high' as const },
      { pattern: /xapp-\d+-[A-Za-z0-9]+-[A-Za-z0-9_-]+/, type: 'Slack App Token', severity: 'medium' as const },
      { pattern: /(?:eyJ[A-Za-z0-9_-]*\.){2}[A-Za-z0-9_-]*/, type: 'JWT Token', severity: 'medium' as const },
      { pattern: /(?:postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/, type: 'Database Connection String', severity: 'critical' as const },
    ];

    secretPatterns.forEach((secretPattern, index) => {
      const matches = code.match(new RegExp(secretPattern.pattern, 'g'));
      if (matches) {
        matches.forEach((match) => {
          vulnerabilities.push({
            id: `secret-${index}-${Math.random().toString(36).substr(2, 9)}`,
            severity: secretPattern.severity,
            title: `Exposed ${secretPattern.type}`,
            description: `${secretPattern.type} found in source code`,
            cwe: 'CWE-798',
            file: filePath,
            line: this.findLineNumber(code, match),
            recommendation: 'Remove secrets from source code and use environment variables or a secure vault'
          });
          
          riskScore += secretPattern.severity === 'critical' ? 25 : 
                      secretPattern.severity === 'high' ? 15 : 10;
        });
      }
    });

    return {
      scanType: 'secret',
      vulnerabilities,
      riskScore: Math.min(riskScore, 100),
      findings: { secrets_found: vulnerabilities.length }
    };
  }

  private async performDependencyScan(filePath: string): Promise<ScanResult> {
    const vulnerabilities: VulnerabilityData[] = [];
    
    // Simulated known vulnerable packages
    const knownVulnerabilities = [
      {
        package: 'lodash',
        version: '<4.17.21',
        vulnerability: {
          id: 'dep-vuln-1',
          severity: 'high' as const,
          title: 'Prototype Pollution in lodash',
          description: 'Lodash versions prior to 4.17.21 are vulnerable to prototype pollution',
          cwe: 'CWE-1321',
          cvss: 7.5,
          recommendation: 'Upgrade lodash to version 4.17.21 or later'
        }
      },
      {
        package: 'axios',
        version: '<0.21.1',
        vulnerability: {
          id: 'dep-vuln-2',
          severity: 'medium' as const,
          title: 'Server-Side Request Forgery in axios',
          description: 'Axios before 0.21.1 allows SSRF via crafted requests',
          cwe: 'CWE-918',
          cvss: 5.4,
          recommendation: 'Upgrade axios to version 0.21.1 or later'
        }
      }
    ];

    // Check if file is package.json and simulate vulnerability scanning
    if (filePath.includes('package.json')) {
      knownVulnerabilities.forEach(vuln => {
        vulnerabilities.push({
          id: vuln.vulnerability.id,
          severity: vuln.vulnerability.severity,
          title: vuln.vulnerability.title,
          description: vuln.vulnerability.description,
          cwe: vuln.vulnerability.cwe,
          cvss: vuln.vulnerability.cvss,
          file: filePath,
          recommendation: vuln.vulnerability.recommendation
        });
      });
    }

    return {
      scanType: 'dependency',
      vulnerabilities,
      riskScore: vulnerabilities.length * 15,
      findings: { dependencies_scanned: knownVulnerabilities.length }
    };
  }

  private findLineNumber(code: string, searchText: string): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
  }
}
