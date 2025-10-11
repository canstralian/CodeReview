import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from 'drizzle-orm';

// Configure for Neon if using PostgreSQL
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and configure accordingly
let db: any;
let pool: any;

async function initSQLiteTables(database: any) {
  // Create tables for SQLite in-memory mode
  try {
    // Create users table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create sessions table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess TEXT NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    
    // Create repositories table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        meta_data TEXT,
        file_structure TEXT
      )
    `);
    
    // Create code_issues table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS code_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT DEFAULT 'codeQuality',
        message TEXT NOT NULL,
        code TEXT NOT NULL,
        suggestion TEXT,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      )
    `);
    
    // Create repository_files table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS repository_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        language TEXT,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      )
    `);
    
    // Create agent_sessions table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR,
        session_token VARCHAR NOT NULL UNIQUE,
        repository_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      )
    `);
    
    // Create agent_interactions table
    await database.run(sql`
      CREATE TABLE IF NOT EXISTS agent_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        interaction_type TEXT NOT NULL,
        request TEXT NOT NULL,
        response TEXT NOT NULL,
        metadata TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await database.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)`);
    await database.run(sql`CREATE INDEX IF NOT EXISTS idx_agent_sessions_token ON agent_sessions(session_token)`);
    await database.run(sql`CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id)`);
    await database.run(sql`CREATE INDEX IF NOT EXISTS idx_agent_interactions_session ON agent_interactions(session_id)`);
    
    console.log("SQLite tables initialized successfully");
  } catch (error) {
    console.error("Error initializing SQLite tables:", error);
  }
}

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, using in-memory SQLite for development");
  
  // Use in-memory SQLite for development/testing
  const client = createClient({
    url: ':memory:'
  });
  
  db = drizzleSQLite(client, { schema });
  
  // Initialize tables for in-memory SQLite
  initSQLiteTables(db).catch(console.error);
} else if (process.env.DATABASE_URL.startsWith('file:')) {
  // Use local SQLite file
  const client = createClient({
    url: process.env.DATABASE_URL
  });
  
  db = drizzleSQLite(client, { schema });
  console.log("Using SQLite database:", process.env.DATABASE_URL);
  
  // Initialize tables for file-based SQLite
  initSQLiteTables(db).catch(console.error);
} else {
  // Use Neon PostgreSQL
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("Using Neon PostgreSQL database");
}

export { db, pool };