# Database Seeds

This folder contains seed data for populating the database with initial or test data.

## Contents

- **dev.ts**: Development seed data
- **test.ts**: Test seed data
- **production.ts**: Production seed data (if needed)

## Seed Scripts

Seeds are TypeScript files that populate the database:

```typescript
// dev.ts
import { db } from '../server/db';
import { users, repositories } from '../shared/schema';

export async function seed() {
  // Create test users
  await db.insert(users).values([
    { username: 'testuser1', email: 'test1@example.com' },
    { username: 'testuser2', email: 'test2@example.com' }
  ]);

  // Create test repositories
  await db.insert(repositories).values([
    { name: 'test-repo', owner: 'testuser1', url: 'https://github.com/testuser1/test-repo' }
  ]);
}
```

## Running Seeds

### Development Seeds

```bash
npm run db:seed:dev
```

### Test Seeds

```bash
npm run db:seed:test
```

## Best Practices

- Keep seeds idempotent (can be run multiple times safely)
- Use transactions for atomicity
- Separate concerns (users, repos, issues, etc.)
- Use realistic test data
- Don't seed sensitive data in version control
- Document seed data structure and purpose

## Seed Data Guidelines

- **Development**: Comprehensive test data for all features
- **Test**: Minimal data needed for tests to pass
- **Production**: Only essential bootstrap data (e.g., default roles, system users)

## Example Seed Structure

```typescript
import { db } from '../server/db';
import { users, repositories, codeIssues } from '../shared/schema';

export async function seedUsers() {
  const userIds = await db.insert(users).values([...]).returning({ id: users.id });
  return userIds;
}

export async function seedRepositories(userIds: number[]) {
  return await db.insert(repositories).values([...]).returning({ id: repositories.id });
}

export async function seedAll() {
  const userIds = await seedUsers();
  const repoIds = await seedRepositories(userIds.map(u => u.id));
  // Continue seeding related data
}
```
