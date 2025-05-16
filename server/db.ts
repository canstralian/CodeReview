import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple wrapper for executing SQL queries
export const db = {
  async query(text: string, params?: any[]) {
    return pool.query(text, params);
  },
  async getClient() {
    const client = await pool.connect();
    return client;
  }
};
