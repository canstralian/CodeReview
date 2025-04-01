# API Documentation

This document describes the API endpoints available in the CodeReview AI application.

## Base URL

All API endpoints are relative to: `/api`

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Endpoints

### Repository Analysis

#### Get Repository Information

Retrieves information about a GitHub repository and analyzes its code for issues.

```
GET /api/repository
```

**Query Parameters:**

| Parameter | Type   | Required | Description                             |
|-----------|--------|----------|-----------------------------------------|
| url       | string | Yes      | GitHub repository URL                   |

**Response:**

```json
{
  "repository": {
    "id": 1,
    "fullName": "owner/repo",
    "name": "repo",
    "owner": "owner",
    "description": "Repository description",
    "url": "https://github.com/owner/repo",
    "visibility": "public",
    "stars": 100,
    "forks": 20,
    "watchers": 15,
    "issues": 5,
    "pullRequests": 2,
    "language": "JavaScript",
    "lastUpdated": "2023-04-01T12:00:00Z",
    "codeQuality": 85,
    "testCoverage": 70,
    "issuesCount": 12
  },
  "files": [
    {
      "id": 1,
      "repositoryId": 1,
      "filePath": "src/index.js",
      "type": "file",
      "content": null,
      "language": "JavaScript"
    }
  ],
  "issues": [
    {
      "id": 1,
      "repositoryId": 1,
      "filePath": "src/index.js",
      "lineNumber": 25,
      "issueType": "bug",
      "severity": "high",
      "category": "security",
      "message": "Possible security vulnerability: Unsanitized user input",
      "code": "const result = eval(userInput);",
      "suggestion": "// Use a safer approach\nconst result = JSON.parse(userInput);\n// Or validate input with a schema validator"
    }
  ]
}
```

#### Get File with Issues

Retrieves a specific file from a repository along with its associated issues.

```
GET /api/file
```

**Query Parameters:**

| Parameter | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| repo      | string | Yes      | Repository full name (owner/repo) |
| path      | string | Yes      | File path relative to repository root |

**Response:**

```json
{
  "file": {
    "id": 1,
    "repositoryId": 1,
    "filePath": "src/index.js",
    "type": "file",
    "content": "// File content goes here",
    "language": "JavaScript"
  },
  "issues": [
    {
      "id": 1,
      "repositoryId": 1,
      "filePath": "src/index.js",
      "lineNumber": 25,
      "issueType": "bug",
      "severity": "high",
      "category": "security",
      "message": "Possible security vulnerability: Unsanitized user input",
      "code": "const result = eval(userInput);",
      "suggestion": "// Use a safer approach\nconst result = JSON.parse(userInput);\n// Or validate input with a schema validator"
    }
  ]
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful
- `400 Bad Request`: The request was invalid
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

Error responses will include a JSON object with a `message` field describing the error:

```json
{
  "message": "Repository URL is required"
}
```

## Rate Limiting

The API currently does not implement rate limiting but may do so in the future to ensure fair usage.