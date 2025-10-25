const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const db = require("./database");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// --------- Homepage ---------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// --------- Guest Route: auto checkout OR auto checkin ---------
app.get("/guest", (req, res) => {
  const visitorId = req.cookies.visitorId;

  if (!visitorId) {
    // First-time visitor → show the check-in form
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  // Returning visitor → check DB for current status
  db.get(
    `SELECT * FROM visitors WHERE id = ? ORDER BY checkIn DESC LIMIT 1`,
    [visitorId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.send("❌ Database error.");
      }

      if (row && row.status === 'IN') {
        // Currently IN → auto checkout
        const checkOutTime = new Date();
        const durationMs = checkOutTime - new Date(row.checkIn);
        const durationMins = Math.floor(durationMs / 60000);
        const duration = `${durationMins} mins`;

        db.run(
          `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE id = ? AND status = 'IN'`,
          [checkOutTime.toLocaleString(), duration, visitorId],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res.send("❌ Error updating checkout.");
            }

            // Show auto-checkout success message
            res.send(`
              <html>
                <body style="font-family:Arial;text-align:center;padding:40px;">
                  <h2>👋 Goodbye!</h2>
                  <p>You've been automatically checked <b>OUT</b>.</p>
                  <p>Duration: <b>${duration}</b></p>
                  <p><a href="/guest">Enter again?</a> | <a href="/">Home</a></p>
                </body>
              </html>
            `);
          }
        );
      } else {
        // Currently OUT or no record → auto checkin
        const now = new Date();
        const timeString = now.toLocaleString();
        
        // Get the last used details for auto-fill
        db.get(
          `SELECT fullName, laptopBrand, macAddress FROM visitors WHERE id = ? ORDER BY checkIn DESC LIMIT 1`,
          [visitorId],
          (err3, lastVisit) => {
            if (err3) {
              console.error(err3);
              // Continue with auto checkin without details
              return performAutoCheckIn(visitorId, timeString, null, res);
            }

            // Auto checkin with last known details
            performAutoCheckIn(visitorId, timeString, lastVisit, res);
          }
        );
      }
    }
  );
});

