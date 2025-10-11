# Models

This folder contains data models and business logic.

## Contents

- **User.ts**: User model and related logic
- **Repository.ts**: Repository model
- **CodeIssue.ts**: Code issue model
- **AnalysisResult.ts**: Analysis result model
- **base/**: Base model classes and interfaces

## Model Structure

Models encapsulate business logic and data access:

```typescript
export class Repository {
  constructor(
    public id: number,
    public name: string,
    public owner: string,
    public url: string
  ) {}

  async getIssues(): Promise<CodeIssue[]> {
    // Business logic
  }

  async analyze(): Promise<AnalysisResult> {
    // Business logic
  }
}
```

## Usage

```typescript
import { Repository } from './models/Repository';

const repo = await Repository.findById(123);
const issues = await repo.getIssues();
```

## Best Practices

- Keep models focused on domain logic
- Use TypeScript interfaces for type safety
- Separate data access from business logic
- Use repository pattern for data access
- Validate data in model constructors
