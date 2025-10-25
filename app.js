// app.js - Enhanced with Advanced UI & Animations (FIXED)
const express = require("express");
const cookieParser = require("cookie-parser");
const QRCode = require("qrcode");
const dbPromise = require("./database");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Session-like admin authentication
const adminSessions = new Map();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ========================
// ENHANCED UI & ANIMATIONS
// ========================

const UI = {
  styles: `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css');
      
      :root {
        --primary: #2563eb;
        --primary-dark: #1d4ed8;
        --success: #10b981;
        --warning: #f59e0b;
        --error: #ef4444;
        --gray-50: #f9fafb;
        --gray-100: #f3f4f6;
        --gray-200: #e5e7eb;
        --gray-600: #4b5563;
        --gray-900: #111827;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: var(--gray-900);
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .glass-card {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      }
      
      .card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--gray-200);
      }
      
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        cursor: pointer;
        font-size: 16px;
        gap: 8px;
      }
      
      .btn-primary {
        background: var(--primary);
        color: white;
      }
      
      .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      .btn-secondary {
        background: var(--gray-100);
        color: var(--gray-900);
      }
      
      .btn-secondary:hover {
        background: var(--gray-200);
        transform: translateY(-2px);
      }
      
      .btn-success {
        background: var(--success);
        color: white;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--gray-900);
      }
      
      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--gray-200);
        border-radius: 12px;
        font-size: 16px;
        transition: all 0.3s;
      }
      
      .form-input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        color: white;
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
      }
      
      .notification.success {
        background: var(--success);
      }
      
      .notification.error {
        background: var(--error);
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .pulse {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .floating {
        animation: floating 3s ease-in-out infinite;
      }
      
      @keyframes floating {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    </style>
  `,

  scripts: `
    <script>
      // Show notification
      function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = \`notification \${type}\`;
        notification.innerHTML = \`
          <div class="flex items-center gap-3">
            <span class="text-xl">\${type === 'success' ? '✅' : '❌'}</span>
            <span>\${message}</span>
          </div>
        \`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }
      
      // Add floating animation to elements
      function addFloatingAnimation() {
        const elements = document.querySelectorAll('.floating');
        elements.forEach((el, index) => {
          el.style.animationDelay = \`\${index * 0.3}s\`;
        });
      }
      
      // Form validation
      function validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let valid = true;
        
        inputs.forEach(input => {
          if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
            valid = false;
          } else {
            input.style.borderColor = '';
          }
        });
        
        return valid;
      }
      
      // Initialize when page loads
      document.addEventListener('DOMContentLoaded', function() {
        addFloatingAnimation();
        
        // Add loading states to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
          btn.addEventListener('click', function(e) {
            if (this.type === 'submit' || this.href) {
              this.classList.add('pulse');
              setTimeout(() => {
                this.classList.remove('pulse');
              }, 2000);
            }
          });
        });
      });
    </script>
  `
};

// ========================
// UI TEMPLATES
// ========================

