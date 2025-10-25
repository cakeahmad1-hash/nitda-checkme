const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const db = require("./database");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// --------- Homepage ---------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// --------- Guest Route ---------
app.get("/guest", (req, res) => {
  const visitorId = req.cookies.visitorId;

  if (!visitorId) {
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  // If visitor has cookie, show QR scanner instead of auto check-in/out
  res.sendFile(path.join(__dirname, "public", "qr-scanner.html"));
});

// --------- Gate Scan Route (triggered by QR scan) ---------
app.get("/gate-scan", (req, res) => {
  const visitorId = req.cookies.visitorId;
  const token = req.query.token;

  // Verify the gate token (simple verification)
  if (token !== "GATE2024") {
    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>❌ Invalid QR Code</h2>
          <p>Please scan the official gate QR code.</p>
          <p><a href="/guest">Try Again</a></p>
        </body>
      </html>
    `);
  }

  if (!visitorId) {
    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>⚠️ Not Registered</h2>
          <p>Please register first by filling the form.</p>
          <p><a href="/guest">Register Now</a></p>
        </body>
      </html>
    `);
  }

  // Check if visitor is currently IN or OUT
  db.get(
    `SELECT * FROM visitors WHERE visitorId = ? AND status = 'IN' ORDER BY checkIn DESC LIMIT 1`,
    [visitorId],
    (err, row) => {
      if (err) return res.send("❌ Database error.");

      if (row) {
        // Visitor is IN, so CHECK OUT
        const checkOutTime = new Date();
        const durationMs = checkOutTime - new Date(row.checkIn);
        const durationMins = Math.floor(durationMs / 60000);
        const duration = `${durationMins} mins`;

        db.run(
          `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE visitorId = ? AND status = 'IN'`,
          [checkOutTime.toLocaleString(), duration, visitorId],
          (err2) => {
            if (err2) return res.send("❌ Error updating checkout.");
            
            res.send(`
              <html>
                <body style="font-family:Arial;text-align:center;padding:40px;">
                  <h2>👋 Checked Out Successfully!</h2>
                  <p>Duration: <b>${duration}</b></p>
                  <p>Time: <b>${checkOutTime.toLocaleString()}</b></p>
                  <p><a href="/">Go Home</a> | <a href="/guest">Scan Again</a></p>
                </body>
              </html>
            `);
          }
        );
      } else {
        // Visitor is OUT, so CHECK IN
        db.get(
          `SELECT * FROM visitors WHERE visitorId = ? ORDER BY checkIn DESC LIMIT 1`,
          [visitorId],
          (err3, lastVisit) => {
            if (err3 || !lastVisit) {
              return res.send("❌ Error retrieving visitor information.");
            }
            
            const now = new Date();
            const timeString = now.toLocaleString();
            
            db.run(
              `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
               VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
              [visitorId, lastVisit.fullName, lastVisit.laptopBrand, lastVisit.macAddress, lastVisit.eventName || "Default", timeString],
              (err4) => {
                if (err4) return res.send("❌ Error checking in.");
                res.send(`
                  <html>
                    <body style="font-family:Arial;text-align:center;padding:40px;">
                      <h2>✅ Checked In Successfully!</h2>
                      <p>Welcome back, <b>${lastVisit.fullName}</b>!</p>
                      <p>Time: <b>${timeString}</b></p>
                      <p><a href="/">Go Home</a> | <a href="/guest">Scan Again</a></p>
                    </body>
                  </html>
                `);
              }
            );
          }
        );
      }
    }
  );
});

// --------- Handle Form Submission ---------
app.post("/submit", (req, res) => {
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;
  if (!allowCookies) return res.send("❌ You must allow cookies.");

  const now = new Date();
  const timeString = now.toLocaleString();

  if (req.cookies.visitorId) {
    const visitorId = req.cookies.visitorId;
    db.get(
      `SELECT * FROM visitors WHERE visitorId = ? AND status = 'IN' ORDER BY checkIn DESC LIMIT 1`,
      [visitorId],
      (err, row) => {
        if (err) return res.send("❌ Database error.");

        if (row) {
          const checkOutTime = new Date();
          const durationMs = checkOutTime - new Date(row.checkIn);
          const durationMins = Math.floor(durationMs / 60000);
          const duration = `${durationMins} mins`;

          db.run(
            `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE visitorId = ? AND status = 'IN'`,
            [checkOutTime.toLocaleString(), duration, visitorId],
            (err2) => {
              if (err2) return res.send("❌ Error updating checkout.");
              res.send(`👋 Auto checked out. Duration: ${duration}`);
            }
          );
        } else {
          db.run(
            `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
             VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
            [visitorId, fullName, laptopBrand, macAddress, eventName || "Default", timeString],
            (err3) => {
              if (err3) return res.send("❌ Error saving check-in.");
              res.send("✅ Welcome back! Checked in.");
            }
          );
        }
      }
    );
  } else {
    const visitorId = Date.now().toString();
    db.run(
      `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "Default", timeString],
      (err) => {
        if (err) return res.send("❌ Error saving visitor.");
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000 });
        res.send("✅ Checked in successfully! Cookie saved.");
      }
    );
  }
});

// --------- Admin Routes ---------
app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "1234") {
    res.cookie("admin", "true");
    return res.redirect("/admin");
  }
  res.send("❌ Invalid credentials. <a href='/admin-login'>Try again</a>");
});

app.get("/admin-logout", (req, res) => {
  res.clearCookie("admin");
  res.redirect("/");
});

app.get("/admin", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");

  db.all("SELECT * FROM visitors ORDER BY checkIn DESC", [], (err, rows) => {
    if (err) return res.send("❌ Error loading data.");

    const tableRows = rows.map(v => `
      <tr>
        <td>${v.fullName || "-"}</td>
        <td>${v.laptopBrand || "-"}</td>
        <td>${v.macAddress || "-"}</td>
        <td>${v.eventName || "-"}</td>
        <td>${v.checkIn || "-"}</td>
        <td>${v.checkOut || "-"}</td>
        <td>${v.duration || "-"}</td>
        <td>${v.status || "-"}</td>
      </tr>
    `).join("");

    res.send(`
      <html>
      <head><title>Admin - NITDA CheckMe</title>
        <style>
          body { font-family: Arial; background:#f8f9fa; padding:20px; }
          table { width:100%; border-collapse: collapse; background:#fff; }
          th, td { padding:8px; border:1px solid #ddd; text-align:left; }
          th { background:#007bff; color:white; }
          .nav { margin-bottom: 12px; }
          .nav a { margin-right:8px; text-decoration:none; color:#007bff;}
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

// --------- QR Code Routes ---------
app.get("/create-event", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");
  res.sendFile(path.join(__dirname, "public", "create-event.html"));
});

app.post("/create-event", (req, res) => {
  if (!req.cookies.admin) return res.redirect("/admin-login");
  const { eventName } = req.body;
  const now = new Date().toLocaleString();

  db.run("INSERT INTO events (name, createdAt) VALUES (?, ?)", [eventName, now], function(err) {
    if (err) return res.send("❌ Error creating event.");

    const formURL = `http://${req.headers.host}/guest?eventName=${encodeURIComponent(eventName)}`;
    QRCode.toDataURL(formURL, (err2, qrImage) => {
      if (err2) return res.send("❌ Error generating QR.");
      res.send(`
        <html><body style="text-align:center;font-family:Arial;padding:30px;">
          <h2>Event Created: ${eventName}</h2>
          <img src="${qrImage}" />
          <p><a href="${formURL}">${formURL}</a></p>
          <p><a href="/admin">Back to Dashboard</a></p>
        </body></html>
      `);
    });
  });
});

app.get("/qr", async (req, res) => {
  try {
    const gateURL = `http://${req.headers.host}/gate-scan?token=GATE2024`;
    const qrImage = await QRCode.toDataURL(gateURL);
    res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>🚪 Gate QR Code</h2>
          <p>Place this QR code at the gate entrance</p>
          <p>Visitors will scan this to check in/out</p>
          <img src="${qrImage}" style="margin:20px 0;" />
          <p style="font-size:12px; color:#666;">
            <a href="${gateURL}">${gateURL}</a>
          </p>
          <p><a href="/admin">Back to Admin</a></p>
        </body>
      </html>
    `);
  } catch (e) {
    res.send("❌ Error generating QR");
  }
});

// --------- Database Setup ---------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      recordId INTEGER PRIMARY KEY AUTOINCREMENT,
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

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt TEXT
    )
  `);
});

// --------- Start Server ---------
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 NITDA CheckMe running on port ${port}`);
});
