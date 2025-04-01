import { 
  users, type User, type InsertUser,
  repositories, type Repository, type InsertRepository,
  codeIssues, type CodeIssue, type InsertCodeIssue,
  repositoryFiles, type RepositoryFile, type InsertRepositoryFile
} from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

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

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const results = await db.insert(users).values(insertUser).returning();
    return results[0];
  }
  
  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    const results = await db.select().from(repositories).where(eq(repositories.id, id));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getRepositoryByFullName(fullName: string): Promise<Repository | undefined> {
    const results = await db.select().from(repositories).where(eq(repositories.fullName, fullName));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const results = await db.insert(repositories).values(insertRepository).returning();
    return results[0];
  }
  
  // Code Issue methods
  async getIssuesByRepositoryId(repositoryId: number): Promise<CodeIssue[]> {
    return await db.select().from(codeIssues).where(eq(codeIssues.repositoryId, repositoryId));
  }
  
  async createCodeIssue(insertIssue: InsertCodeIssue): Promise<CodeIssue> {
    const results = await db.insert(codeIssues).values(insertIssue).returning();
    return results[0];
  }
  
  // Repository File methods
  async getFilesByRepositoryId(repositoryId: number): Promise<RepositoryFile[]> {
    return await db.select().from(repositoryFiles).where(eq(repositoryFiles.repositoryId, repositoryId));
  }
  
  async getFileByPath(repositoryId: number, filePath: string): Promise<RepositoryFile | undefined> {
    const results = await db.select().from(repositoryFiles).where(
      and(
        eq(repositoryFiles.repositoryId, repositoryId),
        eq(repositoryFiles.filePath, filePath)
      )
    );
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createRepositoryFile(insertFile: InsertRepositoryFile): Promise<RepositoryFile> {
    const results = await db.insert(repositoryFiles).values(insertFile).returning();
    return results[0];
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