UI.templates = {
  base: (title, content, additionalScripts = "") => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - NITDA CheckMe</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      ${UI.styles}
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
      ${UI.scripts}
      ${additionalScripts}
    </body>
    </html>
  `,

  homepage: (visitorId, gateURL, qrImage) => {
    const popupContent = visitorId ? `
      <!-- Welcome Back Popup -->
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate__animated animate__fadeIn">
        <div class="glass-card p-8 mx-4 max-w-md w-full animate__animated animate__bounceIn">
          <div class="text-center">
            <div class="floating mb-4">
              <i class="fas fa-qrcode text-6xl text-white"></i>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Welcome Back! 👋</h2>
            <p class="text-white mb-6">Scan this QR code for quick check-in/out</p>
            <img src="${qrImage}" class="w-48 h-48 mx-auto mb-6 rounded-xl shadow-2xl" alt="QR Code">
            <div class="flex gap-3 justify-center">
              <a href="/gate" class="btn btn-primary">
                <i class="fas fa-bolt"></i>
                Quick Check In/Out
              </a>
              <button onclick="closePopup()" class="btn btn-secondary">
                <i class="fas fa-clock"></i>
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
      <script>
        function closePopup() {
          document.querySelector('.fixed.inset-0').remove();
        }
        setTimeout(closePopup, 10000);
      </script>
    ` : '';

    return UI.templates.base("Welcome", `
      <!-- Hero Section -->
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="text-center">
          <!-- Animated Logo -->
          <div class="floating mb-8">
            <div class="glass-card p-8 inline-block">
              <i class="fas fa-id-card-alt text-6xl text-white"></i>
            </div>
          </div>
          
          <h1 class="text-5xl font-bold text-white mb-4 animate__animated animate__fadeInUp">
            NITDA CheckMe
          </h1>
          <p class="text-xl text-white mb-8 animate__animated animate__fadeInUp animate__delay-1s">
            Smart Visitor Management System
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center animate__animated animate__fadeInUp animate__delay-2s">
            <a href="/guest" class="btn btn-primary text-lg px-8 py-4">
              <i class="fas fa-user-plus"></i>
              Check In as Visitor
            </a>
            <a href="/admin-login" class="btn btn-secondary text-lg px-8 py-4">
              <i class="fas fa-lock"></i>
              Admin Portal
            </a>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
            <div class="glass-card p-6 text-white text-center">
              <i class="fas fa-users text-3xl mb-3"></i>
              <div class="text-2xl font-bold" id="visitorsCount">0</div>
              <div class="text-sm opacity-80">Total Visitors</div>
            </div>
            <div class="glass-card p-6 text-white text-center">
              <i class="fas fa-sign-in-alt text-3xl mb-3"></i>
              <div class="text-2xl font-bold" id="checkedInCount">0</div>
              <div class="text-sm opacity-80">Currently In</div>
            </div>
            <div class="glass-card p-6 text-white text-center">
              <i class="fas fa-qrcode text-3xl mb-3"></i>
              <div class="text-2xl font-bold" id="eventsCount">0</div>
              <div class="text-sm opacity-80">Active Events</div>
            </div>
          </div>
        </div>
      </div>
      
      ${popupContent}
    `);
  }
};

// ========================
// MIDDLEWARE
// ========================

const requireAdmin = (req, res, next) => {
  const adminToken = req.cookies.adminToken;
  if (adminToken && adminSessions.has(adminToken)) {
    next();
  } else {
    res.redirect("/admin-login");
  }
};

// ========================
// ENHANCED ROUTES
// ========================

// ---------------- ENHANCED HOME ----------------
app.get("/", async (req, res) => {
  const visitorId = req.cookies.visitorId;
  const baseURL = `${req.protocol}://${req.get('host')}`;
  const gateURL = `${baseURL}/gate`;

  if (visitorId) {
    try {
      const qrImage = await QRCode.toDataURL(gateURL);
      res.send(UI.templates.homepage(visitorId, gateURL, qrImage));
    } catch (err) {
      console.error("QR Generation error:", err);
      res.send(UI.templates.homepage(null));
    }
  } else {
    res.send(UI.templates.homepage(null));
  }
});

