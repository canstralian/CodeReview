import pkg from 'pg';
const { Client } = pkg;
import * as schema from "../shared/schema";

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    console.log("Starting schema push...");
    
    // Use the standard pg client instead of Neon's WebSocket client
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();
    console.log("Connected to PostgreSQL database");
    
    console.log("Creating database schema...");
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log("Created users table");
    
    // Create repositories table
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    
    // Create agent_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR NOT NULL UNIQUE,
        repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        context JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);
    console.log("Created agent_sessions table");
    
    // Create agent_interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_interactions (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
        interaction_type TEXT NOT NULL,
        request JSONB NOT NULL,
        response JSONB NOT NULL,
        metadata JSONB,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Created agent_interactions table");
    
    // Create indexes for agent tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_token 
      ON agent_sessions(session_token);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_user 
      ON agent_sessions(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_interactions_session 
      ON agent_interactions(session_id);
    `);
    console.log("Created indexes for agent tables");
    
    console.log("Schema push completed successfully!");
    await client.end();
  } catch (error) {
    console.error("Error pushing schema:", error);
    process.exit(1);
  }
}