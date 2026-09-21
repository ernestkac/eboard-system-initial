# ADMARC Limited - Executive Board Management System (eBoard) Backend REST API

A production-grade, secure, and normalized backend RESTful API built for **ADMARC Limited** to manage executive board governance, member directories, meetings, agendas, minutes, motions, voting procedures, documents, and corporate announcements.

Developed based strictly on the **ADMARC Limited Functional Requirements Specification (FRS) Document v1.0 (September 2026)**.

---

## Table of Contents

1. [Architecture & Project Structure](#architecture--project-structure)
2. [Technology Stack](#technology-stack)
3. [User Roles and Permissions Matrix](#user-roles-and-permissions-matrix)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup & Schema](#database-setup--schema)
6. [Installation & Running](#installation--running)
7. [API Endpoints Reference](#api-endpoints-reference)
   - [Authentication & Users](#1-authentication--users-apiauth)
   - [Member & Officer Directory](#2-member-and-officer-directory-apimembers)
   - [Meetings, Agendas & Minutes](#3-meetings-agendas-and-minutes-apimeetings--apiagenda-items)
   - [Motions & Voting Engine](#4-motions-and-voting-engine-apimotions--apivotes)
   - [Announcements & Document Library](#5-announcements--document-library-apiannouncements--apidocuments)
   - [Audit Logs](#6-audit-trail-apiaudit-logs)
8. [Example Requests and Responses](#example-requests-and-responses)
9. [Automated Testing](#automated-testing)
10. [Implementation Assumptions](#implementation-assumptions)

---

## Architecture & Project Structure

The project implements a clean multi-tiered architecture with strict separation of concerns:

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection pool (mysql2/promise) & fallback handling
│   ├── controllers/
│   │   ├── authController.js        # Authentication & user provisioning
│   │   ├── memberController.js      # Member directory operations
│   │   ├── meetingController.js     # Meeting schedules, cancellation & minutes
│   │   ├── agendaItemController.js  # Agenda topics & transactional reordering
│   │   ├── motionController.js      # Motions proposal, closing & withdrawal
│   │   ├── voteController.js        # Live voting, ballot upsert & tallies
│   │   ├── announcementController.js# Corporate announcements
│   │   ├── documentController.js    # Policy/document references & categories
│   │   └── auditController.js       # System governance audit trail
│   ├── models/
│   │   ├── userModel.js
│   │   ├── memberModel.js
│   │   ├── meetingModel.js
│   │   ├── agendaItemModel.js
│   │   ├── motionModel.js
│   │   ├── voteModel.js
│   │   ├── announcementModel.js
│   │   ├── documentModel.js
│   │   └── auditModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── memberRoutes.js
│   │   ├── meetingRoutes.js
│   │   ├── agendaItemRoutes.js
│   │   ├── motionRoutes.js
│   │   ├── voteRoutes.js
│   │   ├── announcementRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── auditRoutes.js
│   │   └── index.js                 # Central route aggregator & healthcheck
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT token verification
│   │   ├── roleMiddleware.js        # Role-based authorization (ADMINISTRATOR, OFFICER, MEMBER)
│   │   ├── validateMiddleware.js    # Data validation (required, regex, enum, date, ID)
│   │   └── errorHandler.js          # Centralized error handler & sanitization
│   ├── services/
│   │   ├── authService.js
│   │   ├── memberService.js
│   │   ├── meetingService.js
│   │   ├── motionService.js
│   │   ├── votingService.js
│   │   ├── announcementService.js
│   │   ├── documentService.js
│   │   └── auditService.js
│   ├── utils/
│   │   ├── responseHandler.js       # Uniform JSON response structure
│   │   └── logger.js                # Timestamped logging utility
│   ├── app.js                       # Express app configuration & middleware
│   └── server.js                    # Server startup & graceful shutdown
├── database/
│   ├── schema.sql                   # MySQL 8.0+ DDL with InnoDB constraints
│   └── seeds.sql                    # Initial seed data with ADMARC accounts
├── tests/
│   └── businessRules.test.js        # Automated business logic & voting rule tests
├── .env.example
├── package.json
└── README.md
```

---

## Technology Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (v4.x)
- **Database:** MySQL (InnoDB engine, utf8mb4 collation)
- **Driver:** `mysql2/promise` with connection pooling
- **Security:** `bcryptjs` (password hashing with salt), `jsonwebtoken` (JWT bearer auth), `cors`
- **Environment Management:** `dotenv`
- **Architecture:** RESTful API with standardized JSON format

---

## User Roles and Permissions Matrix

As specified in FRS Section 2.2:

| Role | Description | Key Permissions |
| :--- | :--- | :--- |
| **ADMINISTRATOR** | Manages system configuration and member directory. | Full access to all modules, including record deletion, member CRUD, user provisioning, audit inspection, and modifying locked records. |
| **OFFICER** | Holds a board position (e.g., Board Chairperson, CEO, Corporate Secretary, Treasurer). | Create/edit meetings, publish agendas, record/publish minutes, propose motions, configure voter pools, close/withdraw motions, cast votes, create announcements, create document entries. |
| **MEMBER** | General organization member without an executive board role. | View directory, view past meetings chronologically, view agendas and minutes, view motions and live/final tallies, view announcements, search documents. Cannot vote unless explicitly included in custom voter pools. |

> **Backend Enforcement:** Permissions are enforced entirely in server-side middleware (`requireRole`, `requireAdmin`, `requireOfficerOrAdmin`). The frontend cannot bypass authorization.

---

## Environment Configuration

Copy `.env.example` to `.env` in the backend directory:

```bash
cp .env.example .env
```

Edit `.env` with your deployment variables:

```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=eboard_user
DB_PASSWORD=your_secure_db_password
DB_NAME=admarc_eboard

# Authentication Secrets
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Optional CORS Origin
CORS_ORIGIN=*
```

---

## Database Setup & Schema

1. Log into your MySQL instance:
   ```bash
   mysql -u root -p
   ```
2. Create database and user:
   ```sql
   CREATE DATABASE admarc_eboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'eboard_user'@'localhost' IDENTIFIED BY 'your_secure_db_password';
   GRANT ALL PRIVILEGES ON admarc_eboard.* TO 'eboard_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Execute the schema:
   ```bash
   mysql -u eboard_user -p admarc_eboard < database/schema.sql
   ```
4. Optional: Import seed accounts and demo governance data:
   ```bash
   mysql -u eboard_user -p admarc_eboard < database/seeds.sql
   ```

### Default Seed Accounts (Password: `Password123!`)
- **Administrator:** `admin@admarc.mw`
- **Board Chairperson (Officer):** `chairperson@admarc.mw`
- **CEO (Officer):** `ceo@admarc.mw`
- **Corporate Secretary (Officer):** `secretary@admarc.mw`
- **General Board Member:** `member1@admarc.mw`

---

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Start Production Server
```bash
npm start
```

### 4. Health Check
```bash
curl http://localhost:3000/api/health
```

---

## API Endpoints Reference

All requests and responses use `application/json`. Authenticated routes require `Authorization: Bearer <jwt_token>`.

### 1. Authentication & Users (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate email and password; returns JWT token and profile. |
| `GET` | `/api/auth/me` | Authenticated | Return profile of current authenticated user. |
| `POST` | `/api/auth/users` | Admin | Provision a new user account (Public self-registration is disabled). |
| `GET` | `/api/auth/users` | Admin | List system user accounts. |

### 2. Member and Officer Directory (`/api/members`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/members` | Any Member | List members with search and filter (`?search=`, `?name=`, `?role=`, `?committee=`). |
| `GET` | `/api/members/:id` | Any Member | Get member details by ID with role and committee. |
| `GET` | `/api/members/:id/role-history` | Any Member | Retrieve timestamped role and committee progression history (FR-1.7). |
| `POST` | `/api/members` | Admin | Add new member. Rejects duplicate emails with 409 (FR-1.1, FR-1.6). |
| `PUT` | `/api/members/:id` | Admin | Edit member. Automatically logs role/committee change to history. |
| `DELETE` | `/api/members/:id` | Admin | Remove member record. |

### 3. Meetings, Agendas and Minutes (`/api/meetings` & `/api/agenda-items`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/meetings` | Any Member | View past and upcoming meetings chronologically (FR-2.4). |
| `GET` | `/api/meetings/:id` | Any Member | Get meeting details including agendas, linked motions, and attachments. |
| `POST` | `/api/meetings` | Officer/Admin | Create meeting record with title, date, location (FR-2.1). |
| `PUT` | `/api/meetings/:id` | Officer/Admin | Edit meeting record. |
| `POST` | `/api/meetings/:id/cancel`| Officer/Admin | Mark meeting as cancelled with reason without deleting (FR-2.6). |
| `POST` | `/api/meetings/:id/minutes`| Officer/Admin | Record/publish minutes. Published minutes locked from non-admin edit. |
| `DELETE` | `/api/meetings/:id` | Admin | Hard delete meeting record. |
| `POST` | `/api/agenda-items` | Officer/Admin | Add agenda item to meeting (FR-2.2). |
| `PUT` | `/api/agenda-items/:id` | Officer/Admin | Edit agenda item. |
| `POST` | `/api/agenda-items/reorder` | Officer/Admin | Transactionally reorder agenda items within a meeting (FR-2.2). |
| `DELETE` | `/api/agenda-items/:id` | Officer/Admin | Delete agenda item. |

### 4. Motions and Voting Engine (`/api/motions` & `/api/votes`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/motions` | Any Member | List motions with filters (`?meetingId=`, `?status=`, `?result=`). |
| `GET` | `/api/motions/:id` | Any Member | Motion details, live tally, user eligibility, and voter status. |
| `POST` | `/api/motions` | Officer/Admin | Create motion with voter pool and threshold (`simple_majority`, `two_thirds`, `percentage`). |
| `POST` | `/api/motions/:id/close` | Officer/Admin | Close motion, calculate passed/failed outcome, lock votes (FR-3.5, FR-3.6). |
| `POST` | `/api/motions/:id/withdraw`| Officer/Admin | Withdraw motion before it closes (FR-3.8). |
| `POST` | `/api/votes` | Eligible Voter | Cast vote (`FOR`, `AGAINST`, `ABSTAIN`). Allows vote change while open. |
| `GET` | `/api/votes/motion/:motionId/tally` | Any Member | Retrieve live vote tally (FR-3.4). |
| `GET` | `/api/votes/motion/:motionId/my-vote` | Any Member | View authenticated user's currently cast vote. |
| `GET` | `/api/votes/motion/:motionId` | Any Member | Permanent read-only individual vote audit record (FR-3.7). |

### 5. Announcements & Document Library (`/api/announcements` & `/api/documents`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Any Member | List announcements in reverse chronological order (FR-4.3). |
| `POST` | `/api/announcements` | Officer/Admin | Post announcement with title, body, date (FR-4.1). |
| `PUT` | `/api/announcements/:id`| Officer/Admin | Edit announcement (FR-4.5). |
| `DELETE` | `/api/announcements/:id`| Officer/Admin | Remove announcement. |
| `GET` | `/api/documents` | Any Member | Browse and search documents by title and category (FR-4.4, FR-4.6). |
| `POST` | `/api/documents` | Officer/Admin | Add document entry with link or reference (FR-4.2). |
| `PUT` | `/api/documents/:id` | Officer/Admin | Edit document entry. |
| `DELETE` | `/api/documents/:id` | Officer/Admin | Remove document entry. |

### 6. Audit Trail (`/api/audit-logs`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | Admin | Query immutable audit logs filtered by entity, user, and record ID. |

---

## Example Requests and Responses

### 1. Authentication (`POST /api/auth/login`)

**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "chairperson@admarc.mw",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "email": "chairperson@admarc.mw",
      "role": "OFFICER",
      "status": "active",
      "memberId": 2,
      "memberName": "Dr. Patrick Banda",
      "committee": "Executive Committee"
    }
  }
}
```

### 2. Casting a Vote (`POST /api/votes`)

**Request:**
```http
POST /api/votes HTTP/1.1
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "motionId": 1,
  "voteChoice": "FOR"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vote cast successfully as FOR",
  "data": {
    "voteChoice": "FOR",
    "isUpdated": false,
    "liveTally": {
      "forVotes": 1,
      "againstVotes": 0,
      "abstainVotes": 0,
      "totalVotes": 1
    }
  }
}
```

### 3. Closing a Motion (`POST /api/motions/1/close`)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Motion closed successfully with result: passed",
  "data": {
    "id": 1,
    "title": "Approval of 2026/2027 Strategic Grain Purchase Facility",
    "status": "closed",
    "result": "passed",
    "threshold_type": "simple_majority",
    "for_votes": 3,
    "against_votes": 0,
    "abstain_votes": 0,
    "total_votes": 3,
    "closed_at": "2026-09-21T11:45:00.000Z"
  }
}
```

### 4. Error Handling: Preventing Votes on Closed Motion (`POST /api/votes`)

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Cannot cast vote: This motion is currently 'closed'. Votes are only accepted while the motion is open.",
  "error": "MOTION_NOT_OPEN"
}
```

---

## Automated Testing

Run the critical business rules test suite:

```bash
npm test
```

The test runner validates:
1. Member record creation and field enforcement.
2. Duplicate member email prevention (rejection with 409).
3. Meeting creation, status lifecycle, and non-destructive cancellation.
4. Motion creation with defined eligible voter pools.
5. Voting with FOR, AGAINST, ABSTAIN choices.
6. Preventing duplicate votes and blocking ineligible voters.
7. Changing votes while a motion remains open without creating duplicate rows.
8. Automatically closing motions and calculating outcomes for simple majority and supermajority.
9. Strictly preventing votes after a motion is closed or withdrawn.
10. Role-based authorization rules (Administrators, Officers, Members).

---

## Implementation Assumptions

Where the FRS was silent or open to interpretation, the following sound technical assumptions were adopted and documented:

1. **User Identity vs. Member Directory:**
   - A `users` table handles system login authentication, credentials (bcrypt hashes), and RBAC system roles (`ADMINISTRATOR`, `OFFICER`, `MEMBER`).
   - A `members` table stores organizational executive profiles (`name`, `email`, `role`, `committee`, `join_date`).
   - Members are optionally linked 1-to-1 to users.
2. **Public Self-Registration:**
   - Per FRS Section 2.3 ("Users are assumed to already belong to ADMARC Limited therefore public self-registration is not in scope"), user accounts are provisioned by an `ADMINISTRATOR` via `POST /api/auth/users`.
3. **Voting Threshold Formulas:**
   - `simple_majority`: Passed if `FOR > AGAINST` among decided votes.
   - `two_thirds`: Passed if `FOR >= (2/3) * (FOR + AGAINST)` among decided votes.
   - `percentage`: Passed if `(FOR / (FOR + AGAINST)) * 100 >= threshold_percentage`.
   - In accordance with standard parliamentary rules (Robert's Rules of Order), `ABSTAIN` counts toward participation and quorum but is not counted as a negative vote.
4. **Permanent Audit & Preserved Minutes:**
   - Meetings with `minutes_status = 'published'` cannot be modified by non-administrators.
   - Motions with `status = 'closed'` cannot be modified or voted on.
   - Cancellations do not delete meeting rows or linked agendas.
5. **Document Library:**
   - Per FRS Section 3.4 & 4.2 ("Store link/reference. Do not introduce a complex file-storage system unless it is necessary"), documents store direct URLs or resource references (`link_or_reference`) with metadata and optional meeting links.