// ---------------- ENHANCED GUEST ROUTE (FIXED) ----------------
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
      `SELECT * FROM visitors WHERE visitorId = ? ORDER BY id DESC LIMIT 1`,
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

      return res.send(UI.templates.base("Checked Out", `
        <div class="min-h-screen flex items-center justify-center py-12">
          <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__bounceIn">
            <div class="floating inline-block p-4 rounded-full bg-green-50 mb-4">
              <i class="fas fa-sign-out-alt text-3xl text-green-600"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Checked Out! 👋</h1>
            <p class="text-gray-600 mb-2">You have been automatically checked out.</p>
            <p class="text-2xl font-bold text-green-600 mb-6">Duration: ${duration}</p>
            <div class="flex gap-3 justify-center">
              <a href="/guest" class="btn btn-primary">
                <i class="fas fa-redo"></i>
                Enter Again
              </a>
              <a href="/" class="btn btn-secondary">
                <i class="fas fa-home"></i>
                Home
              </a>
            </div>
          </div>
        </div>
      `));
    } else {
      // Auto check-in again - use previous data if available
      const lastVisit = row || {};
      const now = new Date().toISOString();

      // Use previous data or defaults
      const fullName = lastVisit.fullName || "Returning Visitor";
      const laptopBrand = lastVisit.laptopBrand || "Not Specified";
      const macAddress = lastVisit.macAddress || "Not Specified";
      const eventName = "Automatic Check-in";

      await db.run(
        `INSERT INTO visitors (visitorId, fullName, laptopBrand, macAddress, eventName, checkIn, status)
         VALUES (?, ?, ?, ?, ?, ?, 'IN')`,
        [visitorId, fullName, laptopBrand, macAddress, eventName, now]
      );

      return res.send(UI.templates.base("Checked In", `
        <div class="min-h-screen flex items-center justify-center py-12">
          <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__bounceIn">
            <div class="floating inline-block p-4 rounded-full bg-blue-50 mb-4">
              <i class="fas fa-sign-in-alt text-3xl text-blue-600"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 mb-4">Welcome Back! ✅</h1>
            <p class="text-gray-600 mb-2">You have been automatically checked in.</p>
            <p class="text-gray-600 mb-6">Time: <b>${new Date(now).toLocaleString()}</b></p>
            <div class="flex gap-3 justify-center">
              <a href="/guest" class="btn btn-primary">
                <i class="fas fa-sign-out-alt"></i>
                Check Out
              </a>
              <a href="/" class="btn btn-secondary">
                <i class="fas fa-home"></i>
                Home
              </a>
            </div>
          </div>
        </div>
      `));
    }
  } catch (err) {
    console.error("Auto check-in/out error:", err);
    
    // Show detailed error for debugging
    return res.send(UI.templates.base("Error", `
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__shakeX">
          <div class="text-red-500 text-6xl mb-4">❌</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-4">System Error</h1>
          <p class="text-gray-600 mb-4">Error during auto check-in/out.</p>
          <p class="text-sm text-gray-500 mb-6">${err.message}</p>
          <div class="flex gap-3 justify-center">
            <a href="/guest" class="btn btn-primary">
              <i class="fas fa-redo"></i>
              Try Again
            </a>
            <a href="/" class="btn btn-secondary">
              <i class="fas fa-home"></i>
              Home
            </a>
          </div>
        </div>
      </div>
    `));
  }
});

// ---------------- ENHANCED FORM SUBMIT ----------------
app.post("/submit", async (req, res) => {
  const db = await dbPromise;
  const { fullName, laptopBrand, macAddress, allowCookies, eventName } = req.body;

  if (!allowCookies) {
    return res.send(UI.templates.base("Error", `
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__shakeX">
          <div class="text-red-500 text-6xl mb-4">🍪</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-4">Cookies Required</h1>
          <p class="text-gray-600 mb-6">Please allow cookies before submitting.</p>
          <a href="/guest" class="btn btn-primary">
            <i class="fas fa-arrow-left"></i>
            Go Back
          </a>
        </div>
      </div>
    `));
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
      [visitorId, fullName, laptopBrand || "Not Specified", macAddress || "Not Specified", eventName || "First Visit", now]
    );

    res.send(UI.templates.base("Success", `
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__bounceIn">
          <div class="floating inline-block p-4 rounded-full bg-green-50 mb-4">
            <i class="fas fa-check-circle text-3xl text-green-600"></i>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-4">Welcome! 🎉</h1>
          <p class="text-gray-600 mb-2">Hello <b>${fullName}</b>!</p>
          <p class="text-gray-600 mb-4">You're checked in successfully.</p>
          <p class="text-green-600 mb-6">
            <i class="fas fa-cookie"></i>
            Cookie saved for automatic check-in/out next time
          </p>
          <div class="flex gap-3 justify-center">
            <a href="/guest" class="btn btn-primary">
              <i class="fas fa-redo"></i>
              Test Auto Feature
            </a>
            <a href="/" class="btn btn-secondary">
              <i class="fas fa-home"></i>
              Home
            </a>
          </div>
        </div>
      </div>
    `));
  } catch (err) {
    console.error("Database insert error:", err);
    res.send(UI.templates.base("Error", `
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="card p-8 max-w-md w-full mx-4 text-center">
          <div class="text-red-500 text-6xl mb-4">❌</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-4">Check-in Failed</h1>
          <p class="text-gray-600 mb-6">There was an error checking you in. Please try again.</p>
          <a href="/guest" class="btn btn-primary">Try Again</a>
        </div>
      </div>
    `));
  }
});

