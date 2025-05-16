import { db } from "../server/db";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

async function main() {
  try {
    console.log("Starting schema push...");
    
    // Create tables for our schema
    console.log("Creating database schema...");
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log("Created users table");
    
    // Create repositories table
    await db.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        owner TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        visibility TEXT,
        stars INTEGER,
        forks INTEGER,
        watchers INTEGER,
        issues INTEGER,
        pull_requests INTEGER,
        language TEXT,
        last_updated TIMESTAMP,
        code_quality INTEGER,
        test_coverage INTEGER,
        issues_count INTEGER,
        meta_data JSONB,
        file_structure JSONB
      );
    `);
    console.log("Created repositories table");
    
    // Create code_issues table
    await db.query(`
      CREATE TABLE IF NOT EXISTS code_issues (
        id SERIAL PRIMARY KEY,
        repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT DEFAULT 'codeQuality',
        message TEXT NOT NULL,
        code TEXT NOT NULL,
        suggestion TEXT
      );
    `);
    console.log("Created code_issues table");
    
    // Create repository_files table
    await db.query(`
      CREATE TABLE IF NOT EXISTS repository_files (
        id SERIAL PRIMARY KEY,
        repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        language TEXT
      );
    `);
    console.log("Created repository_files table");
    
    console.log("Schema push completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error pushing schema:", error);
    process.exit(1);
  }
}

main();