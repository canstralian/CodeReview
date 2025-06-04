import {
  users,
  repositories,
  codeIssues,
  repositoryFiles,
  type User,
  type UpsertUser,
  type Repository,
  type InsertRepository,
  type CodeIssue,
  type InsertCodeIssue,
  type RepositoryFile,
  type InsertRepositoryFile,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Repository operations
  async getRepository(id: number): Promise<Repository | undefined> {
    const [repository] = await db.select().from(repositories).where(eq(repositories.id, id));
    return repository;
  }

  async getRepositoryByFullName(fullName: string): Promise<Repository | undefined> {
    const [repository] = await db.select().from(repositories).where(eq(repositories.fullName, fullName));
    return repository;
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const [repository] = await db
      .insert(repositories)
      .values(insertRepository)
      .returning();
    return repository;
  }

  // Code Issues operations
  async getIssuesByRepositoryId(repositoryId: number): Promise<CodeIssue[]> {
    return await db.select().from(codeIssues).where(eq(codeIssues.repositoryId, repositoryId));
  }

  async createCodeIssue(insertIssue: InsertCodeIssue): Promise<CodeIssue> {
    const [issue] = await db
      .insert(codeIssues)
      .values(insertIssue)
      .returning();
    return issue;
  }

  // Repository Files operations
  async getFilesByRepositoryId(repositoryId: number): Promise<RepositoryFile[]> {
    return await db.select().from(repositoryFiles).where(eq(repositoryFiles.repositoryId, repositoryId));
  }

  async getFileByPath(repositoryId: number, filePath: string): Promise<RepositoryFile | undefined> {
    const [file] = await db
      .select()
      .from(repositoryFiles)
      .where(eq(repositoryFiles.repositoryId, repositoryId))
      .where(eq(repositoryFiles.filePath, filePath));
    return file;
  }

  async createRepositoryFile(insertFile: InsertRepositoryFile): Promise<RepositoryFile> {
    const [file] = await db
      .insert(repositoryFiles)
      .values(insertFile)
      .returning();
    return file;
  }
}

export const storage = new DatabaseStorage();