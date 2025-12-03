# Vercel Database Setup Instructions

This application uses Vercel Postgres for permanent data storage.

### 1. Create a Postgres Database on Vercel
1. Go to your Vercel Dashboard.
2. Navigate to the **Storage** tab.
3. Click **Create Database** and select **Postgres**.
4. Give it a name (e.g., `nitda-checkme-db`) and create it.
5. In your project settings, link this database to your Vercel project. This will automatically set environment variables like `POSTGRES_URL`.

### 2. Install Dependencies
Ensure your `package.json` includes the following dependencies (already included in the code):
```json
"dependencies": {
  "@vercel/postgres": "^0.5.0",
  "@vercel/node": "^3.0.0"
}
```

### 3. Initialize the Database
Once you have deployed your project:
1. Open your browser.
2. Visit your deployed URL with the path `/api/setup`.
   - Example: `https://your-project.vercel.app/api/setup`
3. You should see a JSON response: `{"success": true, "message": "..."}`.
4. Your database is now ready! You can start using the app.

### 4. Troubleshooting
- If you see an error, check the **Function Logs** in your Vercel Dashboard for details.
- Ensure the database is correctly linked in the Vercel **Storage** tab.
