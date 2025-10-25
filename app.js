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
          [checkOutTime.toISOString(), duration, visitorId],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res.send("❌ Error updating checkout.");
            }

            // Show auto-checkout success message
            res.send(`
              <html>
                <head>
                  <title>Checked Out - NITDA</title>
                  <style>
                    body { font-family: Arial; text-align: center; padding: 40px; background: #f5f5f5; }
                    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    .btn { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h2>👋 Goodbye!</h2>
                    <p>You've been automatically checked <b>OUT</b>.</p>
                    <p>Duration: <b>${duration}</b></p>
                    <div>
                      <a href="/guest" class="btn">Enter Again</a>
                      <a href="/" class="btn">Home</a>
                    </div>
                  </div>
                </body>
              </html>
            `);
          }
        );
      } else {
        // Currently OUT or no record → auto checkin
        const now = new Date();
        const timeString = now.toISOString();
        
        // Get the last used details
        db.get(
          `SELECT fullName, laptopBrand, macAddress FROM visitors WHERE id = ? ORDER BY checkIn DESC LIMIT 1`,
          [visitorId],
          (err3, lastVisit) => {
            if (err3) {
              console.error(err3);
              // Auto checkin with default details
              db.run(
                `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
                [visitorId, "Returning Visitor", "Previous Device", "Auto MAC", "Automatic Check-in", timeString],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res.send("❌ Error during auto check-in.");
                  }
                  
                  res.send(`
                    <html>
                      <head>
                        <title>Checked In - NITDA</title>
                        <style>
                          body { font-family: Arial; text-align: center; padding: 40px; background: #f5f5f5; }
                          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                          .btn { display: inline-block; margin: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <h2>✅ Welcome Back!</h2>
                          <p>You've been automatically checked <b>IN</b>.</p>
                          <p>Time: <b>${new Date(timeString).toLocaleString()}</b></p>
                          <p>Event: <b>Automatic Check-in</b></p>
                          <div>
                            <a href="/guest" class="btn">Leave Again</a>
                            <a href="/" class="btn">Home</a>
                          </div>
                        </div>
                      </body>
                    </html>
                  `);
                }
              );
            } else {
              // Auto checkin with last known details
              db.run(
                `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
                [
                  visitorId, 
                  lastVisit.fullName || "Returning Visitor",
                  lastVisit.laptopBrand || "Previous Device", 
                  lastVisit.macAddress || "Auto MAC",
                  "Automatic Check-in", 
                  timeString
                ],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res.send("❌ Error during auto check-in.");
                  }
                  
                  res.send(`
                    <html>
                      <head>
                        <title>Checked In - NITDA</title>
                        <style>
                          body { font-family: Arial; text-align: center; padding: 40px; background: #f5f5f5; }
                          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                          .btn { display: inline-block; margin: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <h2>✅ Welcome Back!</h2>
                          <p>You've been automatically checked <b>IN</b>.</p>
                          <p>Time: <b>${new Date(timeString).toLocaleString()}</b></p>
                          <p>Event: <b>Automatic Check-in</b></p>
                          <div>
                            <a href="/guest" class="btn">Leave Again</a>
                            <a href="/" class="btn">Home</a>
                          </div>
                        </div>
                      </body>
                    </html>
                  `);
                }
              );
            }
          }
        );
      }
    }
  );
});

// --------- Handle visitor form submission ---------
app.post("/submit", (req, res) => {
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;
  if (!allowCookies) return res.send("❌ You must allow cookies before submitting.");

  const now = new Date();
  const timeString = now.toISOString();

  if (req.cookies.visitorId) {
    // Returning visitor filling form again
    const visitorId = req.cookies.visitorId;
    
    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "Manual Check-in", timeString],
      function(err) {
        if (err) {
          console.error("Database error:", err);
          return res.send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 40px;">
                <h2>❌ Error</h2>
                <p>There was an error checking you in.</p>
                <p>Please scan the QR code instead of filling the form for faster check-in/out.</p>
                <p><a href="/guest">Try QR Code</a> | <a href="/">Home</a></p>
              </body>
            </html>
          `);
        }
        res.send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
              <h2>✅ Checked In</h2>
              <p>Welcome back! You are now checked IN.</p>
              <p>Next time, just scan the QR code for automatic check-in/out.</p>
              <p><a href="/guest">Leave</a> | <a href="/">Home</a></p>
            </body>
          </html>
        `);
      }
    );
  } else {
    // First-time visitor
    const visitorId = Date.now().toString();

    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "First Visit", timeString],
      function(err) {
        if (err) {
          console.error("Database error:", err);
          return res.send("❌ Error saving your information. Please try again.");
        }
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
              <h2>✅ Checked In Successfully!</h2>
              <p>Cookie saved for next time.</p>
              <p>Next time, just scan the QR code for automatic check-in/out.</p>
              <p><a href="/guest">Test Auto Check-out</a> | <a href="/">Home</a></p>
            </body>
          </html>
        `);
      }
    );
  }
});

// --------- Admin Login ---------
app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-login.html"));
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
        <td>${v.checkIn ? new Date(v.checkIn).toLocaleString() : "-"}</td>
        <td>${v.checkOut ? new Date(v.checkOut).toLocaleString() : "-"}</td>
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
  res.sendFile(path.join(__dirname, "create-event.html"));
});

app.post("/create-event", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");
  const { eventName } = req.body;
  const now = new Date().toISOString();

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

// ----------------- Start Server -----------------
app.listen(port, () => {
  console.log(`🚀 NITDA CheckMe running on port ${port}`);
});