// Helper function for auto checkin
function performAutoCheckIn(visitorId, timeString, lastVisit, res) {
  const defaultEvent = "Automatic Check-in";
  
  db.run(
    `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
     VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
    [
      visitorId, 
      lastVisit ? lastVisit.fullName : "Auto Visitor",
      lastVisit ? lastVisit.laptopBrand : "Auto Device", 
      lastVisit ? lastVisit.macAddress : "Auto MAC",
      defaultEvent, 
      timeString
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.send("❌ Error during auto check-in.");
      }
      
      res.send(`
        <html>
          <body style="font-family:Arial;text-align:center;padding:40px;">
            <h2>✅ Welcome Back!</h2>
            <p>You've been automatically checked <b>IN</b>.</p>
            <p>Time: <b>${timeString}</b></p>
            <p>Event: <b>Automatic Check-in</b></p>
            <p><a href="/guest">Leave again?</a> | <a href="/">Home</a></p>
          </body>
        </html>
      `);
    }
  );
}

// --------- Handle visitor form submission ---------
app.post("/submit", (req, res) => {
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;
  if (!allowCookies) return res.send("❌ You must allow cookies before submitting.");

  const now = new Date();
  const timeString = now.toLocaleString();

  if (req.cookies.visitorId) {
    const visitorId = req.cookies.visitorId;

    // For returning visitors, just create a new check-in record
    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "Manual Check-in", timeString],
      (err) => {
        if (err) {
          console.error(err);
          return res.send("❌ Error saving check-in.");
        }
        res.send("✅ Welcome back! You are now checked IN.");
      }
    );
  } else {
    // First-time visitor
    const visitorId = Date.now().toString();

    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "Default", timeString],
      (err) => {
        if (err) {
          console.error(err);
          return res.send("❌ Error saving new visitor.");
        }
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.send("✅ You're checked in successfully! (Cookie saved for next time)");
      }
    );
  }
});

// --------- Admin Login ---------
app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "1234") {
    res.cookie("admin", "true", { httpOnly: true });
    return res.redirect("/admin");
  }
  res.send("❌ Invalid credentials. <a href='/admin-login'>Try again</a>");
});

// Admin logout
app.get("/admin-logout", (req, res) => {
  res.clearCookie("admin");
  res.redirect("/");
});

// --------- Admin Dashboard ---------
app.get("/admin", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");

  db.all("SELECT * FROM visitors ORDER BY checkIn DESC", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.send("❌ Error loading visitor data.");
    }

    const tableRows = rows
      .map(
        (v) => `
      <tr>
        <td>${v.fullName || "-"}</td>
        <td>${v.laptopBrand || "-"}</td>
        <td>${v.macAddress || "-"}</td>
        <td>${v.eventName || "-"}</td>
        <td>${v.checkIn || "-"}</td>
        <td>${v.checkOut || "-"}</td>
        <td>${v.duration || "-"}</td>
        <td>${v.status || "-"}</td>
      </tr>`
      )
      .join("");

    res.send(`
      <html>
      <head><title>Admin - NITDA CheckMe</title>
        <style>
          body { font-family: Arial; background:#f8f9fa; padding:20px; }
          table { width:100%; border-collapse: collapse; background:#fff; }
          th, td { padding:8px; border:1px solid #ddd; text-align:left; }
          th { background:#007bff; color:white; }
          .nav { margin-bottom: 12px; }
          .nav a { margin-right:8px; text-decoration:none;}
        </style>
      </head>
      <body>
        <div class="nav">
          <a href="/create-event">Create Event QR</a> |
          <a href="/qr">Gate QR</a> |
          <a href="/admin-logout">Logout</a> |
          <a href="/">Home</a>
        </div>
        <h1>Visitor Log</h1>
        <table>
          <tr>
            <th>Name</th><th>Brand</th><th>MAC</th><th>Event</th><th>Check-In</th><th>Check-Out</th><th>Duration</th><th>Status</th>
          </tr>
          ${tableRows || "<tr><td colspan='8'>No records yet.</td></tr>"}
        </table>
      </body>
      </html>
    `);
  });
});

// --------- Create Event ---------
app.get("/create-event", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");
  res.sendFile(path.join(__dirname, "public", "create-event.html"));
});

app.post("/create-event", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");
  const { eventName } = req.body;
  const now = new Date().toLocaleString();

  db.run("INSERT INTO events (name, createdAt) VALUES (?, ?)", [eventName, now], function (err) {
    if (err) {
      console.error(err);
      return res.send("❌ Error creating event.");
    }

    const formURL = `http://${req.headers.host}/guest?eventName=${encodeURIComponent(eventName)}`;
    QRCode.toDataURL(formURL, (err2, qrImage) => {
      if (err2) {
        console.error(err2);
        return res.send("❌ Error generating QR.");
      }
      res.send(`
        <html><body style="text-align:center;font-family:Arial;padding:30px;">
          <h2>Event Created: ${eventName}</h2>
          <img src="${qrImage}" /><p><a href="${formURL}">${formURL}</a></p>
          <p><a href="/admin">Back to Dashboard</a></p>
        </body></html>
      `);
    });
  });
});

// --------- Generic QR for gate ---------
app.get("/qr", async (req, res) => {
  try {
    const formURL = `http://${req.headers.host}/guest`;
    const qrImage = await QRCode.toDataURL(formURL);
    res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>Scan to open NITDA CheckMe (Gate)</h2>
          <img src="${qrImage}" />
          <p><a href="${formURL}">${formURL}</a></p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error(e);
    res.send("❌ Error generating QR");
  }
});

// ----------------- Database initialization -----------------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt TEXT
    )
  `);
});

// ----------------- Auto-reset at midnight -----------------
function autoReset() {
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5) - now;

  setTimeout(() => {
    const endTime = new Date().toLocaleString();
    db.all("SELECT * FROM visitors WHERE status = 'IN'", (err, rows) => {
      if (!err && rows.length) {
        rows.forEach((v) => {
          const durationMs = new Date() - new Date(v.checkIn);
          const durationMins = Math.floor(durationMs / 60000);
          const duration = `${durationMins} mins`;
          db.run(
            `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE id = ? AND status = 'IN'`,
            [endTime + " (Auto Day End)", duration, v.id]
          );
        });
      }
    });
    console.log("🌙 Auto-reset done for the day!");
    autoReset(); // schedule for next day
  }, msUntilMidnight);
}
autoReset();

// ----------------- Start Server -----------------
app.listen(port, () => {
  console.log(`🚀 NITDA CheckMe running on port ${port}`);
});
