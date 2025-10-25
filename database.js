// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'visitors.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    
    // Initialize tables
    db.serialize(() => {
      // Visitors table
      db.run(`CREATE TABLE IF NOT EXISTS visitors (
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
      )`, (err) => {
        if (err) {
          console.error('Error creating visitors table:', err);
        } else {
          console.log('✅ Visitors table ready');
        }
      });

      // Events table
      db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        createdAt TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating events table:', err);
        } else {
          console.log('✅ Events table ready');
        }
      });
    });
  }
});

// Promisified database methods for easier async/await usage
db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

module.exports = db;