// ---------------- QUICK GATE ROUTE ----------------
app.get("/gate", async (req, res) => {
  const visitorId = req.cookies.visitorId;

  if (!visitorId) {
    return res.redirect("/guest");
  }

  // Redirect to guest route which handles the logic
  res.redirect("/guest");
});

// ---------------- ADMIN LOGIN ----------------
app.get("/admin-login", (req, res) => {
  res.send(UI.templates.base("Admin Login", `
    <div class="min-h-screen flex items-center justify-center py-12">
      <div class="card p-8 max-w-md w-full mx-4 animate__animated animate__fadeInUp">
        <div class="text-center mb-8">
          <div class="floating inline-block p-4 rounded-full bg-red-50 mb-4">
            <i class="fas fa-lock text-3xl text-red-600"></i>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p class="text-gray-600">Secure administrator access</p>
        </div>
        
        <form action="/admin-login" method="POST">
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-user mr-2"></i>
              Username
            </label>
            <input type="text" name="username" class="form-input" placeholder="Enter username" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-key mr-2"></i>
              Password
            </label>
            <input type="password" name="password" class="form-input" placeholder="Enter password" required>
          </div>
          
          <button type="submit" class="btn btn-primary w-full text-lg py-4">
            <i class="fas fa-sign-in-alt"></i>
            Sign In
          </button>
        </form>
        
        <div class="text-center mt-6">
          <a href="/" class="text-blue-600 hover:text-blue-800 transition-colors">
            <i class="fas fa-arrow-left mr-2"></i>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  `));
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || '1234';
  
  if (username === adminUser && password === adminPass) {
    const adminToken = Date.now().toString();
    adminSessions.set(adminToken, { username, loginTime: new Date() });
    res.cookie("adminToken", adminToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.redirect("/admin");
  }
  
  res.send(UI.templates.base("Login Failed", `
    <div class="min-h-screen flex items-center justify-center py-12">
      <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__shakeX">
        <div class="text-red-500 text-6xl mb-4">🔒</div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Invalid Credentials</h1>
        <p class="text-gray-600 mb-6">The username or password you entered is incorrect.</p>
        <a href="/admin-login" class="btn btn-primary">
          <i class="fas fa-arrow-left"></i>
          Try Again
        </a>
      </div>
    </div>
  `));
});

// ---------------- ADMIN DASHBOARD ----------------
app.get("/admin", requireAdmin, async (req, res) => {
  const db = await dbPromise;
  
  try {
    const rows = await db.all("SELECT * FROM visitors ORDER BY id DESC");

    const tableRows = rows
      .map(
        (v) => `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap">${v.fullName || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">${v.laptopBrand || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap font-mono text-sm">${v.macAddress || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">${v.eventName || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">${v.checkIn ? new Date(v.checkIn).toLocaleString() : "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">${v.checkOut ? new Date(v.checkOut).toLocaleString() : "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">${v.duration || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-3 py-1 rounded-full text-xs font-medium ${
              v.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }">
              ${v.status || "-"}
            </span>
          </td>
        </tr>`
      )
      .join("");

    res.send(UI.templates.base("Admin Dashboard", `
      <div class="min-h-screen py-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p class="text-white opacity-80">Visitor Management System</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a href="/qr" class="btn btn-primary">
              <i class="fas fa-qrcode"></i>
              Gate QR
            </a>
            <a href="/admin-logout" class="btn btn-secondary">
              <i class="fas fa-sign-out-alt"></i>
              Logout
            </a>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="glass-card p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-80">Total Visitors</p>
                <p class="text-3xl font-bold">${rows.length}</p>
              </div>
              <i class="fas fa-users text-2xl opacity-60"></i>
            </div>
          </div>
          <div class="glass-card p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-80">Checked In</p>
                <p class="text-3xl font-bold">${rows.filter(r => r.status === 'IN').length}</p>
              </div>
              <i class="fas fa-sign-in-alt text-2xl opacity-60"></i>
            </div>
          </div>
          <div class="glass-card p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-80">Today's Visitors</p>
                <p class="text-3xl font-bold">${rows.filter(r => {
                  const today = new Date().toDateString();
                  return r.checkIn && new Date(r.checkIn).toDateString() === today;
                }).length}</p>
              </div>
              <i class="fas fa-calendar-day text-2xl opacity-60"></i>
            </div>
          </div>
          <div class="glass-card p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm opacity-80">Active Events</p>
                <p class="text-3xl font-bold">${new Set(rows.map(r => r.eventName)).size}</p>
              </div>
              <i class="fas fa-calendar text-2xl opacity-60"></i>
            </div>
          </div>
        </div>

        <!-- Visitor Table -->
        <div class="card overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900">Visitor Log</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${tableRows || "<tr><td colspan='8' class='px-6 py-4 text-center text-gray-500'>No records yet.</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `));
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.send("❌ Error loading admin dashboard.");
  }
});

// ---------------- GATE QR CODE ----------------
app.get("/qr", async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get('host')}`;
    const gateURL = `${baseURL}/gate`;
    const qrImage = await QRCode.toDataURL(gateURL);
    
    res.send(UI.templates.base("Gate QR", `
      <div class="min-h-screen flex items-center justify-center py-12">
        <div class="card p-8 max-w-md w-full mx-4 text-center animate__animated animate__fadeInUp">
          <div class="floating inline-block p-4 rounded-full bg-blue-50 mb-4">
            <i class="fas fa-qrcode text-3xl text-blue-600"></i>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-4">Gate QR Code</h1>
          
          <div class="mb-6 p-6 bg-gray-50 rounded-lg">
            <img src="${qrImage}" class="w-64 h-64 mx-auto mb-4" alt="QR Code">
            <p class="text-sm text-gray-600 mb-2">Scan with your camera for quick check-in/out</p>
            <a href="${gateURL}" class="text-blue-600 hover:text-blue-800 text-sm break-all">
              ${gateURL}
            </a>
          </div>
          
          <div class="bg-blue-50 p-4 rounded-lg mb-6 text-left">
            <h3 class="font-semibold text-blue-900 mb-2">📱 How to use:</h3>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• <strong>Returning visitors:</strong> Auto check-in/out</li>
              <li>• <strong>First-time visitors:</strong> Redirect to form</li>
              <li>• <strong>No app needed:</strong> Use phone camera</li>
            </ul>
          </div>
          
          <a href="/admin" class="btn btn-primary">
            <i class="fas fa-arrow-left"></i>
            Back to Dashboard
          </a>
        </div>
      </div>
    `));
  } catch (e) {
    console.error(e);
    res.send("❌ Error generating QR");
  }
});

// ---------------- ADMIN LOGOUT ----------------
app.get("/admin-logout", (req, res) => {
  const adminToken = req.cookies.adminToken;
  if (adminToken) {
    adminSessions.delete(adminToken);
  }
  res.clearCookie("adminToken");
  res.redirect("/");
});

// ---------------- START SERVER ----------------
app.listen(port, () => {
  console.log(`🚀 NITDA CheckMe Advanced running on port ${port}`);
  console.log(`✨ Features: Modern UI, Animations, Admin Dashboard, QR Codes`);
});
