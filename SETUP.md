# Vercel & Neon Database Setup

Your application is configured to use Vercel Serverless Functions with a Neon Postgres database.

### 1. Configure Environment Variables
You **must** add the database connection string to your Vercel Project Settings for the code to work.

1. Go to your **Vercel Project Dashboard**.
2. Click on **Settings** -> **Environment Variables**.
3. Add a new variable:
   - **Key**: `POSTGRES_URL`
   - **Value**: Your Neon Connection String (e.g., `postgres://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require`)

> **Note:** Your code automatically handles the `channel_binding` issue, so you can paste the full connection string provided by Neon.

### 2. Deploy
Push your code to GitHub/GitLab and let Vercel build the project.

### 3. Initialize the Tables (Run Once)
The database starts empty. You need to create the tables (`visitor_logs`, `events`) before the app will work.

1. Open your browser.
2. Visit your deployed URL with the path `/api/setup`.
   - Example: `https://your-project-name.vercel.app/api/setup`
3. You should see a JSON response: `{"success": true, "message": "Database tables initialized successfully."}`.

### 4. Done!
Your app is now live and saving data to Neon.
