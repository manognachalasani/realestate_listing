# Software Specification
## Module 1: Admin Backend · Module 2: JSP Property Brochure

**Project:** EstateHub — Real Estate Listing Platform  
**Authors:** Real Estate Listing Team  
**Date:** 2026-05-05  
**Version:** 1.0

---

## Table of Contents

1. [Admin Backend Module](#1-admin-backend-module)
   1. [Purpose & Scope](#11-purpose--scope)
   2. [System Position](#12-system-position)
   3. [Technology & Dependencies](#13-technology--dependencies)
   4. [Data Models](#14-data-models)
   5. [Authentication & Authorisation](#15-authentication--authorisation)
   6. [Rate Limiting](#16-rate-limiting)
   7. [API Specification](#17-api-specification)
   8. [Business Logic & Rules](#18-business-logic--rules)
   9. [Audit Trail](#19-audit-trail)
   10. [Email Notifications](#110-email-notifications)
   11. [Error Handling](#111-error-handling)
   12. [File Structure](#112-file-structure)

2. [JSP Property Brochure Module](#2-jsp-property-brochure-module)
   1. [Purpose & Scope](#21-purpose--scope)
   2. [System Position](#22-system-position)
   3. [Technology & Dependencies](#23-technology--dependencies)
   4. [Project Structure](#24-project-structure)
   5. [Data Model — PropertyData](#25-data-model--propertydata)
   6. [Components](#26-components)
   7. [Request Flows](#27-request-flows)
   8. [HTML Brochure View](#28-html-brochure-view)
   9. [PDF Brochure — Layout Specification](#29-pdf-brochure--layout-specification)
   10. [Error Handling](#210-error-handling)
   11. [Deployment Configuration](#211-deployment-configuration)
   12. [Running the Service](#212-running-the-service)

---

# 1. Admin Backend Module

## 1.1 Purpose & Scope

The Admin Backend module provides a restricted API layer for platform administrators to oversee and manage all content, users, and activity on the EstateHub platform. It operates entirely server-side within the existing Node.js/Express application and exposes a set of protected endpoints under the `/api/admin` prefix.

**In scope:**
- Platform-wide analytics and a summary dashboard
- Full user management: listing, inspecting, activating, deactivating, role-changing, and deleting accounts
- Property moderation: viewing all listings regardless of status, overriding listing status, and hard-deleting listings with associated asset cleanup
- Agent licence verification: approving and revoking verified status with automated email notification
- Enquiry oversight: viewing all platform enquiries and removing spam or abusive submissions
- Immutable audit trail: every destructive or sensitive action is recorded with actor, target, detail, and IP address

**Out of scope:**
- Frontend admin dashboard UI (consumed by a separate React admin panel)
- Authentication for admin accounts (handled by the shared `authController` and `auth.js` middleware)
- Platform configuration or feature flag management

---

## 1.2 System Position

```
React Admin Panel
      │
      │  HTTP (JWT in Authorization header)
      ▼
┌─────────────────────────────────────────────┐
│              Express Application             │
│                                             │
│  /api/admin/*  ←  adminRoutes.js            │
│         │                                   │
│         ▼                                   │
│  protect + requireRole('admin')  ← auth.js  │
│         │                                   │
│         ▼                                   │
│  adminController.js                         │
│         │                                   │
│         ├── User model  (MongoDB)           │
│         ├── Property model  (MongoDB)       │
│         ├── Enquiry model  (MongoDB)        │
│         ├── AuditLog model  (MongoDB)       │
│         ├── Cloudinary (asset deletion)     │
│         └── emailService (notifications)   │
└─────────────────────────────────────────────┘
```

The admin module does not introduce a separate process or service. It is an additional route group registered on the same Express app as the public API, differentiated entirely by its middleware chain.

---

## 1.3 Technology & Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| Express | ^4.18 | HTTP framework |
| Mongoose | ^7.3 | MongoDB ODM |
| express-async-handler | ^1.2 | Async error propagation |
| express-rate-limit | ^6.7 | Per-group request throttling |
| jsonwebtoken | ^9.0 | Token verification (via `auth.js`) |
| Cloudinary SDK | ^1.41 | Remote asset deletion on property hard-delete |
| Nodemailer | ^6.9 | Agent verification email delivery |

No new npm packages are required. All dependencies are already present in `backend/package.json`.

---

## 1.4 Data Models

### 1.4.1 AuditLog (new model)

**File:** `backend/models/AuditLog.js`

Every admin mutation writes one AuditLog document. Reads are never blocked by a failed audit write — writes are fire-and-forget (`.catch` logs the error; the original operation is unaffected).

#### Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `adminId` | ObjectId → User | Yes | The admin account that triggered the action |
| `action` | String (enum) | Yes | The type of action performed |
| `targetType` | String (enum) | Yes | The collection the target document belongs to |
| `targetId` | ObjectId | Yes | The `_id` of the affected document |
| `details` | Mixed | No | Contextual snapshot, e.g. `{ from: 'buyer', to: 'agent' }` |
| `ip` | String | No | `req.ip` captured at request time |
| `createdAt` | Date | Auto | Set by Mongoose `timestamps: true` |
| `updatedAt` | Date | Auto | Set by Mongoose `timestamps: true` |

#### `action` Enum

| Value | Written by |
|---|---|
| `activate_user` | `toggleUserStatus` — when user was previously inactive |
| `deactivate_user` | `toggleUserStatus` — when user was previously active |
| `change_role` | `changeUserRole` |
| `delete_user` | `deleteUser` |
| `override_property_status` | `overridePropertyStatus` |
| `delete_property` | `deletePropertyAdmin` |
| `verify_agent` | `verifyAgent` |
| `unverify_agent` | `unverifyAgent` |
| `delete_enquiry` | `deleteEnquiryAdmin` |

#### `targetType` Enum

`'User'`, `'Property'`, `'Enquiry'`

#### Indexes

| Index | Direction | Rationale |
|---|---|---|
| `{ adminId, createdAt }` | `1, -1` | Filter log by admin, newest first |
| `{ targetType, targetId }` | `1, 1` | Look up all actions on a specific document |
| `{ action }` | `1` | Filter by action type |
| `{ createdAt }` | `-1` | Global time-ordered audit view |

---

### 1.4.2 User (existing model, unchanged)

Relevant fields referenced by the admin module:

| Field | Type | Notes |
|---|---|---|
| `role` | `'buyer' \| 'agent' \| 'admin'` | Gating field for admin route access |
| `isActive` | Boolean | Toggled by `toggleUserStatus` |
| `agentProfile.verified` | Boolean | Toggled by `verifyAgent` / `unverifyAgent` |
| `savedProperties` | ObjectId[] | Not modified by admin operations |

---

### 1.4.3 Property (existing model, unchanged)

Relevant fields referenced by the admin module:

| Field | Type | Notes |
|---|---|---|
| `status` | `'active' \| 'pending' \| 'sold' \| 'rented' \| 'withdrawn'` | Overridden by `overridePropertyStatus` |
| `soldAt` | Date | Set when status is forced to `sold` or `rented` |
| `photos[].publicId` | String | Used to delete Cloudinary assets on hard-delete |
| `floorPlanPublicId` | String | Used to delete Cloudinary asset on hard-delete |
| `agent` | ObjectId → User | Set to `'withdrawn'` on user deletion via cascade |

---

### 1.4.4 Enquiry (existing model, unchanged)

Relevant fields referenced by the admin module:

| Field | Type | Notes |
|---|---|---|
| `status` | `'new' \| 'read' \| 'replied' \| 'closed'` | Filterable in the admin list view |
| `senderEmail` | String | Captured in AuditLog `details` on deletion |
| `agent` | ObjectId → User | Used for filtering and cascade deletion |
| `buyer` | ObjectId → User | Used for cascade deletion when user is deleted |
| `property` | ObjectId → Property | Used for filtering and cascade deletion |

---

## 1.5 Authentication & Authorisation

All admin routes are protected by two middleware functions applied in `adminRoutes.js` before any handler executes:

```
protect  →  requireRole('admin')  →  handler
```

**`protect`** (`auth.js`):
- Extracts the JWT from the `Authorization: Bearer <token>` header.
- Verifies the token against `JWT_SECRET`.
- Rejects with `401` if the token is missing, malformed, expired, or belongs to an inactive user.
- Rejects with `401` if the user's password changed after the token was issued.
- Sets `req.user` to the full User document (password field excluded).

**`requireRole('admin')`** (`auth.js`):
- Checks `req.user.role === 'admin'`.
- Rejects with `403` if the role does not match.

There is no separate admin session or token type. Admin accounts use the same JWT flow as all other users, differentiated only by the `role` field.

---

## 1.6 Rate Limiting

A dedicated `express-rate-limit` instance is applied to all `/api/admin/*` routes before the auth middleware:

| Setting | Value |
|---|---|
| Window | 15 minutes |
| Max requests | 60 |
| Response on breach | `{ "error": "Too many admin requests, please slow down." }` |

This is stricter than the global API limiter (200 req / 15 min) to reduce the blast radius of a compromised admin token.

---

## 1.7 API Specification

**Base path:** `/api/admin`  
**Content-Type:** `application/json`  
**Authentication:** `Authorization: Bearer <jwt>` (role must be `admin`)

All list endpoints follow a consistent pagination envelope:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 154,
    "pages": 8
  }
}
```

Pagination defaults: `page=1`, `limit=20`. Maximum `limit` is clamped to `100`.

---

### Dashboard & Analytics

#### `GET /api/admin/dashboard`

Returns a single-query aggregate of platform-wide health metrics. Uses MongoDB `$facet` to compute all figures in one round trip.

**Response body:**

```json
{
  "users": {
    "total": 120,
    "active": 115,
    "inactive": 5,
    "byRole": { "buyer": 90, "agent": 28, "admin": 2 },
    "newLast30d": 14
  },
  "properties": {
    "total": 340,
    "byStatus": {
      "active": 290,
      "pending": 20,
      "sold": 25,
      "rented": 0,
      "withdrawn": 5
    },
    "avgPrice": 485000
  },
  "enquiries": {
    "total": 870,
    "byStatus": {
      "new": 45,
      "read": 120,
      "replied": 600,
      "closed": 105
    }
  },
  "revenue": {
    "totalCents": 0,
    "last30dCents": 0
  }
}
```

---

#### `GET /api/admin/analytics/properties`

Listing volume over time, top cities by listing count, and average price by property type. All figures are computed via MongoDB aggregation pipelines.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | `week` \| `month` | `month` | Groups results by ISO week (`%Y-%U`) or calendar month (`%Y-%m`) |

**Response body:**

```json
{
  "overTime": [
    { "_id": "2025-11", "count": 42 },
    { "_id": "2025-12", "count": 61 }
  ],
  "topCities": [
    { "_id": "Austin", "count": 38, "avgPrice": 520000 },
    { "_id": "Dallas", "count": 29, "avgPrice": 410000 }
  ],
  "avgByType": [
    { "_id": "house", "avgPrice": 610000, "count": 180 },
    { "_id": "apartment", "avgPrice": 280000, "count": 95 }
  ]
}
```

Results are limited to 24 time buckets and the top 10 cities.

---

#### `GET /api/admin/analytics/users`

User registration volume over time, broken down by role. Supports the same `period` parameter as property analytics.

**Response body:**

```json
{
  "overTime": [
    { "_id": { "period": "2025-11", "role": "buyer" }, "count": 18 },
    { "_id": { "period": "2025-11", "role": "agent" }, "count": 4 }
  ],
  "byRole": [
    { "_id": "buyer", "count": 90 },
    { "_id": "agent", "count": 28 },
    { "_id": "admin", "count": 2 }
  ]
}
```

---

### User Management

#### `GET /api/admin/users`

Returns a paginated list of all users across all roles. Supports free-text search and filtering.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `role` | `buyer` \| `agent` \| `admin` | — | Filter by role |
| `isActive` | `true` \| `false` | — | Filter by account status |
| `search` | String | — | Case-insensitive regex on `firstName`, `lastName`, `email` |
| `sort` | String | `createdAt` | Field to sort by |
| `order` | `asc` \| `desc` | `desc` | Sort direction |
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `20` | Page size (max 100) |

Password and token fields are excluded from the response.

---

#### `GET /api/admin/users/:id`

Returns a single user document enriched with computed counts.

**Response body includes:**

| Field | Description |
|---|---|
| `user` | Full User document (password excluded) |
| `listingCount` | Number of Property documents where `agent === user._id` |
| `enquiryCount` | Number of Enquiry documents where user is `agent` or `buyer` |

**Errors:**

| Code | Condition |
|---|---|
| `404` | No user found with the given `_id` |

---

#### `PATCH /api/admin/users/:id/status`

Toggles the `isActive` field on a user account. A single endpoint handles both activation and deactivation — it reads the current state and flips it.

**Request body:** None required.

**Response body:**

```json
{ "isActive": false, "message": "User deactivated" }
```

**Errors:**

| Code | Condition |
|---|---|
| `400` | Admin attempts to toggle their own account |
| `404` | No user found with the given `_id` |

**Side effects:**
- Writes `activate_user` or `deactivate_user` to AuditLog.
- A deactivated user's JWT is rejected on next request by the `protect` middleware (which checks `isActive`).

---

#### `PATCH /api/admin/users/:id/role`

Changes a user's role to `buyer`, `agent`, or `admin`.

**Request body:**

```json
{ "role": "agent" }
```

**Response body:**

```json
{ "role": "agent", "message": "Role changed from buyer to agent" }
```

**Errors:**

| Code | Condition |
|---|---|
| `400` | Admin attempts to change their own role |
| `400` | `role` value is not one of `buyer`, `agent`, `admin` |
| `404` | No user found with the given `_id` |

**Side effects:**
- Writes `change_role` to AuditLog with `details: { from: "buyer", to: "agent" }`.

---

#### `DELETE /api/admin/users/:id`

Permanently deletes a user account. Cascade behaviour runs in parallel before deletion.

**Cascade steps (run in parallel):**

1. `Property.updateMany({ agent: userId }, { status: 'withdrawn' })` — all the user's listings are withdrawn rather than deleted, preserving historical record.
2. `Enquiry.deleteMany({ $or: [{ agent: userId }, { buyer: userId }] })` — removes all enquiries where the user appears as either party.

**Response body:**

```json
{ "message": "User deleted. Their listings have been withdrawn." }
```

**Errors:**

| Code | Condition |
|---|---|
| `400` | Admin attempts to delete their own account |
| `404` | No user found with the given `_id` |

**Side effects:**
- Writes `delete_user` to AuditLog with `details: { email, role }`.

---

### Property Moderation

#### `GET /api/admin/properties`

Returns a paginated list of all property listings across **all statuses**. The public `GET /api/properties` endpoint filters to `status: 'active'` only; this endpoint has no such filter and is admin-only.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | String | `active`, `pending`, `sold`, `rented`, or `withdrawn` |
| `agentId` | ObjectId string | Filter by listing agent |
| `city` | String | Case-insensitive regex match on `address.city` |
| `type` | String | Property type (e.g. `house`, `apartment`, `commercial`) |
| `listingType` | `sale` \| `rent` | Listing type |
| `page` / `limit` | Integer | Pagination |

Each result includes the `agent` field populated with `firstName`, `lastName`, `email`, and `agentProfile.verified`.

---

#### `GET /api/admin/properties/:id`

Returns a single property document in full detail.

**Response body includes:**

| Field | Description |
|---|---|
| `property` | Full Property document with `agent` populated |
| `enquiryCount` | Total Enquiry documents referencing this property |

**Errors:**

| Code | Condition |
|---|---|
| `404` | No property found with the given `_id` |

---

#### `PATCH /api/admin/properties/:id/status`

Overrides the status of a listing. This bypasses the ownership check applied to agents (who can only change their own listings), allowing an admin to force any valid status onto any listing.

**Request body:**

```json
{ "status": "withdrawn" }
```

**Valid status values:** `active`, `pending`, `sold`, `rented`, `withdrawn`

**Response body:**

```json
{ "status": "withdrawn", "message": "Property status changed to withdrawn" }
```

**Errors:**

| Code | Condition |
|---|---|
| `400` | `status` value is not one of the valid enum values |
| `404` | No property found with the given `_id` |

**Side effects:**
- If `status` is `sold` or `rented`, the property's `soldAt` field is set to the current timestamp.
- Writes `override_property_status` to AuditLog with `details: { from, to }`.

---

#### `DELETE /api/admin/properties/:id`

Permanently hard-deletes a property and all associated data. Runs in the following order:

**Step 1 — Cloudinary asset cleanup:**
- Each entry in `property.photos` where `publicId` is present: `cloudinary.uploader.destroy(publicId)`
- If `property.floorPlanPublicId` is set: `cloudinary.uploader.destroy(floorPlanPublicId)`
- All destroy calls are wrapped in `Promise.allSettled` — a failed destroy (e.g. asset already deleted) does not abort the operation.

**Step 2 — Database cleanup (run in parallel):**
- `property.deleteOne()` — removes the Property document.
- `Enquiry.deleteMany({ property: property._id })` — removes all enquiries for this listing.

**Response body:**

```json
{ "message": "Property and all associated enquiries deleted" }
```

**Errors:**

| Code | Condition |
|---|---|
| `404` | No property found with the given `_id` |

**Side effects:**
- Writes `delete_property` to AuditLog with `details: { title, agentId }`.

---

### Agent Verification

#### `GET /api/admin/agents/pending`

Returns a paginated list of agent-role users where `agentProfile.verified === false`. Results are sorted by `createdAt` ascending so the longest-waiting agents appear first.

**Query parameters:** `page`, `limit` (standard pagination only)

---

#### `PATCH /api/admin/agents/:id/verify`

Grants verified status to an agent account.

**Request body:** None required.

**Response body:**

```json
{ "verified": true, "message": "Agent agent@example.com has been verified" }
```

**Errors:**

| Code | Condition |
|---|---|
| `404` | No user found with the given `_id` and `role === 'agent'` |

**Side effects:**
- Sets `agentProfile.verified = true` and saves.
- Sends `sendAgentVerificationEmail(user, true)` — non-blocking, errors logged but not propagated.
- Writes `verify_agent` to AuditLog.

---

#### `PATCH /api/admin/agents/:id/unverify`

Revokes verified status from an agent account.

**Request body:** None required.

**Response body:**

```json
{ "verified": false, "message": "Agent agent@example.com verification revoked" }
```

**Errors:**

| Code | Condition |
|---|---|
| `404` | No user found with the given `_id` and `role === 'agent'` |

**Side effects:**
- Sets `agentProfile.verified = false` and saves.
- Sends `sendAgentVerificationEmail(user, false)` — non-blocking.
- Writes `unverify_agent` to AuditLog.

---

### Enquiry Oversight

#### `GET /api/admin/enquiries`

Returns a paginated list of all enquiries across all agents and all properties.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | String | `new`, `read`, `replied`, or `closed` |
| `agentId` | ObjectId string | Filter by receiving agent |
| `propertyId` | ObjectId string | Filter by property |
| `page` / `limit` | Integer | Pagination |

Each result includes:
- `property` — populated with `title`, `address`, `price`
- `agent` — populated with `firstName`, `lastName`, `email`
- `buyer` — populated with `firstName`, `lastName`, `email` (if the enquiry was made by a registered user)

---

#### `DELETE /api/admin/enquiries/:id`

Permanently removes an enquiry. Intended for spam or abusive message removal.

**Response body:**

```json
{ "message": "Enquiry deleted" }
```

**Errors:**

| Code | Condition |
|---|---|
| `404` | No enquiry found with the given `_id` |

**Side effects:**
- Writes `delete_enquiry` to AuditLog with `details: { property, senderEmail }`.

---

### Audit Log

#### `GET /api/admin/audit-log`

Returns a paginated, read-only view of the AuditLog collection. No mutations are possible through this endpoint.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `adminId` | ObjectId string | Filter by the admin who performed the action |
| `action` | String | Filter by action type (must be a valid enum value) |
| `targetType` | String | `User`, `Property`, or `Enquiry` |
| `from` | ISO 8601 date | Start of `createdAt` range |
| `to` | ISO 8601 date | End of `createdAt` range |
| `page` / `limit` | Integer | Pagination (default page=1, limit=20, max limit=100) |

Each log entry includes `adminId` populated with `firstName`, `lastName`, `email`.

**Response body:**

```json
{
  "logs": [
    {
      "_id": "...",
      "adminId": { "firstName": "Jane", "lastName": "Smith", "email": "jane@admin.com" },
      "action": "delete_property",
      "targetType": "Property",
      "targetId": "...",
      "details": { "title": "Modern Downtown Loft", "agentId": "..." },
      "ip": "203.0.113.42",
      "createdAt": "2026-05-05T10:23:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 84, "pages": 5 }
}
```

---

## 1.8 Business Logic & Rules

| Rule | Where enforced |
|---|---|
| An admin cannot deactivate, delete, or change the role of their own account | Controller: `req.params.id === req.user._id.toString()` check at the top of each handler |
| Deleting a user withdraws their listings instead of deleting them | `Property.updateMany(...)` runs before `user.deleteOne()` |
| Overriding property status to `sold` or `rented` timestamps `soldAt` | `overridePropertyStatus` sets `property.soldAt = new Date()` |
| Cloudinary asset failures are non-fatal during property deletion | `Promise.allSettled` instead of `Promise.all` |
| AuditLog writes never block or fail the originating operation | Written via `logAction(...).catch(...)` — errors are console-logged only |
| All mutations that change system state produce an AuditLog entry | Each mutating handler calls `logAction` as its last step |
| Property status override values are validated against a strict list | Handler explicitly checks against `['active','pending','sold','rented','withdrawn']` |
| Role changes are validated before save | Handler checks `['buyer','agent','admin'].includes(role)` |

---

## 1.9 Audit Trail

The audit trail is designed to be:

- **Append-only** — no update or delete route is exposed for AuditLog documents.
- **Non-blocking** — audit writes run asynchronously after the main operation completes. The `logAction` helper function returns a Promise that is `.catch`-ed and never awaited by the caller.
- **Queryable** — four indexes (by adminId+time, by target, by action type, by time) allow efficient filtering on all supported query dimensions without full collection scans.
- **IP-attributed** — `req.ip` is captured at request time and stored alongside each log entry, enabling correlation with network-level access logs.

---

## 1.10 Email Notifications

**Function:** `sendAgentVerificationEmail(user, isVerified)`  
**File:** `backend/utils/emailService.js`  
**Trigger:** Called by `verifyAgent` and `unverifyAgent` controllers.

| Parameter | Type | Description |
|---|---|---|
| `user` | User document | Must have `.email` set |
| `isVerified` | Boolean | `true` = verified; `false` = revoked |

**When `isVerified` is `true`:**
- Subject: *"🏆 Your EstateHub Agent Account is Now Verified!"*
- Content: Congratulations message; lists three benefits unlocked (verified badge on listings, increased search visibility, premium analytics access); CTA button linking to agent dashboard.

**When `isVerified` is `false`:**
- Subject: *"EstateHub — Agent Verification Status Update"*
- Content: Neutral notification that verified status has been reviewed; provides support contact link.

Both variants use the shared `wrapInTemplate()` HTML wrapper (EstateHub brand header, navy/gold colour scheme, footer) and `sendEmailSafely()` (3-attempt exponential-backoff retry). A failed send is logged to the console but never propagated to the HTTP response.

---

## 1.11 Error Handling

All handlers are wrapped in `express-async-handler`. Thrown errors are forwarded to the global error handler in `server.js`, which maps common Mongoose and application errors to appropriate HTTP status codes.

| Condition | HTTP code returned |
|---|---|
| Route not found | `404` |
| Not authenticated (no/invalid token) | `401` |
| Authenticated but not admin role | `403` |
| Invalid MongoDB ObjectId format | `400` (CastError) |
| Mongoose schema validation failure | `400` (ValidationError) |
| Duplicate key (e.g. email) | `400` (code 11000) |
| All other unhandled errors | `500` |

Controllers set the status code explicitly before throwing:

```js
res.status(404);
throw new Error('Property not found');
```

This pattern ensures the correct code is forwarded even when `asyncHandler` catches the throw.

---

## 1.12 File Structure

```
backend/
├── controllers/
│   └── adminController.js      ← 18 async handler functions
├── routes/
│   └── adminRoutes.js          ← Express router, rate limiter, auth middleware
├── models/
│   └── AuditLog.js             ← Mongoose schema and model
└── utils/
    └── emailService.js         ← sendAgentVerificationEmail added here
```

`adminRoutes.js` is registered in `server.js`:

```js
app.use('/api/admin', adminRoutes);
```

---

---

# 2. JSP Property Brochure Module

## 2.1 Purpose & Scope

The JSP Property Brochure module is a standalone Java web application that generates formatted property brochures for print or PDF download. It is decoupled from the Node.js backend — it fetches property data from the Node.js REST API at runtime and renders it independently.

**In scope:**
- A print-ready HTML brochure page with a browser print-to-PDF trigger
- A server-generated, binary PDF brochure using the iText 5 library
- Shared typed data model (`PropertyData`) bridging JSON API responses to both rendering paths
- Branded error pages for 400, 404, and 500 responses

**Out of scope:**
- Authentication or access control (the brochure URLs are treated as publicly accessible print endpoints; access gating is expected at the React frontend layer)
- Generating batch PDFs or multiple properties in one request
- Storing or caching generated PDFs

---

## 2.2 System Position

```
Browser / React frontend
        │
        │  GET /brochure?propertyId={id}          (HTML view)
        │  GET /brochure/pdf?propertyId={id}       (PDF download)
        ▼
┌───────────────────────────────────────────┐
│      Tomcat 7  (port 8080)                │
│                                           │
│  PropertyServlet   → /brochure            │
│  PdfExportServlet  → /brochure/pdf        │
│          │                                │
│          │  HTTP GET (Apache HttpClient)  │
│          ▼                                │
│  Node.js API  (port 5000)                 │
│  GET /api/properties/{propertyId}         │
└───────────────────────────────────────────┘
        │
        ▼
  PropertyData (Java POJO)
        │
        ├── brochure.jsp  (HTML output)
        └── PdfExportServlet  (PDF output via iText 5)
```

The JSP service communicates with the Node.js backend over localhost HTTP. Both services must be running simultaneously for brochure generation to work.

---

## 2.3 Technology & Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| Java | 11 | Runtime |
| Maven | 3.x | Build and dependency management |
| Tomcat 7 (Maven plugin) | 2.2 | Embedded servlet container for development |
| Servlet API | 4.0.1 | Servlet and JSP container contract |
| JSTL | 1.2 | JSP tag library (`<c:if>`, `<c:forEach>`) |
| Apache HttpClient | 4.5.14 | Outbound HTTP call to Node.js API |
| Gson | 2.10.1 | JSON parsing of API response |
| iText | 5.5.13.3 | Server-side PDF generation |
| JSP API | 2.3.3 | JSP compilation contract |

All dependencies are declared in `jsp-brochure/pom.xml`. No additional installation is required beyond `mvn tomcat7:run`.

---

## 2.4 Project Structure

```
jsp-brochure/
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── com/realestate/
        │       ├── model/
        │       │   └── PropertyData.java       ← shared POJO
        │       └── servlet/
        │           ├── PropertyServlet.java    ← HTML brochure handler
        │           └── PdfExportServlet.java   ← PDF generation handler
        └── webapp/
            ├── error.jsp                       ← branded error page
            └── WEB-INF/
                ├── web.xml                     ← deployment descriptor
                └── brochure.jsp                ← HTML brochure template
```

---

## 2.5 Data Model — PropertyData

**File:** `com.realestate.model.PropertyData`  
**Type:** Plain Java POJO with public fields. No getters or setters — used as an internal transfer object only.

`PropertyData` is populated by `PropertyServlet.parseProperty(String json)`, a `static` package-visible method that is reused by both `PropertyServlet` and `PdfExportServlet`. This means JSON parsing logic exists in exactly one place.

#### Fields

| Field | Java Type | Source field in API JSON | Notes |
|---|---|---|---|
| `id` | `String` | `_id` | |
| `title` | `String` | `title` | |
| `description` | `String` | `description` | |
| `propertyType` | `String` | `propertyType` | `house`, `apartment`, `condo`, etc. |
| `listingType` | `String` | `listingType` | `sale` or `rent` |
| `price` | `long` | `price` | Raw numeric value |
| `formattedPrice` | `String` | Computed | `$600,000` or `$2,500/month` |
| `bedrooms` | `int` | `bedrooms` | `0` if absent |
| `bathrooms` | `int` | `bathrooms` | `0` if absent |
| `garages` | `int` | `garages` | `0` if absent |
| `area` | `int` | `area` | Square feet; `0` if absent |
| `yearBuilt` | `int` | `yearBuilt` | `0` if absent |
| `furnished` | `String` | `furnished` | |
| `street` | `String` | `address.street` | |
| `city` | `String` | `address.city` | |
| `state` | `String` | `address.state` | |
| `zipCode` | `String` | `address.zipCode` | |
| `country` | `String` | `address.country` | |
| `fullAddress` | `String` | Computed | `street, city, state zipCode` |
| `photoUrls` | `List<String>` | `photos[].url` | All photos |
| `primaryPhotoUrl` | `String` | Computed | `photoUrls.get(0)` or empty string |
| `floorPlanUrl` | `String` | `floorPlanUrl` | |
| `virtualTourUrl` | `String` | `virtualTourUrl` | |
| `amenities` | `List<String>` | `amenities[]` | Plain string list |
| `agentName` | `String` | `agent.firstName + agent.lastName` | Trimmed |
| `agentEmail` | `String` | `agent.email` | |
| `agentPhone` | `String` | `agent.phone` | |
| `agentAvatar` | `String` | `agent.avatar` | Cloudinary URL |
| `agentAgency` | `String` | `agent.agentProfile.agency` | |

**Null safety:** Every field defaults to an empty string or `0`. No field in `PropertyData` will be `null` after parsing — all absent JSON fields produce safe defaults via `safeStr()` and `safeInt()` helpers.

---

## 2.6 Components

### 2.6.1 PropertyServlet

**File:** `com.realestate.servlet.PropertyServlet`  
**Mapping:** `@WebServlet("/brochure")`  
**Method:** `GET`

**Responsibilities:**
1. Validates that `propertyId` query parameter is present.
2. If `format=pdf` is supplied, issues a `302` redirect to `/brochure/pdf?propertyId={id}` — this keeps PDF generation entirely in `PdfExportServlet`.
3. Makes an outbound `GET` request to `http://localhost:5000/api/properties/{propertyId}` using Apache HttpClient.
4. On a `404` from the Node.js API, responds with `404`.
5. On any non-200 response, responds with `500`.
6. On success, calls `parseProperty(json)` to populate a `PropertyData` object.
7. Sets `pd` and `propertyJson` as request attributes.
8. Forwards to `/WEB-INF/brochure.jsp`.

**Static helper methods (package-visible, reused by PdfExportServlet):**
- `parseProperty(String json) : PropertyData` — full JSON-to-POJO mapping
- `safeStr(JsonObject, String) : String` — null-safe string field extractor
- `safeInt(JsonObject, String) : int` — null-safe integer field extractor

---

### 2.6.2 PdfExportServlet

**File:** `com.realestate.servlet.PdfExportServlet`  
**Mapping:** `@WebServlet("/brochure/pdf")`  
**Method:** `GET`

**Responsibilities:**
1. Validates `propertyId` query parameter.
2. Fetches property data from the Node.js API via `fetchProperty(propertyId)`, reusing `PropertyServlet.parseProperty()`.
3. Sets `Content-Type: application/pdf` and `Content-Disposition: inline; filename="{slug}-brochure.pdf"`.
4. Calls `buildPdf(pd, response.getOutputStream())` to stream the iText 5 document directly to the HTTP response. No temporary file is written to disk.
5. If any step fails (API unavailable, property not found), returns the appropriate HTTP error code.

**Private drawing methods:**
- `buildPdf(PropertyData, OutputStream)` — orchestrates the full iText 5 document
- `drawSectionHeading(...)` — gold accent bar + bold title + divider line
- `buildStats(PropertyData)` — builds the `String[][]` for the stats bar
- `buildDetails(PropertyData)` — builds the `String[][]` for the details table
- `fillRect`, `fillRoundRect`, `fillCircle` — primitive fill helpers
- `drawText`, `drawTextCentered` — text rendering with font/size/colour
- `wrap(String, BaseFont, float, float)` — word-wraps text to fit a width
- `truncate(String, int)` — truncates with ellipsis
- `notEmpty(String)` / `cap(String)` — string utilities

---

### 2.6.3 brochure.jsp

**File:** `webapp/WEB-INF/brochure.jsp`  
**Access:** Internal forward only — not directly accessible via URL.

Reads the `pd` attribute (`PropertyData`) from the request and maps each field to a `pageContext` attribute for clean EL expression use throughout the template.

Key design decisions:
- `amenities` is set as `List<String>` (not `JsonArray`), so `<c:forEach>` renders `Pool` not `"Pool"`.
- `photo2Url` and `photo3Url` are computed from `pd.photoUrls` in the scriptlet, so the template body uses simple EL expressions only.
- The template uses Google Fonts (Cormorant Garamond serif + DM Sans sans-serif) for typography matching the EstateHub brand.
- The print bar (top navigation containing the "Print / Save as PDF" button) is hidden via `@media print` CSS rule, so it does not appear in the printed output.
- `@page { size: A4; margin: 0; }` is declared in the print stylesheet.

---

### 2.6.4 error.jsp

**File:** `webapp/error.jsp`  
**Access:** Mapped to HTTP error codes 400, 404, and 500 in `web.xml`.  
**Declared with:** `isErrorPage="true"`

Reads three standard Servlet error request attributes:

| Attribute | Description |
|---|---|
| `javax.servlet.error.status_code` | Integer HTTP status code |
| `javax.servlet.error.message` | Error message string |
| `javax.servlet.error.request_uri` | The URI that triggered the error |

Renders a dark-themed branded card (navy background, gold accents) with the status code, a user-friendly title, and the error message. No stack trace is ever exposed in the browser output.

---

## 2.7 Request Flows

### HTML Brochure Flow

```
1. Client sends:  GET /brochure?propertyId=abc123

2. PropertyServlet.doGet():
   a. Validates propertyId is present
   b. No format=pdf → continues
   c. HttpClient → GET http://localhost:5000/api/properties/abc123
   d. API returns 200 + JSON
   e. parseProperty(json) → PropertyData pd
   f. request.setAttribute("pd", pd)
   g. Forward → /WEB-INF/brochure.jsp

3. brochure.jsp:
   a. Reads pd from request attribute
   b. Maps fields to pageContext attributes
   c. Renders full HTML page with print bar and brochure layout

4. Browser receives HTML:
   a. Renders brochure page
   b. User clicks "Print / Save as PDF"
   c. Browser print dialog opens
   d. User selects "Save as PDF" in the print dialog
```

### PDF Download Flow

```
1. Client sends:  GET /brochure/pdf?propertyId=abc123
   (or)           GET /brochure?propertyId=abc123&format=pdf
                  → PropertyServlet redirects (302) → /brochure/pdf?propertyId=abc123

2. PdfExportServlet.doGet():
   a. Validates propertyId is present
   b. HttpClient → GET http://localhost:5000/api/properties/abc123
   c. API returns 200 + JSON
   d. PropertyServlet.parseProperty(json) → PropertyData pd
   e. Sets Content-Type: application/pdf
   f. Sets Content-Disposition: inline; filename="modern-downtown-loft-brochure.pdf"
   g. buildPdf(pd, response.getOutputStream())

3. buildPdf():
   a. Creates iText 5 Document (A4, zero margins)
   b. Draws header zone (navy bg, hero image, text panel)
   c. Draws stats bar (gold bg, up to 5 stat columns)
   d. Draws left column (description, gallery, amenities, floor plan)
   e. Draws right column (details table, agent card, virtual tour box)
   f. Draws footer (gold line, logo, disclaimer, copyright)
   g. doc.close() → flushes PDF bytes to response stream

4. Browser receives PDF:
   a. Inline viewer opens (or download, depending on browser settings)
```

---

## 2.8 HTML Brochure View

The HTML brochure (`brochure.jsp`) is the primary user-facing output. It is styled to be print-ready out of the box — clicking the "Print / Save as PDF" button triggers `window.print()`.

### Typography

| Font | Family | Usage |
|---|---|---|
| Cormorant Garamond | Serif | Logo, property title, price, section titles, agent name, footer logo |
| DM Sans | Sans-serif | Body text, address, stats labels, amenity tags, agent contact, badge |

Both fonts are loaded from Google Fonts over CDN.

### Page Sections

| Section | CSS class | Description |
|---|---|---|
| Print bar | `.print-bar` | Navy top bar with logo and Print button. Hidden on print via `@media print`. |
| Header | `.brochure-header` | Two-column grid: hero photo (left) + listing info panel (right), both on navy background. |
| Stats bar | `.stats-bar` | Gold bar with up to 5 stat blocks (bedrooms, bathrooms, garages, area, year built). A stat block is only rendered if its value is greater than zero. |
| Gallery row | `.photo-row` | Two-column grid showing the 2nd and 3rd property photos. Only rendered if `photo2Url` or `photo3Url` is non-empty. |
| Description | `.section` | Property description text. |
| Details | `.details-grid` | Two-column key-value table of property attributes with alternating row backgrounds. |
| Amenities | `.amenities-grid` | Pill-tag row for each amenity string. Only rendered if `amenities` list is non-empty. |
| Floor plan | `.section` | Floor plan image at full content width. Only rendered if `floorPlanUrl` is non-empty. |
| Virtual tour | `.vtour-box` | Link box showing the virtual tour URL. Only rendered if `virtualTourUrl` is non-empty. |
| Agent card | `.agent-card` | Navy card with gold avatar initial circle, agent name, phone, and email. |
| Footer | `.brochure-footer` | Gold top border, logo left, disclaimer centre, copyright right. |

### Print Styles

```css
@page { size: A4; margin: 0; }
@media print {
  body { font-size: 12px; }
  .print-bar { display: none; }
  .brochure { max-width: 100%; }
  .brochure-header { page-break-inside: avoid; }
}
```

---

## 2.9 PDF Brochure — Layout Specification

### Page Canvas

| Property | Value |
|---|---|
| Page size | A4 |
| Width | 595 pt |
| Height | 842 pt |
| Margin | 32 pt (left and right only; top and bottom use zone boundaries) |
| Coordinate origin | Bottom-left (iText 5 convention) |
| Temporary files | None — PDF is streamed directly to `response.getOutputStream()` |

### Zone Boundaries

```
y = 842  ──────────────────────────── top of page
          HEADER ZONE  (210 pt tall)
y = 632  ──────────────────────────── bottom of header
          STATS BAR  (36 pt tall)
y = 596  ──────────────────────────── bottom of stats bar
          BODY (left + right columns)
y = 42   ──────────────────────────── bottom of body
          FOOTER  (30 pt tall)
y = 0    ──────────────────────────── bottom of page
```

### Header Zone (y = 632 → 842)

| Element | Position | Dimensions | Detail |
|---|---|---|---|
| Navy background | `(0, 632)` | Full width × 210 pt | Drawn first, behind all other elements |
| Hero photo | `(0, 632)` | 297.5 pt × 210 pt (left half) | `Image.getInstance(URL)`. Scaled to exactly fill the left half. Silently skipped if URL fails. |
| Gold accent strip | `(294.5, 632)` | 3 pt × 210 pt | Vertical separator between photo and text panel |
| Logo — "ESTATE" | `(tx, H−26)` | Font: Helvetica 11pt | Colour: `#D2D7DC` (muted white) |
| Logo — "HUB" | Immediately right of "ESTATE" | Font: Helvetica Bold 11pt | Colour: `#C9A84C` (gold) |
| Listing type badge | `(tx, H−46)` | Font: Helvetica Bold 7.5pt | Text: `"FOR SALE · HOUSE"`. Colour: gold. |
| Property title | `(tx, H−68)` | Font: Helvetica Bold 16pt | Word-wrapped to max 2 lines. Colour: white. |
| Formatted price | `(tx, ty−6)` | Font: Helvetica Bold 22pt | Colour: gold. |
| Full address | `(tx, ty−24)` | Font: Helvetica 8.5pt | Truncated to 52 chars. Colour: `#A0A0AF`. |
| Generated date | `(tx, ty−38)` | Font: Helvetica 7pt | `"Generated YYYY-MM-DD"`. Colour: `#5A5F6E`. |

`tx` = `W/2 + MARGIN * 0.6` = approximately 318 pt (start of text panel)

### Stats Bar (y = 596 → 632)

- Gold (`#C9A84C`) background spanning full page width.
- Up to 5 stat columns, each allocated equal width (`W / statCount`).
- A stat column is only rendered when its value is `> 0`.

| Stat | Source field | Label |
|---|---|---|
| Bedrooms | `pd.bedrooms` | `BEDS` |
| Bathrooms | `pd.bathrooms` | `BATHS` |
| Garages | `pd.garages` | `GARAGES` |
| Living area | `pd.area` | `SQ FT` (formatted with commas) |
| Year built | `pd.yearBuilt` | `BUILT` |

Each column: value in Helvetica Bold 14pt (navy), label in Helvetica 7pt (dark navy). Dividers between columns in `#E6D296`.

### Body — Left Column (y = 578 → 42)

**Position:** `x = 32`, `width = (W − 64) × 0.60 = 319.8 pt`

Elements render top-to-bottom. Each element's bottom edge becomes the top boundary of the next.

| Element | Condition | Detail |
|---|---|---|
| "Property Description" section heading | Always | Gold accent bar (3 × 14 pt) + Helvetica Bold 11pt + gold underline |
| Description text | Always | Flowing `ColumnText` with `Font(Helvetica, 9.5pt)`. Line leading: 14 pt. |
| Gallery row | `photoUrls.size() > 1` | 2nd and 3rd photos side by side, each 85 pt tall × half column width. Silently skipped if URL fails. |
| "Amenities & Features" section heading | `amenities` non-empty | As above |
| Amenity pill tags | `amenities` non-empty | Cream background (`#FAF8F4`), light-gray border. Helvetica 8pt. Wraps to new row when a tag would exceed column width. Max rendered: until `tagY < BODY_BOTTOM + 20`. |
| "Floor Plan" section heading | `floorPlanUrl` non-empty | As above |
| Floor plan image | `floorPlanUrl` non-empty | `scaleToFit(LEFT_W, fpH)` where `fpH = min(130, available space)`. Silently skipped if URL fails. |

### Body — Right Column (y = 578 → 42)

**Position:** `x = 32 + (W − 64) × 0.62 = 361 pt`, `width = (W − 64) × 0.38 = 202.8 pt`

| Element | Condition | Detail |
|---|---|---|
| "Property Details" section heading | Always | Same heading style as left column |
| Details table | Always | Alternating cream/white rows, 20 pt row height, light-gray borders. Labels in Helvetica 8pt muted; values in Helvetica Bold 8pt navy, right-aligned. Up to 10 rows (stops if `rightY − rowH < BODY_BOTTOM + 80`). |
| "Listing Agent" section heading | `rightY > BODY_BOTTOM + 75` | As above |
| Agent card | Available height ≥ 72 pt | Navy rounded rectangle (radius 5). Gold avatar circle (radius 18) with agent initial in navy bold 13pt. Agent name in white bold 11pt; phone and email in `#AFB2C0` regular 8pt; agency in gold 7.5pt. |
| Virtual tour box | `virtualTourUrl` non-empty AND space available | Cream rounded rectangle, navy label "Virtual Tour Available" in bold 8pt, URL in muted 7pt (truncated to 38 chars). |

### Details Table Rows

Rows are only included when the relevant field is non-empty or non-zero:

| Row label | Source |
|---|---|
| Type | `pd.propertyType` (capitalised) |
| Listing | `"For Sale"` or `"For Rent"` |
| Bedrooms | `pd.bedrooms` |
| Bathrooms | `pd.bathrooms` |
| Garages | `pd.garages` |
| Living Area | `pd.area` formatted as `"{n} sq ft"` |
| Year Built | `pd.yearBuilt` |
| City | `pd.city` |
| State | `pd.state` |
| Price | `pd.formattedPrice` |

### Footer (y = 0 → 30)

| Element | Position | Detail |
|---|---|---|
| Gold divider line | `(0, 28)` | 2 pt tall, full page width, `#C9A84C` |
| "ESTATE" logo text | `(32, 14)` | Helvetica Bold 11pt, navy |
| "HUB" logo text | Immediately right | Helvetica Bold 11pt, gold |
| Disclaimer | Horizontally centred | Helvetica 7pt, muted. Text: `"This brochure is for informational purposes only. All details subject to verification."` |
| Copyright | Right-aligned at `(W−32, 14)` | Helvetica 7pt, muted. Text: `"© {year} EstateHub"` |

### Colour Reference

| Name | RGB | Hex | Used in |
|---|---|---|---|
| Navy | `(15, 25, 35)` | `#0F1923` | Header background, agent card, logo text, table values |
| Gold | `(201, 168, 76)` | `#C9A84C` | Price, badges, stats bar, section headings, footer line, "HUB" logo |
| Cream | `(250, 248, 244)` | `#FAF8F4` | Alternating table rows, amenity tag backgrounds, virtual tour box |
| Light Gray | `(228, 224, 216)` | `#E4E0D8` | Table borders, tag borders |
| Text | `(55, 55, 70)` | `#373746` | Body paragraph text |
| Muted | `(130, 130, 145)` | `#828291` | Table labels, address, footer text |

### Font Reference

| Constant | Usage |
|---|---|
| `BaseFont.HELVETICA_BOLD` | Logo, section headings, stat values, table values, price, agent name, badge text, avatar initial |
| `BaseFont.HELVETICA` | Body text, labels, address, amenity tags, agent contact details, footer disclaimer |

Both fonts are iText 5 built-ins — no external font files are required.

### Image Handling

All images (hero photo, gallery photos, floor plan) are loaded at generation time via:

```java
Image.getInstance(new URL(urlString))
```

If any URL fails to load (network timeout, HTTP error, invalid URL), the `catch` block is empty and execution continues. The affected image slot is simply absent from the PDF — no placeholder is drawn and the document still completes normally.

---

## 2.10 Error Handling

### Servlet-level errors

| Condition | Servlet response |
|---|---|
| `propertyId` query parameter missing or blank | `sendError(400, "propertyId is required")` |
| Node.js API returns 404 | `sendError(404, "Property not found")` |
| Node.js API returns any non-200 status | `sendError(500, "API error")` |
| Node.js API unreachable (connection refused, timeout) | `sendError(500, "Could not connect to property service: {message}")` |
| iText PDF generation throws `DocumentException` | Wrapped and thrown as `IOException` |

### Container-level error pages

`web.xml` maps HTTP error codes 400, 404, and 500 to `/error.jsp`. The `error.jsp` page:

- Reads `javax.servlet.error.status_code`, `javax.servlet.error.message`, and `javax.servlet.error.request_uri` from request attributes.
- Falls back to `500` / `"An unexpected error occurred."` if attributes are absent.
- Renders a dark-themed, branded card with the code, title, and message.
- Never exposes a Java stack trace to the browser.

---

## 2.11 Deployment Configuration

**File:** `webapp/WEB-INF/web.xml`

```xml
<web-app version="4.0">
  <display-name>EstateHub Property Brochure</display-name>

  <welcome-file-list>
    <welcome-file>index.jsp</welcome-file>
  </welcome-file-list>

  <error-page><error-code>400</error-code><location>/error.jsp</location></error-page>
  <error-page><error-code>404</error-code><location>/error.jsp</location></error-page>
  <error-page><error-code>500</error-code><location>/error.jsp</location></error-page>

  <session-config>
    <session-timeout>30</session-timeout>
  </session-config>
</web-app>
```

Servlet mappings are declared via `@WebServlet` annotations and do not need entries in `web.xml`.

---

## 2.12 Running the Service

**Prerequisites:**
- Java 11+
- Maven 3.x
- Node.js backend running on `http://localhost:5000`

**Start the brochure service:**

```bash
cd jsp-brochure
mvn tomcat7:run
```

The Tomcat 7 Maven plugin starts an embedded server on port 8080 at context path `/`.

**Available endpoints:**

| URL | Output |
|---|---|
| `http://localhost:8080/brochure?propertyId={id}` | Print-ready HTML brochure with "Print / Save as PDF" button |
| `http://localhost:8080/brochure/pdf?propertyId={id}` | Inline PDF binary (A4, `application/pdf`) |
| `http://localhost:8080/brochure?propertyId={id}&format=pdf` | 302 redirect to the PDF endpoint above |

`{id}` is the MongoDB `_id` of any property document (24-character hex string) or the property's URL slug.
