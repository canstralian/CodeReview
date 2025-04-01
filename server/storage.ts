import { 
  users, type User, type InsertUser,
  repositories, type Repository, type InsertRepository,
  codeIssues, type CodeIssue, type InsertCodeIssue,
  repositoryFiles, type RepositoryFile, type InsertRepositoryFile
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private repositories: Map<number, Repository>;
  private codeIssues: Map<number, CodeIssue>;
  private repositoryFiles: Map<number, RepositoryFile>;
  
  private userId: number;
  private repositoryId: number;
  private codeIssueId: number;
  private repositoryFileId: number;

  constructor() {
    this.users = new Map();
    this.repositories = new Map();
    this.codeIssues = new Map();
    this.repositoryFiles = new Map();
    
    this.userId = 1;
    this.repositoryId = 1;
    this.codeIssueId = 1;
    this.repositoryFileId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }
  
  async getRepositoryByFullName(fullName: string): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(
      (repo) => repo.fullName === fullName,
    );
  }
  
  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.repositoryId++;
    const repository: Repository = { ...insertRepository, id };
    this.repositories.set(id, repository);
    return repository;
  }
  
  // Code Issue methods
  async getIssuesByRepositoryId(repositoryId: number): Promise<CodeIssue[]> {
    return Array.from(this.codeIssues.values()).filter(
      (issue) => issue.repositoryId === repositoryId,
    );
  }
  
  async createCodeIssue(insertIssue: InsertCodeIssue): Promise<CodeIssue> {
    const id = this.codeIssueId++;
    const issue: CodeIssue = { ...insertIssue, id };
    this.codeIssues.set(id, issue);
    return issue;
  }
  
  // Repository File methods
  async getFilesByRepositoryId(repositoryId: number): Promise<RepositoryFile[]> {
    return Array.from(this.repositoryFiles.values()).filter(
      (file) => file.repositoryId === repositoryId,
    );
  }
  
  async getFileByPath(repositoryId: number, filePath: string): Promise<RepositoryFile | undefined> {
    return Array.from(this.repositoryFiles.values()).find(
      (file) => file.repositoryId === repositoryId && file.filePath === filePath,
    );
  }
  
  async createRepositoryFile(insertFile: InsertRepositoryFile): Promise<RepositoryFile> {
    const id = this.repositoryFileId++;
    const file: RepositoryFile = { ...insertFile, id };
    this.repositoryFiles.set(id, file);
    return file;
  }
}

export const storage = new MemStorage();
