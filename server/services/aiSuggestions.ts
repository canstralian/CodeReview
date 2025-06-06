
import { db } from "../db";
import { aiSuggestions, codeIssues } from "../../shared/schema";
import { eq } from "drizzle-orm";

interface CodeContext {
  code: string;
  filePath: string;
  language: string;
  issues: any[];
}

interface AISuggestion {
  suggestion: string;
  confidence: number;
  suggestedFix: string;
  reasoning: string;
  category: 'refactor' | 'security' | 'performance' | 'bug-fix';
}

export class AISuggestionsService {
  
  async generateSuggestions(repositoryId: number, context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    
    // Performance optimizations
    const performanceSuggestions = await this.analyzePerformance(context);
    suggestions.push(...performanceSuggestions);
    
    // Security improvements
    const securitySuggestions = await this.analyzeSecurity(context);
    suggestions.push(...securitySuggestions);
    
    // Code quality improvements
    const qualitySuggestions = await this.analyzeCodeQuality(context);
    suggestions.push(...qualitySuggestions);
    
    // Refactoring suggestions
    const refactorSuggestions = await this.analyzeRefactoring(context);
    suggestions.push(...refactorSuggestions);
    
    // Store suggestions in database
    for (const suggestion of suggestions) {
      await db.insert(aiSuggestions).values({
        repositoryId,
        filePath: context.filePath,
        suggestion: suggestion.suggestion,
        confidence: suggestion.confidence,
        suggestedFix: suggestion.suggestedFix,
        reasoning: suggestion.reasoning,
        category: suggestion.category,
        status: 'pending'
      });
    }
    
    return suggestions;
  }

