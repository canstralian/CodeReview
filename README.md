# CodeReview AI

A Google-inspired web-based code review and debugging tool for GitHub repositories with a minimalist interface.

## Features

- **Simple, Clean Interface**: A Google-inspired minimalist design with a central search bar
- **Repository Analysis**: Scan GitHub repositories for code issues and potential bugs
- **Multi-Category Issue Detection**: Identifies issues across security, performance, code quality, and accessibility
- **Code Fixing Suggestions**: Provides actionable recommendations to fix identified issues
- **File Explorer**: Browse repository files with an intuitive tree structure
- **Categorized Issues View**: Filter issues by type and severity

## Technologies

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **API Integration**: GitHub API for repository data

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/codereview-ai.git
   cd codereview-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/codereview
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Enter a GitHub repository URL in the search bar
2. Click on "Review Code" to analyze the repository for issues
3. Browse the file explorer to view specific files
4. Click on issues to see suggestions on how to fix them
5. Apply fixes directly with the "Apply Fix" button

## Deployment

This project is set up for easy deployment on platforms that support Node.js applications:

### Deploying to Replit

1. Fork this repository to your Replit account
2. Add the following secrets to your Replit project:
   - `DATABASE_URL`: Your PostgreSQL connection string
3. Run the following command to build and start the application:
   ```bash
   npm run build && npm start
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
├── docs/                # Documentation
└── .github/             # GitHub workflows and templates
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google's minimalist design for inspiration
- [Shadcn UI](https://ui.shadcn.com/) for React components
- [Drizzle ORM](https://orm.drizzle.team/) for database management
