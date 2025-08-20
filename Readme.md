# 🌊 VIBES

**VIBES** is a code generator that scaffolds a full-featured backend application using Node.js, TypeScript, Express, Prisma, and PostgreSQL.

It gives you a clean, modular, and production-friendly codebase instantly — so you can focus on building features instead of boilerplate.

---

## 🧰 Tech Stack

- **Node.js** – Runtime environment  
- **Express** – Web framework for routing and middleware  
- **TypeScript** – Static typing and tooling  
- **PostgreSQL** – Relational database  
- **Prisma** – ORM for type-safe database access

---

## 🧠 What VIBES Does

The **VIBES Code Generator** automatically creates a ready-to-run backend application by:

- ✅ Creating a modular folder structure (controllers, routes, services, types, etc.)
- ✅ Generating REST API endpoints based on your input
- ✅ Wiring up route registration and middleware automatically
- ✅ Generating the Prisma schema and configuration
- ✅ Setting up CORS, body parsing, and environment config
- ✅ Preparing a `.env` template for PostgreSQL connection
- ✅ **NEW**: Interactive Swagger/OpenAPI documentation
- ✅ **NEW**: Intelligent test data seeding with Faker.js
- ✅ **NEW**: Configurable project features and templates
- ✅ Zipping the project and making it downloadable

---

## 🛠 How to Use the Generated Project

Once you’ve downloaded and unzipped your project from the client side, follow the instructions below to get started.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Set Up PostgreSQL

Create a new PostgreSQL database locally or using a cloud service like Supabase or Render.

---

### 3. Configure `.env`

At the root of the project, you’ll find a `.env` file. Replace the `DATABASE_URL` with your actual PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
```

#### Example:

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/mydb?schema=public"
```

---

### 4. Push Prisma Schema

Use the following command to sync your Prisma schema with your database:

```bash
npx prisma db push
```

> This creates the necessary tables in your database without using migrations.

---

### 5. Start the Development Server

```bash
npm run dev
```

> This runs the project in watch mode using `ts-node-dev`.

For production:

```bash
npm run build
node dist/server.js
```

---

## 📁 Project Structure

```bash
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
```

---

## ✅ Example API Usage

```http
GET http://localhost:3000/
```

Response:
```
Home page
```

Each generated resource is available under `/api/<resource>`, e.g.:

```http
GET http://localhost:3000/api/user
```

---

## 🆕 New Features

### 📚 Interactive API Documentation (Swagger)

When enabled, your generated project includes:

**Swagger UI Interface:**
- **URL**: `http://localhost:3000/api-docs`
- **Features**: Interactive API testing, request/response schemas, endpoint documentation

**OpenAPI Specification:**
- **JSON**: `http://localhost:3000/api-docs.json`
- **YAML**: `docs/openapi.yaml`

**Usage:**
```bash
# Start your server
npm run dev

# Open browser and navigate to:
# http://localhost:3000/api-docs
```

### 🌱 Test Data Seeding

When enabled, your generated project includes intelligent test data generation:

**Available Commands:**
```bash
# Generate test data (preserves existing records)
npm run seed

# Reset database and generate fresh data
npm run seed:reset

# Advanced seeding options
node seed-script.js --help
```

**Environment Variables:**
```env
SEED_COUNT=50          # Number of records per entity (default: 10)
SEED_LOCALE=en         # Faker locale for generated data (default: en)
```

**Generated Files:**
- `prisma/seed.ts` - Main seeding script
- `prisma/seeders/` - Individual entity seeders with smart data generation
- `seed-script.js` - Advanced seeding CLI tool

**Smart Data Generation:**
The seeder automatically generates realistic data based on property names:
- `email` → `faker.internet.email()`
- `firstName` → `faker.person.firstName()`
- `phone` → `faker.phone.number()`
- `address` → `faker.location.streetAddress()`
- `price` → `faker.commerce.price()`

---

## 🗂 Example Workflow

Let’s say you generate a `user` module. The platform will automatically create:

- `src/routes/user.routes.ts`
- `src/controllers/user.controller.ts`
- `src/services/user.service.ts`
- `src/types/user.types.ts`

It will also:

- Register the route under `/api/user`
- Wire the module into `app.ts`
- Reflect the resource in your Prisma schema

You can immediately start building logic into your controller and service files.

---

## 🧹 Cleaning Up

The generator also handles cleanup of temporary folders after packaging the project. If you wish to manually remove the generated files later, simply delete the base folder.

---

## 🧪 Running in Production

To build and run:

```bash
npm run build
node dist/server.js
```

Make sure your environment variables are configured properly and your PostgreSQL instance is accessible.

---

## 🔧 Customizing Prisma

To update your Prisma models:

1. Open `prisma/schema.prisma`
2. Add or modify models
3. Run:

```bash
npx prisma db push
```

You can also introspect an existing DB:

```bash
npx prisma db pull
```

Or generate types:

```bash
npx prisma generate
```

---

## 💬 Support and Contribution

Support channels and contribution guidelines will be available soon. Stay tuned!

---

## ✨ Enjoy building with **VIBES**!

This platform is made to help you move fast without sacrificing code quality. Whether you’re building an MVP, a microservice, or a full API, VIBES gives you the foundation to build with confidence.