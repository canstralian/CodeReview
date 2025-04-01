# Contributing to CodeReview AI

Thank you for considering contributing to CodeReview AI! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to foster an inclusive and respectful community.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/codereview-ai.git
   cd codereview-ai
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the required environment variables (see example in `.env.example`)

5. Set up the database:
   ```bash
   npm run db:push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
.
├── client/              # Frontend React application
│   ├── src/             # Source files
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
├── server/              # Backend Express server
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data storage interface
│   └── db.ts            # Database connection
├── shared/              # Shared code between client and server
│   └── schema.ts        # Database schema and types
```

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- Feature branches: `feature/your-feature-name`
- Bug fixes: `fix/issue-description`

### Pull Request Process

1. Create a new branch from `develop` for your changes
2. Make your changes and commit them with clear, descriptive messages
3. Push your branch to your fork
4. Submit a pull request to the `develop` branch of the main repository
5. Ensure your PR description clearly describes the changes and references any related issues

### Commit Message Guidelines

Follow the conventional commit format for your commit messages:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that don't affect the code's meaning
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(issues): add category filtering to issues list

- Add tabs for filtering issues by category
- Update issue card display to show category badge
- Add count of issues by type in the header

Closes #42
```

## Code Style and Standards

### TypeScript

- Use TypeScript for all new code
- Ensure proper type definitions
- Avoid using `any` type when possible

### React Components

- Use functional components with hooks
- Follow the component structure in the existing codebase
- Use the provided UI components from the Shadcn library when possible

### Testing

- Write tests for new features and bug fixes
- Run tests before submitting a PR:
  ```bash
  npm test
  ```

### Code Formatting and Linting

- The project uses ESLint and Prettier for code formatting
- Ensure your code passes linting before submitting a PR:
  ```bash
  npm run lint
  ```
- Fix formatting issues automatically:
  ```bash
  npm run format
  ```

## Adding New Features

### Frontend Components

1. Create new components in the appropriate directory under `client/src/components`
2. Follow the existing pattern for component structure
3. Use the provided UI components from Shadcn UI library
4. Update types as necessary in `client/src/types`

### Backend API Endpoints

1. Add new endpoints in `server/routes.ts`
2. Follow RESTful design principles
3. Use the storage interface for data operations
4. Document new endpoints in the API documentation

### Database Schema Changes

1. Update the schema in `shared/schema.ts`
2. Create or update the corresponding TypeScript types
3. Run migrations using the Drizzle ORM tools:
   ```bash
   npm run db:push
   ```

## Issue Reporting

When reporting issues, please use the provided issue templates and include:

1. A clear, descriptive title
2. Detailed steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots or code snippets if applicable
6. Your environment information

## Documentation

- Update documentation for any changes to the API, database schema, or user-facing features
- Keep the README.md and other documentation up to date
- Document new features thoroughly

## Questions and Discussions

Use the GitHub Discussions feature for questions or discussions about the project.

Thank you for contributing to CodeReview AI!