# Database Migrations

This folder contains database migration files for schema changes.

## Contents

Migration files are automatically generated and versioned by Drizzle ORM:

- `0000_initial.sql`: Initial database schema
- `0001_add_user_roles.sql`: Add user roles table
- `0002_*.sql`: Subsequent migrations

## Migration Management

### Generating Migrations

Generate migrations based on schema changes:

```bash
npm run db:generate
```

This creates a new migration file in this directory based on changes in `shared/schema.ts`.

### Running Migrations

Apply pending migrations to the database:

```bash
npm run db:migrate
```

### Rolling Back Migrations

Drizzle ORM doesn't support automatic rollbacks. For rollback, create a new migration that reverses the changes.

## Migration Files

Each migration file contains SQL statements:

```sql
-- 0001_add_user_roles.sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

## Best Practices

- Always test migrations on a development database first
- Keep migrations small and focused
- Use descriptive migration names
- Never modify existing migration files
- Back up production database before running migrations
- Document breaking changes in migration comments

## Schema Definition

The source of truth for the database schema is in `shared/schema.ts`:

```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```
