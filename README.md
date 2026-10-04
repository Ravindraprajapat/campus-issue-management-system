# UniFix AI — Smart Campus Infrastructure Management

> An automated, role-based campus maintenance management platform connecting Students, University Admins, and Maintenance Staff through location tracking, Google Gemini AI issue verification, Cloudinary media storage, and live 50-meter GPS resolution verification.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Core Workflows](#core-workflows)
  - [Student Workflow](#student-workflow)
  - [Maintenance Staff Workflow](#maintenance-staff-workflow)
  - [Admin Workflow](#admin-workflow)
- [AI Image Verification & Fail-Closed Gate](#ai-image-verification--fail-closed-gate)
- [Building & Room Location Architecture](#building--room-location-architecture)
- [Live GPS Proximity Resolution Gate (50-Meter Rule)](#live-gps-proximity-resolution-gate-50-meter-rule)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [API Reference](#api-reference)
- [Security & Authentication](#security--authentication)
- [Local Development Setup](#local-development-setup)

---

## Project Overview

The **Parul University College Issue Registration & Maintenance Management System** provides a single automated workflow for managing campus infrastructure issues (classroom fans, lights, projectors, electrical sockets, benches, chairs, doors, windows, AC units, water leakages, washrooms, cleanliness, Wi-Fi/network equipment, etc.).

### System Capabilities:
1. **Student Reporting**: Students report campus issues with photo evidence, optional description, and building/room location.
2. **AI Visual Verification**: Google Gemini AI verifies uploaded photos to establish valid visual evidence of campus infrastructure issues before submission.
3. **Fail-Closed Backend Gate**: Invalid images (selfies, memes, posters, screenshots, text documents, unrelated images) are rejected at the Express backend level (`isValid === true`, `confidence >= 0.75`).
4. **Building & Room Selection**: Supports building location identification with manual Building and Room dropdown fallback. Student manual selection remains authoritative.
5. **Maintenance Dispatch**: Issues are assigned to Maintenance Staff according to university building locations.
6. **50-Meter Live GPS Resolution Gate**: Maintenance Staff must capture live high-accuracy GPS coordinates within 50 meters of the reported issue before marking it `RESOLVED`.
7. **Role-Based Authentication**: JWT cookie auth for all roles. Google OAuth is strictly restricted to Student accounts.

---

## Core Workflows

### 👤 Student Workflow
- **Issue Reporting Flow**:
  1. Open **Report an Issue**.
  2. Upload photo of the campus infrastructure problem.
  3. Get Location & Building Auto-Detect attempt.
  4. Select/verify **Building** from dropdown.
  5. Select/specify **Classroom / Room Number**.
  6. Add optional description.
  7. Submit issue.
- **Track Status**: Monitor reported issue status (`PENDING` → `IN_PROGRESS` → `RESOLVED`), priority level, building/room details, and image.
- **Campus Map**: Visualize reported campus issues on Leaflet map.

### 👷 Maintenance Staff Workflow
- **Assigned Building Issues**: View issues assigned to their university building.
- **Status Progression**: Transition issue status (`PENDING` → `IN_PROGRESS` → `RESOLVED`).
- **Live Location Verification**:
  1. Click status `RESOLVED` to open Resolution Modal.
  2. Click `GET LIVE LOCATION` (`enableHighAccuracy: true`, `maximumAge: 0`).
  3. Distance check vs reported issue coordinates using Haversine formula.
  4. If `distance <= 50 meters`, enables final `RESOLVE COMPLAINT` button.
  5. Click final button to resolve. Backend independently validates distance <= 50m.

### 👑 Admin Workflow
- **Maintenance Dashboard**: View all university issues grouped by building and room.
- **Filtering**: Filter issues by Building, Room/Classroom, Issue Type, Status, and Severity.
- **Staff Assignment**: Assign Maintenance Staff to University Buildings.

---

## AI Image Verification & Fail-Closed Gate

Google Gemini AI evaluates uploaded photos based **ONLY on visible visual evidence**:
- **Supported Issue Types**: `FAN`, `LIGHT`, `PROJECTOR`, `PLUG_SOCKET`, `BENCH`, `CHAIR`, `DOOR`, `WINDOW`, `AC`, `WATER_LEAK`, `WASHROOM`, `CLEANLINESS`, `WIFI_NETWORK`, `ELECTRICAL`, `OTHER`.
- **Supported Campus Contexts**: `CLASSROOM`, `LAB`, `CORRIDOR`, `WASHROOM`, `OFFICE`, `CANTEEN`, `LIBRARY`, `CAMPUS_AREA`, `OTHER`, `UNKNOWN`.
- **Rejection Criteria**: Selfies, personal photos, memes, text documents, posters, screenshots, or unrelated items without visual evidence of college infrastructure problems.
- **Backend Fail-Closed Gate**:
  ```javascript
  const isCollegeValid =
    parsed.isValid === true &&
    parsed.collegeContext !== 'UNKNOWN' &&
    Number(parsed.confidence) >= 0.75;
  ```
  - Rejection returns **HTTP 400 Bad Request** before Cloudinary storage or MongoDB insertion.

---

## Building & Room Location Architecture

```
Student GPS
    ↓
Attempt Building Detection (against verified campus config)
    ├── Building Found → Pre-select Building
    └── Building Not Found / GPS Failed → Manual Building Selection
    ↓
Is Verified Room-Level Mapping Available?
    ├── YES → Attempt Room Detection
    └── NO → Manual Room/Classroom Selection
```
- **Authoritative Manual Selection**: Manual user selections for Building and Room are protected and never overwritten by subsequent GPS updates.

---

## Live GPS Proximity Resolution Gate (50-Meter Rule)

Maintenance staff resolution is protected by a 50-meter live GPS verification rule:
- **`MAX_RESOLUTION_DISTANCE_METERS = 50`**
- Fresh device location captured (`maximumAge: 0`, `enableHighAccuracy: true`).
- Distance calculated via Haversine formula.
- Backend re-calculates distance independently before marking status as `RESOLVED`.
- Getting location does **not** automatically resolve; explicit button click is required.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (v19), Tailwind CSS, Framer Motion, Lucide React, Redux Toolkit |
| **Maps** | React-Leaflet, Leaflet, OpenStreetMap |
| **Backend** | Node.js, Express.js (REST API) |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT (HTTP-Only Cookie), Firebase Auth (Google OAuth - Student Only) |
| **Artificial Intelligence** | Google Gemini AI (`gemini-2.5-flash`) |
| **Media Storage** | Cloudinary SDK |
| **Notifications** | Twilio (SMS / WhatsApp), Nodemailer (Email) |

---

## API Reference

### Student Endpoints
- `POST /report/report-submit/report` — Submit a college issue report (image, location, building, room, description).
- `GET /report/report-submit/reports` — Get logged-in student's reported issues.

### Maintenance & Admin Endpoints
- `GET /api/admin/reports` — Admin: Get all university reports.
- `GET /api/admin/building-summary` — Admin: Get building summary & issue counts.
- `POST /api/admin/building-officer` — Admin: Assign maintenance staff to building.
- `GET /api/admin/officer/reports` — Staff: Get assigned building reports.
- `PATCH /api/admin/officer/reports/:id/status` — Staff/Admin: Update report status (enforces 50m live GPS check for `RESOLVED`).

---

## Security & Authentication

- **JWT Cookies**: Authentication uses HTTP-Only cookies.
- **Google OAuth**: Restricted strictly to Student accounts (`role: 'user'`). Admin and Staff accounts cannot be created or logged in via Google Auth.
- **Fail-Closed AI Gate**: Unverified or invalid photos are purged immediately from disk.

---

## Local Development Setup

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
