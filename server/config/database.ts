/**
 * Database Configuration
 * 
 * PostgreSQL connection settings and Drizzle ORM configuration
 */

import { config } from 'dotenv';
config();

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  ssl: boolean;
  connectionTimeout: number;
  idleTimeout: number;
}

export const databaseConfig: DatabaseConfig = {
  // Database connection URL
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/codereview',
  
  // Connection pool size
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  
  // Enable SSL for production
  ssl: process.env.NODE_ENV === 'production',
  
  // Connection timeout in milliseconds
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  
  // Idle timeout in milliseconds
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
};

// Validate configuration
if (!databaseConfig.url) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default databaseConfig;
