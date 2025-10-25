// app.js - Simplified Working Version
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

// ========================
// SIMPLE UI TEMPLATES
// ========================

const simpleTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - NITDA CheckMe</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .card { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        .btn { 
            display: inline-block; 
            padding: 10px 20px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 5px;
        }
        .btn:hover { background: #0056b3; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
    </style>
</head>
<body>
    <div style="text-align: center; margin-bottom: 30px;">
        <h1>NITDA CheckMe</h1>
        <p>Visitor Management System</p>
    </div>
    ${content}
    <div style="text-align: center; margin-top: 30px;">
        <a href="/" class="btn">Home</a>
        <a href="/guest" class="btn">Check In/Out</a>
    </div>
</body>
</html>
`;

// ========================
// ROUTES
// ========================

// Homepage
app.get("/", (req, res) => {
    res.send(simpleTemplate("Home", `
        <div class="card" style="text-align: center;">
            <h2>Welcome to NITDA CheckMe</h2>
            <p>Smart visitor management system</p>
            <div style="margin: 20px 0;">
                <a href="/guest" class="btn">Check In as Visitor</a>
                <a href="/admin" class="btn">Admin Dashboard</a>
            </div>
        </div>
    `));
});

// Guest Route
app.get("/guest", (req, res) => {
    const visitorId = req.cookies.visitorId;

    if (!visitorId) {
        // Show form for first-time visitors
        return res.send(simpleTemplate("Check In", `
            <div class="card">
                <h2>Visitor Check-In</h2>
                <form action="/submit" method="POST">
                    <div style="margin: 15px 0;">
                        <label><strong>Full Name *</strong></label><br>
                        <input type="text" name="fullName" required style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin: 15px 0;">
                        <label><strong>Laptop Brand</strong></label><br>
                        <input type="text" name="laptopBrand" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin: 15px 0;">
                        <label><strong>MAC Address</strong></label><br>
                        <input type="text" name="macAddress" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin: 15px 0;">
                        <label><strong>Event Name</strong></label><br>
                        <input type="text" name="eventName" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin: 15px 0;">
                        <input type="checkbox" name="allowCookies" id="allowCookies" required>
                        <label for="allowCookies">I allow cookies to remember me for faster check-in</label>
                    </div>
                    <button type="submit" class="btn" style="width: 100%;">Check In</button>
                </form>
            </div>
        `));
    }

    // Returning visitor - check status
    db.get(
        `SELECT * FROM visitors WHERE visitorId = ? ORDER BY id DESC LIMIT 1`,
        [visitorId],
        (err, row) => {
            if (err) {
                console.error("Database error:", err);
                return res.send(simpleTemplate("Error", `
                    <div class="card error">
                        <h2>Database Error</h2>
                        <p>Please try again.</p>
                    </div>
                `));
            }

            const now = new Date();

            if (row && row.status === "IN") {
                // Check OUT
                const checkOutTime = new Date();
                const durationMs = checkOutTime - new Date(row.checkIn);
                const durationMins = Math.floor(durationMs / 60000);
                const duration = `${durationMins} mins`;

                db.run(
                    `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE id = ?`,
                    [checkOutTime.toISOString(), duration, row.id],
                    (err) => {
                        if (err) {
                            console.error("Check-out error:", err);
                            return res.send(simpleTemplate("Error", `
                                <div class="card error">
                                    <h2>Check-out Failed</h2>
                                    <p>Please try again.</p>
                                </div>
                            `));
                        }

                        res.send(simpleTemplate("Checked Out", `
                            <div class="card success">
                                <h2>👋 Checked Out Successfully!</h2>
                                <p>You have been automatically checked out.</p>
                                <p><strong>Duration:</strong> ${duration}</p>
                                <a href="/guest" class="btn">Check In Again</a>
                            </div>
                        `));
                    }
                );
            } else {
                // Check IN
                const lastVisit = row || {};
                const fullName = lastVisit.fullName || "Returning Visitor";
                const laptopBrand = lastVisit.laptopBrand || "Not Specified";
                const macAddress = lastVisit.macAddress || "Not Specified";

                db.run(
                    `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
                     VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
                    [visitorId, fullName, laptopBrand, macAddress, "Automatic Check-in", now.toISOString()],
                    (err) => {
                        if (err) {
                            console.error("Check-in error:", err);
                            return res.send(simpleTemplate("Error", `
                                <div class="card error">
                                    <h2>Check-in Failed</h2>
                                    <p>Please try again.</p>
                                </div>
                            `));
                        }

                        res.send(simpleTemplate("Checked In", `
                            <div class="card success">
                                <h2>✅ Checked In Successfully!</h2>
                                <p>Welcome back! You have been automatically checked in.</p>
                                <p><strong>Time:</strong> ${now.toLocaleString()}</p>
                                <a href="/guest" class="btn">Check Out</a>
                            </div>
                        `));
                    }
                );
            }
        }
    );
});

