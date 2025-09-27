import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSQLite } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure for Neon if using PostgreSQL
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and configure accordingly
let db: any;
let pool: any;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, using in-memory SQLite for development");
  
  // Use in-memory SQLite for development/testing
  const client = createClient({
    url: ':memory:'
  });
  
  db = drizzleSQLite(client, { schema });
} else if (process.env.DATABASE_URL.startsWith('file:')) {
  // Use local SQLite file
  const client = createClient({
    url: process.env.DATABASE_URL
  });
  
  db = drizzleSQLite(client, { schema });
  console.log("Using SQLite database:", process.env.DATABASE_URL);
} else {
  // Use Neon PostgreSQL
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("Using Neon PostgreSQL database");
}

export { db, pool };