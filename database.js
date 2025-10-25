// database.js - Replit compatible
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use file database that works on Replit
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/visitors.db' 
  : './visitors.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    
    // Create visitors table
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
        console.error('Error creating table:', err);
      } else {
        console.log('Visitors table ready');
      }
    });
  }
});

// Promise-based methods
const dbPromise = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('DB GET Error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },
  
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('DB ALL Error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },
  
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          console.error('DB RUN Error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
};

module.exports = dbPromise;
