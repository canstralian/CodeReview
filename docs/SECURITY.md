# Security Environment Variables

The following environment variables are used for production security configuration:

## Required Variables

- `SESSION_SECRET`: Cryptographic key for session encryption (already configured)
- `DATABASE_URL`: Database connection string (already configured)
- `REPLIT_DOMAINS`: Comma-separated list of domains for Replit authentication (already configured)

## Optional Security Variables

- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins for cross-origin requests
  - Default: `http://localhost:5173,http://localhost:5000` (development mode)
  - Production example: `https://yourdomain.com,https://api.yourdomain.com`

- `NODE_ENV`: Environment indicator for production-specific behavior
  - Default: `development`
  - Production value: `production`
  - Affects: Session cookie `secure` flag (HTTPS-only in production)

## Example Production Configuration

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com,https://api.yourapp.com
SESSION_SECRET=your-strong-random-secret-key
DATABASE_URL=your-database-connection-string
REPLIT_DOMAINS=yourapp.com,api.yourapp.com
```

## Security Features Added

1. **Helmet middleware** - Secure HTTP headers with Content Security Policy
2. **CORS protection** - Environment-based allowed origins with credentials support
3. **Hardened session cookies** - httpOnly, secure (production), sameSite=strict
4. **Input validation** - Zod validation for /api/login endpoint parameters
5. **Production-aware configuration** - Automatically adjusts settings based on NODE_ENV