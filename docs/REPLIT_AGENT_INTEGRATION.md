# Replit Agent Infrastructure Integration

This document describes the Replit Agent infrastructure integration in the CodeReview application, which enables advanced AI-powered code analysis, deeper reasoning, and extended work sessions.

## Overview

The Replit Agent infrastructure provides:
- **Automated Code Reviews**: AI-powered analysis of code snippets with detailed feedback
- **Deeper Reasoning**: Context-aware explanations and recommendations for code improvements
- **Extended Work Sessions**: Session management for iterative, multi-step interactions
- **Security**: Input validation, rate limiting, and secure session management

## Architecture

### Backend Components

#### 1. Database Schema (`shared/schema.ts`)

**Agent Sessions Table**:
- Stores active agent sessions with user context
- Tracks session status (active, completed, expired)
- Maintains session context and history
- Auto-expires after 24 hours

**Agent Interactions Table**:
- Records all interactions within a session
- Stores requests, responses, and metadata
- Tracks interaction status and timestamps
- Enables session history retrieval

#### 2. Service Layer (`server/services/replitAgent.ts`)

**ReplitAgentService** provides:

- `createSession(userId, repositoryId)`: Creates a new agent session
- `processRequest(sessionToken, request)`: Processes agent requests with context awareness
- `getSessionHistory(sessionToken)`: Retrieves session interaction history
- `closeSession(sessionToken)`: Closes an active session

**Supported Actions**:
- `analyze`: Comprehensive code quality analysis
- `query`: Answer questions about code
- `refactor`: Suggest code refactoring improvements
- `security_scan`: Identify security vulnerabilities

### API Endpoints

#### Create Session
```http
POST /api/agent/session
Content-Type: application/json

{
  "repositoryId": 123  // optional
}
```

**Response**:
```json
{
  "sessionToken": "abc123...",
  "message": "Agent session created successfully",
  "expiresIn": "24 hours"
}
```

#### Process Request
```http
POST /api/agent/process
Content-Type: application/json

{
  "sessionToken": "abc123...",
  "action": "analyze",  // or "query", "refactor", "security_scan"
  "code": "function example() { return 'hello'; }",
  "filePath": "src/example.js",  // optional
  "language": "javascript",  // optional
  "query": "How can I improve this code?"  // for 'query' action
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "analysis": {
      "quality_score": 85,
      "summary": "Code is well-structured..."
    },
    "suggestions": [
      {
        "type": "refactor",
        "severity": "low",
        "line": 1,
        "message": "Add JSDoc documentation",
        "suggestion": "Functions should be documented..."
      }
    ],
    "confidence": 0.85
  },
  "sessionToken": "abc123..."
}
```

#### Get Session History
```http
GET /api/agent/session/{sessionToken}/history
```

**Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "sessionToken": "abc123...",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "interactions": [
      {
        "id": 1,
        "interactionType": "analyze",
        "request": {...},
        "response": {...},
        "createdAt": "2024-01-01T00:01:00.000Z"
      }
    ]
  }
}
```

#### Close Session
```http
POST /api/agent/session/{sessionToken}/close
```

**Response**:
```json
{
  "success": true,
  "message": "Session closed successfully"
}
```

### Frontend Component

#### ReplitAgent Component (`client/src/components/ReplitAgent.tsx`)

**Features**:
- Interactive chat-like interface
- Action selector (analyze, query, refactor, security_scan)
- Real-time message display
- Automatic session management
- Error handling and loading states

**Usage**:
```tsx
import ReplitAgent from "./components/ReplitAgent";

<ReplitAgent 
  code={codeString}
  filePath="src/example.js"
  language="javascript"
  repositoryId={123}
/>
```

## Security Features

### 1. Input Validation

All user inputs are validated:
- Session tokens are required and validated
- Code size limited to 100KB
- Action types are whitelisted
- All string inputs are sanitized

### 2. Rate Limiting

Rate limiting middleware protects agent endpoints:
- 30 requests per minute per IP address
- Returns 429 status when limit exceeded
- Automatic reset every 60 seconds

### 3. Session Management

Sessions are secure and time-limited:
- 24-hour session expiration
- Automatic cleanup of expired sessions
- Session tokens are cryptographically random (nanoid)
- Sessions tied to user authentication

### 4. Authentication

Agent endpoints integrate with existing Replit Auth:
- User ID extracted from session
- Anonymous users supported with limited features
- Session context isolated per user

### 5. Logging

All interactions are logged for auditability:
- Request/response pairs stored in database
- Metadata includes timestamps and status
- Error tracking with detailed messages

## Setup Instructions

### 1. Install Dependencies

Already included in `package.json`:
```json
{
  "@anthropic-ai/sdk": "^0.64.0",
  "nanoid": "^5.1.6"
}
```

### 2. Environment Variables

Add to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
```

### 3. Database Migration

Run the migration script:
```bash
npx tsx scripts/migrate-agent-tables.ts
```

### 4. Start Application

```bash
npm run dev
```

## Usage Examples

### Example 1: Code Analysis

1. Navigate to a repository in the application
2. Select a file to view
3. The Replit Agent component appears below the code viewer
4. Click "Start AI Session" to create a session
5. Select "analyze" action
6. The agent automatically analyzes the displayed code
7. Review suggestions and recommendations

### Example 2: Ask Questions

1. Start an agent session
2. Select "query" action
3. Type your question: "What does this function do?"
4. Press Send or hit Enter
5. Receive detailed explanation from the agent

### Example 3: Security Scan

1. Start an agent session
2. Select "security_scan" action
3. The agent scans the code for vulnerabilities
4. Review identified security issues and remediation steps

### Example 4: Refactoring Suggestions

1. Start an agent session
2. Select "refactor" action
3. The agent suggests code improvements
4. Review refactoring recommendations with examples

## Best Practices

### For Developers

1. **Always close sessions**: Sessions expire after 24 hours, but manually closing them frees resources
2. **Validate inputs**: Use the built-in validation for all user inputs
3. **Handle errors**: Implement proper error handling and user feedback
4. **Monitor rate limits**: Design UI to prevent hitting rate limits
5. **Test thoroughly**: Test all action types and edge cases

### For Users

1. **Start sessions when needed**: Sessions consume resources
2. **Be specific in queries**: More specific questions get better answers
3. **Review suggestions carefully**: AI suggestions should be reviewed before applying
4. **Use appropriate actions**: Choose the right action type for your needs
5. **Close sessions when done**: Help maintain system performance

## Troubleshooting

### Session expired errors
- Sessions expire after 24 hours
- Create a new session to continue

### Rate limit exceeded
- Wait 60 seconds before making more requests
- Reduce request frequency in automated tools

### Invalid session token
- Ensure you're using the correct session token
- Create a new session if token is lost

### API authentication failed
- Check ANTHROPIC_API_KEY is set correctly
- Ensure API key has proper permissions

## Performance Considerations

1. **Session Context**: Limited to last 10 interactions to manage memory
2. **Code Size Limit**: 100KB maximum per request
3. **Rate Limiting**: 30 requests/minute prevents abuse
4. **Database Indexing**: Optimized queries with proper indexes
5. **Session Cleanup**: Automatic expiration prevents database bloat

## Future Enhancements

- [ ] Support for multi-file analysis
- [ ] Integration with Git for automatic PR reviews
- [ ] Custom agent prompts and personas
- [ ] Collaborative sessions for teams
- [ ] Agent learning from user feedback
- [ ] Export session history as reports
- [ ] Integration with CI/CD pipelines
- [ ] Real-time code suggestions while typing

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint responses
3. Check application logs
4. Open an issue on GitHub
