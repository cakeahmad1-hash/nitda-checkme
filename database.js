// database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "nitda-checkme.db"), (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Database connected successfully.");
  }
});

// Create the visitors table if not exists
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

module.exports = db;
