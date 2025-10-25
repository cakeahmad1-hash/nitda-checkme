// app.js - NITDA CheckMe Visitor Management System
const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const db = require("./database");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ========================
// SIMPLE & CLEAN UI
// ========================

const renderPage = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - NITDA CheckMe</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 5px;
        }
        
        .btn:hover {
            background: #0056b3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .btn-success {
            background: #28a745;
        }
        
        .btn-success:hover {
            background: #1e7e34;
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-secondary:hover {
            background: #545b62;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border: 1px solid #c3e6cb;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border: 1px solid #f5c6cb;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .status-in {
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .status-out {
            background: #6c757d;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; font-size: 3em; margin-bottom: 10px;">NITDA CheckMe</h1>
            <p style="color: white; font-size: 1.2em;">Visitor Management System</p>
        </div>
        ${content}
    </div>
</body>
</html>
`;

// ========================
// ROUTES
// ========================

// Homepage
app.get("/", async (req, res) => {
    try {
        const [totalVisitors, checkedInVisitors, eventsCount] = await Promise.all([
            db.getAsync("SELECT COUNT(*) as count FROM visitors"),
            db.getAsync("SELECT COUNT(*) as count FROM visitors WHERE status = 'IN'"),
            db.getAsync("SELECT COUNT(DISTINCT eventName) as count FROM visitors WHERE eventName != 'First Visit' AND eventName != 'Automatic Check-in'")
        ]);

        const content = `
            <div class="card" style="padding: 40px; text-align: center;">
                <h2 style="margin-bottom: 30px; color: #333;">Welcome to NITDA CheckMe</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <i style="font-size: 2em;">👥</i>
                        <div class="stat-number">${totalVisitors.count}</div>
                        <div>Total Visitors</div>
                    </div>
                    <div class="stat-card">
                        <i style="font-size: 2em;">✅</i>
                        <div class="stat-number">${checkedInVisitors.count}</div>
                        <div>Currently In</div>
                    </div>
                    <div class="stat-card">
                        <i style="font-size: 2em;">📅</i>
                        <div class="stat-number">${eventsCount.count}</div>
                        <div>Active Events</div>
                    </div>
                </div>
                
                <div style="margin: 30px 0;">
                    <a href="/guest" class="btn">Check In as Visitor</a>
                    <a href="/admin" class="btn btn-secondary">Admin Dashboard</a>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
                    <h3 style="margin-bottom: 15px;">How it works:</h3>
                    <p>1. First time: Fill out the check-in form</p>
                    <p>2. Returning: Automatic check-in/out with one click</p>
                    <p>3. Cookie-based: Remembers you for faster access</p>
                </div>
            </div>
        `;
        
        res.send(renderPage("Home", content));
    } catch (error) {
        console.error("Homepage error:", error);
        res.send(renderPage("Error", `
            <div class="card" style="padding: 40px; text-align: center;">
                <div class="error-message">
                    <h2>System Error</h2>
                    <p>Please try again later.</p>
                </div>
                <a href="/" class="btn">Refresh</a>
            </div>
        `));
    }
});

// Guest Check-in/out
app.get("/guest", async (req, res) => {
    const visitorId = req.cookies.visitorId;

    if (!visitorId) {
        // Show form for first-time visitors
        const content = `
            <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px;">
                <h2 style="text-align: center; margin-bottom: 30px;">Visitor Check-In</h2>
                <form action="/submit" method="POST">
                    <div class="form-group">
                        <label class="form-label">Full Name *</label>
                        <input type="text" name="fullName" class="form-input" placeholder="Enter your full name" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Laptop Brand</label>
                        <input type="text" name="laptopBrand" class="form-input" placeholder="e.g., Dell, HP, MacBook">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">MAC Address</label>
                        <input type="text" name="macAddress" class="form-input" placeholder="XX:XX:XX:XX:XX:XX">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Event Name</label>
                        <input type="text" name="eventName" class="form-input" placeholder="Meeting, Conference, etc.">
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" name="allowCookies" required style="width: auto;">
                            <span>I allow cookies for automatic check-in/out next time</span>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn" style="width: 100%;">Check In Now</button>
                </form>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="/" class="btn btn-secondary">← Back to Home</a>
                </div>
            </div>
        `;
        res.send(renderPage("Check In", content));
        return;
    }

    try {
        // Returning visitor logic
        const row = await db.getAsync(
            `SELECT * FROM visitors WHERE visitorId = ? ORDER BY id DESC LIMIT 1`,
            [visitorId]
        );

        const now = new Date();

        if (row && row.status === "IN") {
            // Auto check-out
            const checkOutTime = new Date();
            const durationMs = checkOutTime - new Date(row.checkIn);
            const durationMins = Math.floor(durationMs / 60000);
            const duration = `${durationMins} mins`;

            await db.runAsync(
                `UPDATE visitors SET checkOut = ?, duration = ?, status = 'OUT' WHERE id = ?`,
                [checkOutTime.toISOString(), duration, row.id]
            );

            const content = `
                <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                    <div style="font-size: 4em; margin-bottom: 20px;">👋</div>
                    <h2 style="margin-bottom: 20px;">Checked Out Successfully!</h2>
                    <div class="success-message">
                        <p><strong>Duration:</strong> ${duration}</p>
                        <p>You have been automatically checked out.</p>
                    </div>
                    <div style="margin-top: 30px;">
                        <a href="/guest" class="btn">Check In Again</a>
                        <a href="/" class="btn btn-secondary">Go Home</a>
                    </div>
                </div>
            `;
            res.send(renderPage("Checked Out", content));
        } else {
            // Auto check-in
            const lastVisit = row || {};
            const fullName = lastVisit.fullName || "Returning Visitor";
            const laptopBrand = lastVisit.laptopBrand || "Not Specified";
            const macAddress = lastVisit.macAddress || "Not Specified";

            await db.runAsync(
                `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
                [visitorId, fullName, laptopBrand, macAddress, "Automatic Check-in", now.toISOString()]
            );

            const content = `
                <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                    <div style="font-size: 4em; margin-bottom: 20px;">✅</div>
                    <h2 style="margin-bottom: 20px;">Welcome Back!</h2>
                    <div class="success-message">
                        <p>You have been automatically checked in.</p>
                        <p><strong>Time:</strong> ${now.toLocaleString()}</p>
                    </div>
                    <div style="margin-top: 30px;">
                        <a href="/guest" class="btn">Check Out</a>
                        <a href="/" class="btn btn-secondary">Go Home</a>
                    </div>
                </div>
            `;
            res.send(renderPage("Checked In", content));
        }
    } catch (error) {
        console.error("Guest route error:", error);
        const content = `
            <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                <div class="error-message">
                    <h2>System Error</h2>
                    <p>Please try again.</p>
                </div>
                <a href="/guest" class="btn">Try Again</a>
            </div>
        `;
        res.send(renderPage("Error", content));
    }
});

