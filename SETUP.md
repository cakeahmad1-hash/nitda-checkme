# Vercel Database Setup Instructions

This application now uses Vercel Postgres for permanent data storage.

### 1. Create a Postgres Database on Vercel
1. Go to your Vercel Dashboard.
2. Navigate to the **Storage** tab.
3. Click **Create Database** and select **Postgres**.
4. Give it a name (e.g., `nitda-checkme-db`) and create it.
5. In your project settings, link this database to your Vercel project. This will automatically set environment variables like `POSTGRES_URL`.

### 2. Install Dependencies
Ensure your `package.json` includes the following dependencies:
```json
"dependencies": {
  "@vercel/postgres": "^0.5.0",
  "@vercel/node": "^3.0.0"
}
```
Run `npm install` locally if you haven't.

### 3. Initialize the Database Schema
1. Open your database in the Vercel Dashboard.
2. Go to the **Query** tab.
3. Copy the contents of the `schema.sql` file provided in this project.
4. Paste it into the query runner and click **Run Query**.
   - This creates the `events` and `visitor_logs` tables.

### 4. Deploy
Push your changes to your git repository connected to Vercel. Vercel will detect the `api/` directory and deploy the serverless functions automatically.
