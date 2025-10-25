const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const path = require("path");
const db = require("./database");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ========================
// HOME PAGE
// ========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// ========================
// VISITOR FORM SUBMISSION
// ========================
app.post("/register", async (req, res) => {
  const { name, department, purpose } = req.body;

  // Insert visitor into DB
  const checkinTime = new Date();
  const result = await db.run(
    "INSERT INTO visitors (name, department, purpose, checkin_time, status) VALUES (?, ?, ?, ?, ?)",
    [name, department, purpose, checkinTime, "IN"]
  );

  const visitorId = result.lastID;

  // Set cookie to remember visitor
  res.cookie("visitorId", visitorId, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

  res.send(`
    <h2>Welcome, ${name}!</h2>
    <p>Checked in at ${checkinTime.toLocaleTimeString()}</p>
    <p><a href="/">Go to Home</a></p>
  `);
});

// ========================
// AUTO CHECK-IN / CHECK-OUT LOGIC
// ========================
app.get("/guest", async (req, res) => {
  const visitorId = req.cookies.visitorId;

  if (!visitorId) {
    // No cookie = first time
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  // Check if visitor exists
  const visitor = await db.get("SELECT * FROM visitors WHERE id = ?", [visitorId]);
  if (!visitor) {
    // If visitor not found in DB
    return res.sendFile(path.join(__dirname, "public", "visitor-form.html"));
  }

  // Toggle between IN and OUT
  if (visitor.status === "IN") {
    const checkoutTime = new Date();
    await db.run(
      "UPDATE visitors SET status = ?, checkout_time = ? WHERE id = ?",
      ["OUT", checkoutTime, visitorId]
    );
    return res.send(`
      <h2>Checked out successfully!</h2>
      <p>Time: ${checkoutTime.toLocaleTimeString()}</p>
      <p><a href="/">Back to Home</a></p>
    `);
  } else {
    const checkinTime = new Date();
    await db.run(
      "UPDATE visitors SET status = ?, checkin_time = ?, checkout_time = NULL WHERE id = ?",
      ["IN", checkinTime, visitorId]
    );
    return res.send(`
      <h2>Checked in again!</h2>
      <p>Time: ${checkinTime.toLocaleTimeString()}</p>
      <p><a href="/">Back to Home</a></p>
    `);
  }
});

// ========================
// ADMIN LOGIN PAGE
// ========================
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-login.html"));
});

// ========================
// CREATE EVENT PAGE (OPTIONAL)
// ========================
app.get("/create-event", (req, res) => {
  res.sendFile(path.join(__dirname, "create-event.html"));
});

// ========================
// GENERATE QR FOR VISITOR PAGE
// ========================
app.get("/generate-qr", async (req, res) => {
  try {
    const url = `${req.protocol}://${req.get("host")}/guest`;
    const qrImage = await QRCode.toDataURL(url);

    res.send(`
      <h2>Scan this QR to Check In / Out</h2>
      <img src="${qrImage}" alt="QR Code" />
      <p>URL: ${url}</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating QR code.");
  }
});

// ========================
// START SERVER
// ========================
app.listen(port, () => {
  console.log(`✅ NITDA CheckMe running on http://localhost:${port}`);
});
