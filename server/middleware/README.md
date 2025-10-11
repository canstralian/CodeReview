# Middleware

This folder contains Express middleware functions for the API Gateway.

## Contents

- **logging.ts**: Request/response logging middleware
- **rateLimit.ts**: Rate limiting middleware to prevent API abuse
- **auth.ts**: Authentication and authorization middleware
- **errorHandler.ts**: Centralized error handling middleware
- **validation.ts**: Request validation middleware
- **cors.ts**: CORS configuration middleware

## Usage

Middleware functions are registered in the main Express application and applied to routes as needed:

```typescript
import { loggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rateLimit';

app.use(loggingMiddleware);
app.use('/api', rateLimitMiddleware);
```

## Best Practices

- Keep middleware functions focused on a single responsibility
- Use middleware composition for complex scenarios
- Always call `next()` unless sending a response
- Handle errors appropriately and pass them to the error handler