// Form submission
app.post("/submit", async (req, res) => {
    const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;

    if (!allowCookies) {
        const content = `
            <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                <div class="error-message">
                    <h2>Cookies Required</h2>
                    <p>You must allow cookies to use the automatic check-in feature.</p>
                </div>
                <a href="/guest" class="btn">Go Back</a>
            </div>
        `;
        res.send(renderPage("Cookies Required", content));
        return;
    }

    const now = new Date().toISOString();
    let visitorId = req.cookies.visitorId;

    if (!visitorId) {
        visitorId = Date.now().toString();
        res.cookie("visitorId", visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
    }

    try {
        await db.runAsync(
            `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
             VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
            [visitorId, fullName, laptopBrand || "Not Specified", macAddress || "Not Specified", eventName || "First Visit", now]
        );

        const content = `
            <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
                <h2 style="margin-bottom: 20px;">Welcome to NITDA!</h2>
                <div class="success-message">
                    <p><strong>Hello ${fullName}!</strong></p>
                    <p>You have been checked in successfully.</p>
                    <p>Your cookie has been saved for automatic check-in/out next time.</p>
                </div>
                <div style="margin-top: 30px;">
                    <a href="/guest" class="btn">Test Auto Feature</a>
                    <a href="/" class="btn btn-secondary">Go Home</a>
                </div>
            </div>
        `;
        res.send(renderPage("Welcome", content));
    } catch (error) {
        console.error("Submit error:", error);
        const content = `
            <div class="card" style="max-width: 500px; margin: 0 auto; padding: 40px; text-align: center;">
                <div class="error-message">
                    <h2>Check-in Failed</h2>
                    <p>There was an error processing your check-in. Please try again.</p>
                </div>
                <a href="/guest" class="btn">Try Again</a>
            </div>
        `;
        res.send(renderPage("Error", content));
    }
});

// Admin Dashboard
app.get("/admin", async (req, res) => {
    try {
        const rows = await db.allAsync("SELECT * FROM visitors ORDER BY id DESC");
        
        const tableRows = rows.map(visitor => `
            <tr>
                <td>${visitor.fullName || "-"}</td>
                <td>${visitor.laptopBrand || "-"}</td>
                <td style="font-family: monospace;">${visitor.macAddress || "-"}</td>
                <td>${visitor.eventName || "-"}</td>
                <td>${visitor.checkIn ? new Date(visitor.checkIn).toLocaleString() : "-"}</td>
                <td>${visitor.checkOut ? new Date(visitor.checkOut).toLocaleString() : "-"}</td>
                <td>${visitor.duration || "-"}</td>
                <td><span class="${visitor.status === 'IN' ? 'status-in' : 'status-out'}">${visitor.status || "-"}</span></td>
            </tr>
        `).join("");

        const content = `
            <div class="card" style="padding: 30px;">
                <h2 style="margin-bottom: 20px;">Admin Dashboard</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${rows.length}</div>
                        <div>Total Visitors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${rows.filter(r => r.status === 'IN').length}</div>
                        <div>Currently In</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${new Set(rows.map(r => r.eventName)).size}</div>
                        <div>Unique Events</div>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Laptop Brand</th>
                                <th>MAC Address</th>
                                <th>Event</th>
                                <th>Check-In</th>
                                <th>Check-Out</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td colspan="8" style="text-align: center; padding: 40px;">No visitor records yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="/" class="btn">← Back to Home</a>
                </div>
            </div>
        `;
        
        res.send(renderPage("Admin Dashboard", content));
    } catch (error) {
        console.error("Admin dashboard error:", error);
        const content = `
            <div class="card" style="padding: 40px; text-align: center;">
                <div class="error-message">
                    <h2>Admin Error</h2>
                    <p>Could not load visitor data.</p>
                </div>
                <a href="/" class="btn">Go Home</a>
            </div>
        `;
        res.send(renderPage("Error", content));
    }
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 NITDA CheckMe running on http://localhost:${port}`);
    console.log(`✅ Database connected`);
    console.log(`✨ Features: Auto check-in/out, Admin dashboard, Beautiful UI`);
});
