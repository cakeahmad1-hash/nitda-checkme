// database.js
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function init() {
  const db = await open({
    filename: "./nitda-checkme.db",
    driver: sqlite3.Database,
  });

  // Create visitors table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitorId TEXT,
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

  return db;
}

module.exports = init();
