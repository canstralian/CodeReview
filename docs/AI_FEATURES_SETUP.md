# AI-Powered Code Suggestions and Team Dashboard Setup

This document provides setup instructions for the AI-powered code suggestions and team dashboard features.

## Features Overview

### 1. AI-Powered Code Suggestions
- Integrates with Anthropic's Claude AI for intelligent code analysis
- Provides suggestions for security, performance, refactoring, and bug fixes
- Supports multiple programming languages
- Returns confidence scores and detailed reasoning for each suggestion

### 2. Team Dashboard
- Fetches repository metrics using GitHub's GraphQL API
- Displays stars, forks, watchers, open issues, open PRs, and security alerts
- Shows language distribution and recent activity
- Supports monitoring multiple repositories simultaneously

## Setup Instructions

### 1. Environment Variables

Copy the `.env.example` file to `.env` and configure the following variables:

```bash
cp .env.example .env
```

#### Required Environment Variables:

- **ANTHROPIC_API_KEY**: Your Anthropic Claude API key
  - Get it from: https://console.anthropic.com/
  - Required for AI-powered code suggestions

- **GITHUB_TOKEN**: Your GitHub personal access token
  - Generate from: https://github.com/settings/tokens
  - Required scopes: `repo`, `read:org`, `read:user`
  - Required for team dashboard functionality

#### Optional Environment Variables:

- **DATABASE_URL**: Your database connection string (if using external database)
- **ALLOWED_ORIGINS**: Comma-separated list of allowed origins for CORS

### 2. Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env` file

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` with API proxying to `http://localhost:5000`.

### 3. API Endpoints

#### POST /api/analyze-code
Analyzes code using Claude AI and returns suggestions.

**Request:**
```json
{
  "code": "function example() { return 'hello'; }",
  "language": "javascript",
  "repository": "owner/repo",
  "filePath": "src/example.js"
}
```

**Response:**
```json
{
  "repository": "owner/repo",
  "filePath": "src/example.js",
  "language": "javascript",
  "suggestions": [
    {
      "id": 1,
      "suggestion": "Add JSDoc documentation",
      "confidence": 0.8,
      "suggestedFix": "/**\n * Example function\n * @returns {string}\n */\nfunction example() { return 'hello'; }",
      "reasoning": "Functions should be documented for better maintainability",
      "category": "refactor"
    }
  ],
  "totalSuggestions": 1,
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "source": "claude-ai"
}
```

#### POST /api/team-dashboard
Fetches repository metrics from GitHub.

**Request:**
```json
{
  "repositories": ["facebook/react", "microsoft/vscode"]
}
```

**Response:**
```json
{
  "summary": {
    "totalRepositories": 2,
    "successfulFetches": 2,
    "totalStars": 250000,
    "totalForks": 50000,
    "totalOpenIssues": 1000,
    "totalOpenPRs": 100,
    "totalVulnerabilities": 5,
    "avgStarsPerRepo": 125000
  },
  "repositories": [...],
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "source": "github-graphql"
}
```

### 4. Frontend Components

#### AISuggestions Component
Located at `client/src/components/AISuggestions.tsx`
- Provides interface for code input and suggestion display
- Integrates with the `/api/analyze-code` endpoint
- Displays suggestions with confidence scores and fixes

#### TeamDashboard Component  
Located at `client/src/components/TeamDashboard.tsx`
- Provides interface for repository monitoring
- Integrates with the `/api/team-dashboard` endpoint
- Displays metrics, activity, and language distribution

### 5. Deployment

#### Replit Deployment
1. Import the repository to Replit
2. Set environment variables in the Replit Secrets panel
3. Run the application

#### Heroku Deployment
1. Create a Heroku app: `heroku create your-app-name`
2. Set environment variables: `heroku config:set ANTHROPIC_API_KEY=your_key`
3. Deploy: `git push heroku main`

#### Netlify Deployment
1. Connect your repository to Netlify
2. Set environment variables in Netlify's dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/public`

### 6. Security Considerations

- Environment variables are used for all sensitive data
- API keys are never exposed to the client-side code  
- Input validation is performed on all endpoints
- CORS is properly configured for production
- Rate limiting is handled gracefully with proper error messages

### 7. Error Handling

The application handles various error scenarios:
- Missing API keys (falls back to basic analysis)
- Network connectivity issues
- Rate limiting from external APIs
- Invalid input validation
- GitHub repository access permissions

### 8. Usage Examples

#### Using AI Code Suggestions
1. Navigate to a code file in the application
2. The AISuggestions component will automatically analyze the code
3. Review suggestions with confidence scores
4. Apply or dismiss suggestions as needed

#### Using Team Dashboard
1. Navigate to the team dashboard section
2. Enter repository names in "owner/repo" format
3. Click "Fetch Dashboard Data"
4. Review metrics across all repositories
5. Use tabs to view different types of information

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure ANTHROPIC_API_KEY is set correctly
   - Check that the API key has sufficient credits

2. **GitHub Token Issues**  
   - Ensure GITHUB_TOKEN has required scopes
   - Check that token hasn't expired

3. **Rate Limiting**
   - Wait for rate limits to reset
   - Consider using multiple tokens for high-volume usage

4. **CORS Issues**
   - Update ALLOWED_ORIGINS environment variable
   - Ensure frontend and backend URLs match

### Support

For issues and questions:
1. Check the application logs for detailed error messages
2. Verify environment variable configuration
3. Test API endpoints directly using curl or Postman
4. Review the GitHub repository for updates and known issues