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

// ---------------- HOME ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// ---------------- GUEST ----------------
app.get("/guest", (req, res) => {
  const visitorId = req.cookies.visitorId;

  if (!visitorId) {
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  db.get(
    `SELECT * FROM visitors WHERE id = ? ORDER BY checkIn DESC LIMIT 1`,
    [visitorId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.send("❌ Database error during auto check-in/out.");
      }

      // If visitor is IN → auto check-out
      if (row && row.status === "IN") {
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

            res.send(`
              <html>
              <body style="font-family:Arial;text-align:center;padding:40px;">
                <h2>👋 Goodbye!</h2>
                <p>You have been automatically checked <b>OUT</b>.</p>
                <p>Duration: <b>${duration}</b></p>
                <p><a href="/guest">Enter Again</a> | <a href="/">Home</a></p>
              </body>
              </html>
            `);
          }
        );
      } else {
        // Auto check-in again (with fallback details)
        const now = new Date().toISOString();

        db.get(
          `SELECT fullName, laptopBrand, macAddress FROM visitors WHERE id = ? ORDER BY checkIn DESC LIMIT 1`,
          [visitorId],
          (err3, lastVisit) => {
            if (err3) {
              console.error(err3);
              return res.send("❌ Database read error during auto check-in.");
            }

            const fullName = lastVisit?.fullName || "Returning Visitor";
            const laptopBrand = lastVisit?.laptopBrand || "Unknown Device";
            const macAddress = lastVisit?.macAddress || "Auto MAC";

            db.run(
              `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
               VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
              [
                visitorId,
                fullName,
                laptopBrand,
                macAddress,
                "Automatic Check-in",
                now,
              ],
              (err4) => {
                if (err4) {
                  console.error(err4);
                  return res.send("❌ Error inserting new check-in record.");
                }

                res.send(`
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
            );
          }
        );
      }
    }
  );
});

// ---------------- VISITOR FORM SUBMIT ----------------
app.post("/submit", (req, res) => {
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;
  if (!allowCookies) return res.send("❌ Please allow cookies before submitting.");

  const now = new Date().toISOString();

  if (req.cookies.visitorId) {
    const visitorId = req.cookies.visitorId;
    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "Manual Check-in", now],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.send("❌ Error checking you in. Try again.");
        }
        res.send(`<html><body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>✅ Checked In</h2>
          <p>Welcome back! You are now checked IN.</p>
          <p><a href="/guest">Leave</a> | <a href="/">Home</a></p>
        </body></html>`);
      }
    );
  } else {
    const visitorId = Date.now().toString();
    db.run(
      `INSERT INTO visitors (id, fullName, laptopBrand, macAddress, eventName, checkIn, status)
       VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
      [visitorId, fullName, laptopBrand, macAddress, eventName || "First Visit", now],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.send("❌ Error saving your information. Please try again.");
        }
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000 });
        res.send(`<html><body style="font-family:Arial;text-align:center;padding:40px;">
          <h2>✅ Checked In Successfully!</h2>
          <p>Cookie saved for next time.</p>
          <p><a href="/guest">Test Auto Check-out</a> | <a href="/">Home</a></p>
        </body></html>`);
      }
    );
  }
});

// ---------------- DATABASE INIT ----------------
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

// ---------------- START SERVER ----------------
app.listen(port, () => {
  console.log(`🚀 NITDA CheckMe running on port ${port}`);
});
