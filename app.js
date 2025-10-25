// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const dbPromise = require("./database");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------------- HOME ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// ---------------- GUEST ----------------
app.get("/guest", async (req, res) => {
  const db = await dbPromise;
  const visitorId = req.cookies.visitorId;

  // No cookie = show the form
  if (!visitorId) {
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  try {
    // Get last record for this visitor
    const row = await db.get(
      `SELECT * FROM visitors WHERE visitorId = ? ORDER BY checkIn DESC LIMIT 1`,
      [visitorId]
    );

    if (row && row.status === "IN") {
      // Auto check-out
      const checkOutTime = new Date();
      const durationMs = checkOutTime - new Date(row.checkIn);
      const durationMins = Math.floor(durationMs / 60000);
      const duration = `${durationMins} mins`;

      await db.run(
        `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE id = ?`,
        [checkOutTime.toISOString(), duration, row.id]
      );

      return res.send(`
        <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>👋 Goodbye!</h2>
          <p>You have been automatically checked <b>OUT</b>.</p>
          <p>Duration: <b>${duration}</b></p>
          <p><a href="/guest">Enter Again</a> | <a href="/">Home</a></p>
        </body>
        </html>
      `);
    } else {
      // Auto check-in again
      const lastVisit = row || {};
      const now = new Date().toISOString();

      const fullName = lastVisit.fullName || "Returning Visitor";
      const laptopBrand = lastVisit.laptopBrand || "Unknown Device";
      const macAddress = lastVisit.macAddress || "Auto MAC";

      await db.run(
        `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
         VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
        [visitorId, fullName, laptopBrand, macAddress, "Automatic Check-in", now]
      );

      return res.send(`
        <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>✅ Welcome Back!</h2>
          <p>You have been automatically checked <b>IN</b>.</p>
          <p>Time: <b>${new Date(now).toLocaleString()}</b></p>
          <p><a href="/guest">Leave Again</a> | <a href="/">Home</a></p>
        </body>
        </html>
      `);
    }
  } catch (err) {
    console.error("Auto check-in/out error:", err);
    res.send("❌ Error during auto check-in/out.");
  }
});

// ---------------- FORM SUBMIT ----------------
app.post("/submit", async (req, res) => {
  const db = await dbPromise;
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;

  if (!allowCookies) {
    return res.send("❌ Please allow cookies before submitting.");
  }

  const now = new Date().toISOString();
  let visitorId = req.cookies.visitorId;

  if (!visitorId) {
    visitorId = Date.now().toString();
    res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  }

  try {
    await db.run(
      `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "First Visit", now]
    );

    res.send(`
      <html>
      <body style="font-family:Arial;text-align:center;padding:40px;">
        <h2>✅ Checked In Successfully!</h2>
        <p>Your cookie has been saved for automatic visits.</p>
        <p><a href="/guest">Test Auto Check-out</a> | <a href="/">Home</a></p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Database insert error:", err);
    res.send("❌ Error checking you in. Please try again.");
  }
});

// ---------------- START SERVER ----------------
app.listen(port, () => {
  console.log(`🚀 NITDA CheckMe running on port ${port}`);
});
