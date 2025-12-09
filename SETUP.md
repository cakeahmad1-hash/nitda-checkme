
# Vercel & Neon Database Setup

Your application is configured to use Vercel Serverless Functions with a Neon Postgres database.

### 1. Configure Environment Variables
You **must** add the database connection string to your Vercel Project Settings for the code to work.

1. Go to your **Vercel Project Dashboard**.
2. Click on **Settings** -> **Environment Variables**.
3. Add a new variable:
   - **Key**: `POSTGRES_URL`
   - **Value**: `postgresql://neondb_owner:npg_igA5LBYupS3N@ep-wandering-snow-adqozsn2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`

> **Important:** Do NOT include `&channel_binding=require` at the end of the string. It causes serverless functions to crash. Use the exact value above.

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
