// database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create or open the database file
const db = new sqlite3.Database(path.join(__dirname, "nitda-checkme.db"), (err) => {
  if (err) {
    console.error("❌ Failed to connect to database:", err);
  } else {
    console.log("✅ Connected to NITDA CheckMe database");
  }
});

// Create the visitors table (if not exists)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT,
      fullName TEXT,
      laptopBrand TEXT,
      macAddress TEXT,
      eventName TEXT,
      checkIn TEXT,
      checkOut TEXT,
      duration TEXT,
      status TEXT
    )
  `);
});

module.exports = db;
