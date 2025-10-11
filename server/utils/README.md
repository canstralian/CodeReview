# Utilities

This folder contains shared utility functions and helpers.

## Contents

- **validation.ts**: Data validation utilities
- **formatting.ts**: Data formatting functions
- **crypto.ts**: Cryptographic utilities
- **dateTime.ts**: Date and time utilities
- **string.ts**: String manipulation utilities
- **array.ts**: Array utilities
- **errors.ts**: Custom error classes

## Usage

```typescript
import { validateEmail, validateUrl } from './utils/validation';
import { formatDate, formatDuration } from './utils/formatting';
import { hashPassword, comparePassword } from './utils/crypto';

const isValid = validateEmail('user@example.com');
const formatted = formatDate(new Date());
const hash = await hashPassword('secret');
```

## Best Practices

- Keep utilities pure and stateless when possible
- Write comprehensive unit tests for utilities
- Document function parameters and return types
- Export functions individually for tree-shaking
- Group related utilities in separate files
