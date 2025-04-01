import { pgTable, text, serial, integer, boolean, jsonb, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  repositories: many(repositories)
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Repository schema for code analysis
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull().unique(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  visibility: text("visibility"),
  stars: integer("stars"),
  forks: integer("forks"),
  watchers: integer("watchers"),
  issues: integer("issues"),
  pullRequests: integer("pull_requests"),
  language: text("language"),
  lastUpdated: timestamp("last_updated"),
  codeQuality: integer("code_quality"),
  testCoverage: integer("test_coverage"),
  issuesCount: integer("issues_count"),
  metaData: jsonb("meta_data"),
  fileStructure: jsonb("file_structure"),
});

export const repositoriesRelations = relations(repositories, ({ many }) => ({
  codeIssues: many(codeIssues),
  files: many(repositoryFiles)
}));

export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

// Code issue schema
export const codeIssues = pgTable("code_issues", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull().references(() => repositories.id, { 
    onDelete: "cascade" 
  }),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number").notNull(),
  issueType: text("issue_type").notNull(), // bug, warning, info
  severity: text("severity").notNull(), // high, medium, low
  category: text("category").default("codeQuality"), // security, performance, codeQuality, accessibility
  message: text("message").notNull(),
  code: text("code").notNull(),
  suggestion: text("suggestion"),
});

export const codeIssuesRelations = relations(codeIssues, ({ one }) => ({
  repository: one(repositories, {
    fields: [codeIssues.repositoryId],
    references: [repositories.id]
  })
}));

export const insertCodeIssueSchema = createInsertSchema(codeIssues).omit({
  id: true,
});

export type InsertCodeIssue = z.infer<typeof insertCodeIssueSchema>;
export type CodeIssue = typeof codeIssues.$inferSelect;

// Repository file schema
export const repositoryFiles = pgTable("repository_files", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull().references(() => repositories.id, { 
    onDelete: "cascade" 
  }),
  filePath: text("file_path").notNull(),
  type: text("type").notNull(), // file or directory
  content: text("content"),
  language: text("language"),
});

export const repositoryFilesRelations = relations(repositoryFiles, ({ one }) => ({
  repository: one(repositories, {
    fields: [repositoryFiles.repositoryId],
    references: [repositories.id]
  })
}));

export const insertRepositoryFileSchema = createInsertSchema(repositoryFiles).omit({
  id: true,
});

export type InsertRepositoryFile = z.infer<typeof insertRepositoryFileSchema>;
export type RepositoryFile = typeof repositoryFiles.$inferSelect;
