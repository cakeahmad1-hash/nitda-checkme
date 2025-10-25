# NITDA CheckMe - Visitor Management System

## Overview
NITDA CheckMe is a visitor management system built with Node.js, Express, and SQLite. It allows visitors to check in/out using a web form, generates QR codes for events, and provides an admin dashboard to track visitor logs.

## Project Architecture
- **Backend**: Node.js with Express
- **Database**: SQLite (visitors.db)
- **Frontend**: HTML/CSS with Font Awesome icons
- **Features**:
  - Visitor check-in/check-out with cookie-based tracking
  - QR code generation for events and gate access
  - Admin dashboard with visitor logs
  - Event management

## Recent Changes
- **2025-10-25**: Initial Replit setup
  - Configured to run on port 5000 (Replit requirement)
  - Added .gitignore for Node.js
  - Moved HTML files to public/ folder
  - Set server to listen on 0.0.0.0

## Tech Stack
- Node.js 20
- Express 4.18.2
- SQLite3 5.1.6
- QRCode 1.5.3
- Cookie-parser 1.4.6

## Admin Access
Default credentials:
- Username: `admin`
- Password: `1234`
