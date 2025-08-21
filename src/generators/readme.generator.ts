import fs from 'fs-extra';
import path from 'path';

interface ReadmeOptions {
    baseDir: string;
    projectName?: string;
    hasSwagger?: boolean;
    hasSeeding?: boolean;
    hasEmailAuth?: boolean;
    hasOAuth?: boolean;
}

export const generateReadme = async ({ baseDir, projectName = 'Generated Node.js Backend', hasSwagger = false, hasSeeding = false, hasEmailAuth = false, hasOAuth = false }: ReadmeOptions) => {
    const content = `# 🌊 ${projectName}

This is a generated Node.js backend project built with TypeScript, Express, Prisma, and PostgreSQL. It includes basic routing setup, CORS configuration, and a ready-to-use structure for scalable backend development.

---

## 🧰 Tech Stack

- **Node.js** – Runtime environment  
- **Express** – Web server framework  
- **TypeScript** – Static typing and modern JavaScript tooling  
- **PostgreSQL** – Relational database  
- **Prisma** – Modern ORM for TypeScript and Node.js

---

## 🚀 Getting Started

### 1. Install dependencies

\`\`\`bash
npm install
\`\`\`

---

### 2. Set up PostgreSQL

Create a new PostgreSQL database using your preferred tool (e.g., pgAdmin, CLI, Supabase, etc.).

---

### 3. Configure \`.env\`

locate the \`.env\` file at the root of the project and add your PostgreSQL connection string:

\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
\`\`\`

#### 🔎 Example:
\`\`\`env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/mydb?schema=public"
\`\`\`

---

### 4. Push Prisma schema to the database

Once your \`.env\` file is set up, initialize your database with Prisma:

\`\`\`bash
npx prisma db push
\`\`\`

> This updates your database to match the Prisma schema (without using migrations).

---

## 🛠 Project Structure

\`\`\`bash
prisma/
├── schema.prisma         # Prisma schema definition

src/
├── controllers/          # Logic for handling requests
├── lib/                  # Shared utilities
├── routes/               # Express route definitions
├── services/             # Business logic and DB operations
├── types/                # Shared type definitions
├── app.ts                # Express app setup
├── server.ts             # Entry point for the app

.env                      # Environment configuration
package.json              # Project metadata and scripts
tsconfig.json             # TypeScript configuration

\`\`\`

Your routes will be automatically registered and prefixed with \`/api/<name>\`.

---

## 🧪 Running the App

You can start the development server using:

\`\`\`bash
npm run dev
\`\`\`

> Or compile to JavaScript and run with \`node\` if you prefer a production-ready build.

---

## ✅ Example API Usage

\`\`\`http
GET http://localhost:3000/
\`\`\`

Response:
\`\`\`
Home page
\`\`\`

All generated routes are accessible under \`/api/<resource>\`.

---
${hasSwagger ? `
## 📚 API Documentation

This project includes interactive API documentation powered by Swagger UI.

### Swagger UI Interface
- **URL**: \`http://localhost:3000/api-docs\`
- **Features**: 
  - Interactive API testing
  - Request/response schemas
  - Endpoint documentation

### OpenAPI Specification
- **URL**: \`http://localhost:3000/api-docs.json\`
- **Format**: OpenAPI 3.0.3 JSON specification

### Usage Example:
\`\`\`bash
# Start the server
npm run dev

# Open browser and navigate to:
# http://localhost:3000/api-docs
\`\`\`

---
` : ''}${hasSeeding ? `
## 🌱 Test Data Seeding

This project includes intelligent test data generation using Faker.js.

### Available Commands:

\`\`\`bash
# Generate test data (preserves existing data)
npm run seed

# Reset database and generate fresh data
npm run seed:reset

# Advanced seeding options
node seed-script.js --help
\`\`\`

### Environment Variables:
\`\`\`env
SEED_COUNT=50          # Number of records per entity
SEED_LOCALE=en         # Faker locale for generated data
\`\`\`

### Generated Files:
- \`prisma/seed.ts\` - Main seeding script
- \`prisma/seeders/\` - Individual entity seeders
- \`seed-script.js\` - Advanced seeding utilities

---
` : ''}${hasEmailAuth ? `
## 🔐 Email Authentication

This project includes a complete email authentication system with verification and password reset functionality.

### Authentication Endpoints:

\`\`\`http
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
POST /api/auth/refresh      # Refresh access token
POST /api/auth/verify-email # Email verification
POST /api/auth/forgot-password    # Request password reset
POST /api/auth/reset-password     # Complete password reset
\`\`\`

### Environment Variables:
\`\`\`env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (choose one provider)
# Nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# Resend
RESEND_API_KEY=your-resend-api-key

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
\`\`\`

### Features:
- **User Registration** with email verification
- **Login/Logout** with JWT tokens
- **Password Reset** via email
- **Refresh Token** rotation
- **Rate Limiting** for security
- **Professional Email Templates**
- **Multiple Email Providers** support

### Usage Example:
\`\`\`bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"securepassword"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"securepassword"}'
\`\`\`

---
` : ''}${hasOAuth ? `
## 🔑 OAuth Authentication

This project includes OAuth authentication with support for multiple social providers.

### OAuth Endpoints:

\`\`\`http
GET /auth/google           # Initiate Google OAuth
GET /auth/google/callback  # Google OAuth callback
GET /auth/github           # Initiate GitHub OAuth  
GET /auth/github/callback  # GitHub OAuth callback
GET /auth/facebook         # Initiate Facebook OAuth
GET /auth/facebook/callback # Facebook OAuth callback
GET /auth/twitter          # Initiate Twitter OAuth
GET /auth/twitter/callback # Twitter OAuth callback
\`\`\`

### Environment Variables:

\`\`\`env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/github/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:8000/auth/facebook/callback

# Twitter OAuth
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:8000/auth/twitter/callback

# Frontend URL for OAuth redirects
CLIENT_URL=http://localhost:3000
\`\`\`

### Features:
- **Social Login** with Google, GitHub, Facebook, Twitter
- **Account Linking** for existing users
- **JWT Token Generation** after OAuth success
- **Automatic User Creation** for new OAuth users
- **Session Management** with Passport.js

### Setup Instructions:

1. **Create OAuth applications** with each provider:
   - Google: [Google Developers Console](https://console.developers.google.com)
   - GitHub: [GitHub Developer Settings](https://github.com/settings/developers)
   - Facebook: [Facebook Developers](https://developers.facebook.com)
   - Twitter: [Twitter Developer Portal](https://developer.twitter.com)

2. **Configure callback URLs** in your OAuth applications
3. **Add credentials** to your \`.env\` file
4. **Test OAuth flow** by visiting the auth endpoints

### Usage Example:
\`\`\`bash
# Initiate Google OAuth (redirect to Google)
curl http://localhost:3000/auth/google

# After successful auth, user will be redirected to:
# http://localhost:3000/auth/success?token=<jwt_access_token>
\`\`\`

---
` : ''}
## 📦 Notes

- This code was generated automatically for quick scaffolding.
- You can add additional models to your Prisma schema (\`prisma/schema.prisma\`) and re-run \`npx prisma db push\`.
${hasSeeding ? '- Test data seeding helps you quickly populate your database with realistic sample data.' : ''}
${hasSwagger ? '- API documentation is automatically updated when you modify your endpoints.' : ''}
${hasEmailAuth ? '- Email authentication provides secure user management with verification and password reset flows.' : ''}
${hasOAuth ? '- OAuth authentication enables seamless social login with Google, GitHub, Facebook, and Twitter.' : ''}

---

Enjoy building! 🚀
`;

    const filePath = path.join(baseDir, 'README.md');
    await fs.writeFile(filePath, content);
    console.log(`✅ README.md generated at ${filePath}`);
};