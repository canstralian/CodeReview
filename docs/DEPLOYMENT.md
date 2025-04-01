# Deployment Guide

This document provides instructions for deploying the CodeReview AI application to various environments.

## Prerequisites

Before deploying, ensure you have:

1. Node.js 18+ installed
2. A PostgreSQL database instance
3. Access to the environment where you want to deploy (server, cloud platform)

## Environment Variables

The following environment variables need to be set in your deployment environment:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
PORT=5000 (optional, defaults to 5000)
NODE_ENV=production
```

## Build Process

To build the application for production:

```bash
# Install dependencies
npm install

# Build the frontend
npm run build

# Start the production server
npm start
```

## Deployment Options

### Deploying to Replit

1. Create a new Repl or fork the repository to your Replit account
2. Add the `DATABASE_URL` secret in the Replit Secrets tab
3. Run the following command in the Shell:
   ```bash
   npm run db:push && npm run build && npm start
   ```
4. The application will be available at your Replit URL

### Deploying to Vercel

1. Connect your GitHub repository to Vercel
2. Add the `DATABASE_URL` as an environment variable in the Vercel project settings
3. Configure the build settings:
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`
4. Deploy the application

### Deploying to Heroku

1. Create a new Heroku application
2. Add the PostgreSQL add-on or configure the `DATABASE_URL` environment variable
3. Connect your GitHub repository or use the Heroku CLI
4. Set the Node.js buildpack
5. Deploy using one of these methods:
   ```bash
   # Using Heroku Git
   git push heroku main
   
   # Using Heroku CLI
   heroku create
   git push heroku main
   ```

### Manual Deployment to a VPS or Dedicated Server

1. SSH into your server
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/codereview-ai.git
   cd codereview-ai
   ```
3. Set up environment variables
4. Install dependencies and build the app:
   ```bash
   npm install
   npm run build
   ```
5. Use a process manager like PM2 to keep the application running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "codereview-ai" -- start
   pm2 save
   ```
6. Set up a reverse proxy using Nginx or Apache to forward requests to the Node.js application

## Database Migration

When deploying updates that include database schema changes:

1. Back up your database (recommended)
2. Run the database migration:
   ```bash
   npm run db:push
   ```

## CI/CD Integration

The repository includes GitHub Actions workflows for continuous integration and deployment. See the `.github/workflows` directory for details.

## Troubleshooting

If you encounter deployment issues:

1. Check that all environment variables are correctly set
2. Verify database connectivity
3. Check server logs for any error messages
4. Ensure the build process completed successfully
5. Check that the port is not being used by another application

## Support

For deployment issues, please open an issue in the GitHub repository or contact the maintainers.