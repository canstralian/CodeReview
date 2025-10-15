import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    console.log("Starting agent tables migration...");
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();
    console.log("Connected to PostgreSQL database");
    
    console.log("Creating agent_sessions table...");
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
    
    console.log("Creating agent_interactions table...");
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
    
    console.log("Creating indexes...");
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
    console.log("Created indexes");
    
    console.log("Agent tables migration completed successfully!");
    await client.end();
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

main();