// Form Submission
app.post("/submit", (req, res) => {
    const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;

    if (!allowCookies) {
        return res.send(simpleTemplate("Error", `
            <div class="card error">
                <h2>Cookies Required</h2>
                <p>You must allow cookies to use the check-in system.</p>
                <a href="/guest" class="btn">Go Back</a>
            </div>
        `));
    }

    const now = new Date().toISOString();
    let visitorId = req.cookies.visitorId;

    if (!visitorId) {
        visitorId = Date.now().toString();
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000 });
    }

    db.run(
        `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
         VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
        [visitorId, fullName, laptopBrand || "Not Specified", macAddress || "Not Specified", eventName || "First Visit", now],
        (err) => {
            if (err) {
                console.error("Database error:", err);
                return res.send(simpleTemplate("Error", `
                    <div class="card error">
                        <h2>Check-in Failed</h2>
                        <p>There was an error processing your check-in.</p>
                        <a href="/guest" class="btn">Try Again</a>
                    </div>
                `));
            }

            res.send(simpleTemplate("Success", `
                <div class="card success">
                    <h2>🎉 Welcome to NITDA!</h2>
                    <p><strong>Hello ${fullName}!</strong></p>
                    <p>You have been checked in successfully.</p>
                    <p>Your cookie has been saved for automatic check-in/out next time.</p>
                    <a href="/guest" class="btn">Test Auto Feature</a>
                </div>
            `));
        }
    );
});

// Admin Dashboard
app.get("/admin", (req, res) => {
    db.all("SELECT * FROM visitors ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error("Admin error:", err);
            return res.send(simpleTemplate("Error", `
                <div class="card error">
                    <h2>Admin Error</h2>
                    <p>Could not load visitor data.</p>
                </div>
            `));
        }

        const tableRows = rows.map(visitor => `
            <tr>
                <td>${visitor.fullName || "-"}</td>
                <td>${visitor.laptopBrand || "-"}</td>
                <td>${visitor.macAddress || "-"}</td>
                <td>${visitor.eventName || "-"}</td>
                <td>${visitor.checkIn ? new Date(visitor.checkIn).toLocaleString() : "-"}</td>
                <td>${visitor.checkOut ? new Date(visitor.checkOut).toLocaleString() : "-"}</td>
                <td>${visitor.duration || "-"}</td>
                <td>${visitor.status || "-"}</td>
            </tr>
        `).join("");

        res.send(simpleTemplate("Admin Dashboard", `
            <div class="card">
                <h2>Admin Dashboard</h2>
                <div style="margin: 20px 0; display: flex; gap: 10px;">
                    <div style="background: #e9ecef; padding: 10px; border-radius: 5px; flex: 1;">
                        <strong>Total Visitors</strong><br>${rows.length}
                    </div>
                    <div style="background: #e9ecef; padding: 10px; border-radius: 5px; flex: 1;">
                        <strong>Checked In</strong><br>${rows.filter(r => r.status === 'IN').length}
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; border: 1px solid #ddd;">Name</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Brand</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">MAC</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Event</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Check-In</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Check-Out</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Duration</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows || "<tr><td colspan='8' style='text-align: center; padding: 20px;'>No visitors yet</td></tr>"}
                        </tbody>
                    </table>
                </div>
            </div>
        `));
    });
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 NITDA CheckMe running on port ${port}`);
    console.log(`✨ Simple & Stable Version`);
});
