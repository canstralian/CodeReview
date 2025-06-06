import { pgTable, text, serial, integer, boolean, jsonb, timestamp, foreignKey, varchar, index, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
  repositories: many(repositories)
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;

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

export const qualityTrends = pgTable("quality_trends", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").references(() => repositories.id),
  scanDate: timestamp("scan_date").defaultNow(),
  totalIssues: integer("total_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  highIssues: integer("high_issues").notNull().default(0),
  mediumIssues: integer("medium_issues").notNull().default(0),
  lowIssues: integer("low_issues").notNull().default(0),
  securityScore: integer("security_score").notNull().default(100),
  qualityScore: integer("quality_score").notNull().default(100),
  performanceScore: integer("performance_score").notNull().default(100),
  overallScore: integer("overall_score").notNull().default(100),
  technicalDebt: real("technical_debt").notNull().default(0),
  codeComplexity: real("code_complexity").notNull().default(0),
  testCoverage: real("test_coverage").notNull().default(0),
});

export const securityScans = pgTable("security_scans", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").references(() => repositories.id),
  scanType: text("scan_type").notNull(), // 'dependency', 'secret', 'sast', 'dast'
  scanDate: timestamp("scan_date").defaultNow(),
  vulnerabilities: jsonb("vulnerabilities"),
  riskScore: integer("risk_score").notNull().default(0),
  status: text("status").notNull().default('completed'), // 'pending', 'running', 'completed', 'failed'
  findings: jsonb("findings"),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").references(() => codeIssues.id),
  repositoryId: integer("repository_id").references(() => repositories.id),
  filePath: text("file_path").notNull(),
  suggestion: text("suggestion").notNull(),
  confidence: real("confidence").notNull().default(0),
  suggestedFix: text("suggested_fix"),
  reasoning: text("reasoning"),
  category: text("category").notNull(), // 'refactor', 'security', 'performance', 'bug-fix'
  status: text("status").notNull().default('pending'), // 'pending', 'applied', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  appliedAt: timestamp("applied_at"),
});

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