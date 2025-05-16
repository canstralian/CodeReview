import { 
  type User, type InsertUser,
  type Repository, type InsertRepository,
  type CodeIssue, type InsertCodeIssue,
  type RepositoryFile, type InsertRepositoryFile
} from "@shared/schema";
import { db } from "./db";

// Storage interface with CRUD methods
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Repositories
  getRepository(id: number): Promise<Repository | undefined>;
  getRepositoryByFullName(fullName: string): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  
  // Code Issues
  getIssuesByRepositoryId(repositoryId: number): Promise<CodeIssue[]>;
  createCodeIssue(issue: InsertCodeIssue): Promise<CodeIssue>;
  
  // Repository Files
  getFilesByRepositoryId(repositoryId: number): Promise<RepositoryFile[]>;
  getFileByPath(repositoryId: number, filePath: string): Promise<RepositoryFile | undefined>;
  createRepositoryFile(file: InsertRepositoryFile): Promise<RepositoryFile>;
}

// Database storage implementation using direct PostgreSQL queries
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [insertUser.username, insertUser.password]
    );
    return result.rows[0];
  }
  
  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    const result = await db.query('SELECT * FROM repositories WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }
  
  async getRepositoryByFullName(fullName: string): Promise<Repository | undefined> {
    const result = await db.query('SELECT * FROM repositories WHERE full_name = $1', [fullName]);
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }
  
  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const columns = Object.keys(insertRepository).map(key => 
      key === 'fullName' ? 'full_name' : 
      key === 'lastUpdated' ? 'last_updated' :
      key === 'codeQuality' ? 'code_quality' :
      key === 'testCoverage' ? 'test_coverage' :
      key === 'issuesCount' ? 'issues_count' :
      key === 'metaData' ? 'meta_data' :
      key === 'fileStructure' ? 'file_structure' :
      key === 'pullRequests' ? 'pull_requests' : key
    ).join(', ');
    
    const values = Object.values(insertRepository);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const result = await db.query(
      `INSERT INTO repositories (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  // Code Issue methods
  async getIssuesByRepositoryId(repositoryId: number): Promise<CodeIssue[]> {
    const result = await db.query('SELECT * FROM code_issues WHERE repository_id = $1', [repositoryId]);
    return result.rows.map(row => ({
      ...row,
      repositoryId: row.repository_id,
      filePath: row.file_path,
      lineNumber: row.line_number,
      issueType: row.issue_type
    }));
  }
  
  async createCodeIssue(insertIssue: InsertCodeIssue): Promise<CodeIssue> {
    const result = await db.query(
      `INSERT INTO code_issues (
        repository_id, file_path, line_number, issue_type, 
        severity, category, message, code, suggestion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        insertIssue.repositoryId, 
        insertIssue.filePath, 
        insertIssue.lineNumber, 
        insertIssue.issueType,
        insertIssue.severity, 
        insertIssue.category, 
        insertIssue.message, 
        insertIssue.code, 
        insertIssue.suggestion
      ]
    );
    
    const row = result.rows[0];
    return {
      ...row,
      repositoryId: row.repository_id,
      filePath: row.file_path,
      lineNumber: row.line_number,
      issueType: row.issue_type
    };
  }
  
  // Repository File methods
  async getFilesByRepositoryId(repositoryId: number): Promise<RepositoryFile[]> {
    const result = await db.query('SELECT * FROM repository_files WHERE repository_id = $1', [repositoryId]);
    return result.rows.map(row => ({
      ...row,
      repositoryId: row.repository_id,
      filePath: row.file_path
    }));
  }
  
  async getFileByPath(repositoryId: number, filePath: string): Promise<RepositoryFile | undefined> {
    const result = await db.query(
      'SELECT * FROM repository_files WHERE repository_id = $1 AND file_path = $2',
      [repositoryId, filePath]
    );
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      repositoryId: row.repository_id,
      filePath: row.file_path
    };
  }
  
  async createRepositoryFile(insertFile: InsertRepositoryFile): Promise<RepositoryFile> {
    const result = await db.query(
      'INSERT INTO repository_files (repository_id, file_path, type, content, language) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [insertFile.repositoryId, insertFile.filePath, insertFile.type, insertFile.content, insertFile.language]
    );
    
    const row = result.rows[0];
    return {
      ...row,
      repositoryId: row.repository_id,
      filePath: row.file_path
    };
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
