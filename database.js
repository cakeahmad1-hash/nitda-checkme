// database.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./nitda-checkme.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      recordId INTEGER PRIMARY KEY AUTOINCREMENT,
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