  private async analyzePerformance(context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const { code, language } = context;

    // Detect inefficient loops
    if (code.includes('for (') && code.includes('.length')) {
      const inefficientLoop = code.match(/for\s*\([^)]*\.length[^)]*\)/);
      if (inefficientLoop) {
        suggestions.push({
          suggestion: 'Cache array length in loop condition',
          confidence: 0.85,
          suggestedFix: `// Instead of calculating length each iteration:
for (let i = 0; i < array.length; i++) { ... }

// Cache the length:
const length = array.length;
for (let i = 0; i < length; i++) { ... }`,
          reasoning: 'Accessing .length property in each loop iteration causes unnecessary computations',
          category: 'performance'
        });
      }
    }

    // Detect inefficient DOM queries
    if (language === 'javascript' && code.includes('document.querySelector') && code.includes('for')) {
      suggestions.push({
        suggestion: 'Cache DOM queries outside loops',
        confidence: 0.90,
        suggestedFix: `// Instead of querying DOM in each iteration:
for (let item of items) {
  document.querySelector('.container').appendChild(item);
}

// Cache the element:
const container = document.querySelector('.container');
for (let item of items) {
  container.appendChild(item);
}`,
        reasoning: 'DOM queries are expensive operations and should be cached when used repeatedly',
        category: 'performance'
      });
    }

    // Detect memory leaks potential
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      suggestions.push({
        suggestion: 'Add event listener cleanup to prevent memory leaks',
        confidence: 0.75,
        suggestedFix: `// Add cleanup in componentWillUnmount or useEffect cleanup:
useEffect(() => {
  const handleClick = () => { ... };
  element.addEventListener('click', handleClick);
  
  return () => {
    element.removeEventListener('click', handleClick);
  };
}, []);`,
        reasoning: 'Event listeners should be removed to prevent memory leaks, especially in SPAs',
        category: 'performance'
      });
    }

    return suggestions;
  }

  private async analyzeSecurity(context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const { code } = context;

    // Detect potential XSS vulnerabilities
    if (code.includes('innerHTML') && (code.includes('${') || code.includes('+'))) {
      suggestions.push({
        suggestion: 'Use textContent or sanitize input to prevent XSS',
        confidence: 0.95,
        suggestedFix: `// Instead of:
element.innerHTML = userInput;

// Use:
element.textContent = userInput;
// OR sanitize the input:
element.innerHTML = DOMPurify.sanitize(userInput);`,
        reasoning: 'Direct innerHTML assignment with user input can lead to XSS attacks',
        category: 'security'
      });
    }

    // Detect weak cryptographic practices
    if (code.includes('Math.random()') && (code.includes('password') || code.includes('token') || code.includes('session'))) {
      suggestions.push({
        suggestion: 'Use cryptographically secure random number generation',
        confidence: 0.88,
        suggestedFix: `// Instead of Math.random() for security purposes:
const token = Math.random().toString(36);

// Use crypto.getRandomValues():
const array = new Uint32Array(1);
crypto.getRandomValues(array);
const token = array[0].toString(36);

// Or use crypto.randomBytes() in Node.js:
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');`,
        reasoning: 'Math.random() is not cryptographically secure and should not be used for security-sensitive operations',
        category: 'security'
      });
    }

    return suggestions;
  }

  private async analyzeCodeQuality(context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const { code, language } = context;

    // Detect long functions
    const functionLines = code.split('\n').length;
    if (functionLines > 50) {
      suggestions.push({
        suggestion: 'Break down large function into smaller, focused functions',
        confidence: 0.80,
        suggestedFix: `// Instead of one large function:
function processUserData(userData) {
  // 50+ lines of code
}

// Break into smaller functions:
function validateUserData(userData) { ... }
function transformUserData(userData) { ... }
function saveUserData(userData) { ... }

function processUserData(userData) {
  const validData = validateUserData(userData);
  const transformedData = transformUserData(validData);
  return saveUserData(transformedData);
}`,
        reasoning: 'Large functions are harder to test, maintain, and understand. Breaking them down improves code quality',
        category: 'refactor'
      });
    }

    // Detect magic numbers
    const magicNumbers = code.match(/\b\d{2,}\b/g);
    if (magicNumbers && magicNumbers.length > 3) {
      suggestions.push({
        suggestion: 'Replace magic numbers with named constants',
        confidence: 0.70,
        suggestedFix: `// Instead of magic numbers:
if (user.age > 18 && user.score > 100) { ... }

// Use named constants:
const LEGAL_AGE = 18;
const MIN_PASSING_SCORE = 100;

if (user.age > LEGAL_AGE && user.score > MIN_PASSING_SCORE) { ... }`,
        reasoning: 'Magic numbers make code harder to understand and maintain. Named constants improve readability',
        category: 'refactor'
      });
    }

    // Detect duplicate code patterns
    if (language === 'javascript' && code.includes('console.log') && code.split('console.log').length > 3) {
      suggestions.push({
        suggestion: 'Remove debug console.log statements or use a proper logging library',
        confidence: 0.60,
        suggestedFix: `// Instead of console.log everywhere:
console.log('Debug info:', data);

// Use a proper logger:
import logger from './logger';
logger.debug('Debug info:', data);

// Or remove debug statements for production`,
        reasoning: 'Console.log statements should be removed from production code or replaced with proper logging',
        category: 'refactor'
      });
    }

    return suggestions;
  }

  private async analyzeRefactoring(context: CodeContext): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const { code, language } = context;

    // Detect callback hell
    if (code.includes('function(') && code.split('function(').length > 4) {
      suggestions.push({
        suggestion: 'Convert nested callbacks to async/await or Promises',
        confidence: 0.85,
        suggestedFix: `// Instead of callback hell:
getData(function(a) {
  getMoreData(a, function(b) {
    getEvenMoreData(b, function(c) {
      // deeply nested
    });
  });
});

// Use async/await:
async function processData() {
  const a = await getData();
  const b = await getMoreData(a);
  const c = await getEvenMoreData(b);
  return c;
}`,
        reasoning: 'Nested callbacks create hard-to-read code. Async/await provides cleaner, more maintainable syntax',
        category: 'refactor'
      });
    }

    // Detect code duplication
    const lines = code.split('\n');
    const duplicates = this.findDuplicateLines(lines);
    if (duplicates.length > 0) {
      suggestions.push({
        suggestion: 'Extract common code into reusable functions',
        confidence: 0.75,
        suggestedFix: `// Instead of duplicated code:
function processUserA() {
  // common setup
  validate();
  transform();
  // specific logic A
}

function processUserB() {
  // common setup
  validate();
  transform();
  // specific logic B
}

// Extract common logic:
function commonProcessing() {
  validate();
  transform();
}

function processUserA() {
  commonProcessing();
  // specific logic A
}`,
        reasoning: 'Code duplication leads to maintenance issues. Extracting common logic improves maintainability',
        category: 'refactor'
      });
    }

    return suggestions;
  }

  private findDuplicateLines(lines: string[]): string[] {
    const lineCount = new Map<string, number>();
    const duplicates: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 10) { // Ignore very short lines
        lineCount.set(trimmed, (lineCount.get(trimmed) || 0) + 1);
      }
    });
    
    lineCount.forEach((count, line) => {
      if (count > 1) {
        duplicates.push(line);
      }
    });
    
    return duplicates;
  }

  async applySuggestion(suggestionId: number): Promise<boolean> {
    try {
      await db.update(aiSuggestions)
        .set({ status: 'applied', appliedAt: new Date() })
        .where(eq(aiSuggestions.id, suggestionId));
      
      return true;
    } catch (error) {
      console.error('Error applying suggestion:', error);
      return false;
    }
  }

  async rejectSuggestion(suggestionId: number): Promise<boolean> {
    try {
      await db.update(aiSuggestions)
        .set({ status: 'rejected' })
        .where(eq(aiSuggestions.id, suggestionId));
      
      return true;
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      return false;
    }
  }
}
