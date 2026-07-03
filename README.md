# Restaurant Reservation Management System

A full-stack reservation system built with **React (Vite)**, **Node.js/Express**, **MongoDB (Mongoose)**, and **JWT authentication**. Supports two roles — **Customer** and **Administrator** — with role-based access control, table-availability logic, and double-booking prevention.

---

## 1. Project Structure

```
restaurant-reservation-system/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # register / login / me
│   │   ├── tableController.js     # table CRUD + availability search
│   │   └── reservationController.js  # create/list/cancel + admin ops
│   ├── middleware/
│   │   ├── auth.js                # JWT verification + role guard
│   │   └── errorHandler.js        # centralized error handling
│   ├── models/
│   │   ├── User.js                # role: customer | admin, hashed password
│   │   ├── Table.js                # tableNumber, capacity, isActive
│   │   └── Reservation.js         # date, timeSlot, table, guests, status
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── tableRoutes.js
│   │   └── reservationRoutes.js
│   ├── utils/
│   │   ├── constants.js           # TIME_SLOTS, ROLES, RESERVATION_STATUS
│   │   └── seedTables.js          # seeds 8 sample tables
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/axios.js           # axios instance + JWT interceptor
│   │   ├── context/AuthContext.jsx # global auth state
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.jsx # route guard (auth + role)
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── NewReservation.jsx   # customer: check availability + book
│   │   │   ├── MyReservations.jsx   # customer: view/cancel own bookings
│   │   │   └── AdminDashboard.jsx   # admin: all reservations + table mgmt
│   │   ├── styles/index.css
│   │   ├── App.jsx                # routes
│   │   └── main.jsx               # entry point
│   ├── index.html
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 2. Setup Instructions

### Prerequisites
- Node.js 18+
- A MongoDB instance — either local (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGODB_URI, JWT_SECRET, and optionally ADMIN_SIGNUP_SECRET
npm install
npm run seed     # seeds 8 tables (capacities 2/4/6/8) into the database
npm run dev       # starts on http://localhost:5000
```

`.env` variables:

| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs — use a long random string |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_ORIGIN` | Frontend URL, for CORS |
| `ADMIN_SIGNUP_SECRET` | Optional secret. If supplied correctly during registration, the new account is created as `admin`. Leave unset to disable admin self-signup entirely. |

### Frontend

```bash
cd frontend
cp .env.example .env
# edit .env: set VITE_API_URL to your backend URL (e.g. http://localhost:5000/api)
npm install
npm run dev       # starts on http://localhost:5173
```

### Creating an admin account
Set `ADMIN_SIGNUP_SECRET` in the backend `.env` (e.g. `super-secret-admin-key`), then on the Register page fill the optional **"Admin Secret"** field with that same value. Any registration without it (or with a wrong value) becomes a regular customer account.

---

## 3. Reservation & Availability Logic

- The restaurant operates on a **fixed list of time slots** (defined in `backend/utils/constants.js`), rather than free-text times. This avoids partial-overlap edge cases entirely — a slot is either taken or free.
- **Capacity check**: a table can only be booked if `table.capacity >= guests`.
- **Availability search**: `GET /api/tables/available?date=&timeSlot=&guests=` returns only tables that are active, large enough for the party, and not already confirmed-booked for that exact date + time slot.
- **Double-booking prevention** is enforced at two levels:
  1. **Application level** — before creating a reservation, the API explicitly checks for an existing *confirmed* reservation on the same table/date/timeSlot and returns a friendly `409 Conflict` if found.
  2. **Database level** — a **partial unique index** on `{ table, date, timeSlot }` (scoped to `status: "confirmed"`) is the real guarantee. Even under concurrent requests racing past the application-level check, MongoDB rejects the second insert with a duplicate-key error, which the centralized error handler turns into a clean `409` response. Cancelled reservations are excluded from the index, so a cancelled slot can be re-booked by someone else.
- **Past-date protection**: booking a date earlier than today is rejected.
- Dates are stored as `YYYY-MM-DD` strings (not `Date` objects) to avoid timezone-shift bugs when comparing "same calendar day" across clients in different timezones.

---

## 4. Role-Based Access (Customer vs Admin)

- JWT is issued at login/register and must be sent as `Authorization: Bearer <token>` on every protected request.
- `middleware/auth.js` exposes:
  - `protect` — verifies the token and attaches `req.user`.
  - `authorize('admin')` — rejects with `403` if `req.user.role` doesn't match.
- **Customer-only** (any authenticated user): create reservation, view own reservations, cancel own reservation.
- **Admin-only**: view all reservations (with optional `?date=` filter), update any reservation, cancel any reservation, create/update/deactivate tables.
- On the frontend, `ProtectedRoute` redirects unauthenticated users to `/login` and redirects users to `/` if their role doesn't match the route's required role. The Navbar also renders different links depending on role.

---

## 5. Assumptions Made

- Single restaurant, fixed set of tables (seeded via `npm run seed`; also manageable live from the Admin Dashboard).
- A customer can hold multiple active reservations at once (no artificial per-user limit was specified).
- Reservation "editing" by customers is done via cancel + re-book; only admins can directly edit an existing reservation's date/time/table/guests, per the assignment's admin functionality list.
- Admin accounts are provisioned via a shared `ADMIN_SIGNUP_SECRET` rather than a separate invite-only flow, since no specific admin-provisioning mechanism was specified.
- Table capacity is treated as a hard ceiling (a party of 5 cannot book a 4-seat table) rather than allowing combined/joined tables.

---

## 6. Known Limitations

- No email/SMS notifications (explicitly out of scope per the assignment).
- No payment integration (explicitly out of scope).
- No password-reset flow.
- Admin table deletion does not cascade-handle historical reservations tied to that table (deactivating a table is the recommended path instead of deleting it).
- Time slots are fixed/pre-defined rather than fully configurable through the UI (they live in a constants file); an admin UI to manage slots was not built in the given timeframe.

## 7. Areas for Improvement (with more time)

- Add pagination and search/sort on the admin reservations table for large datasets.
- Add automated tests (Jest + Supertest for the API, React Testing Library for the frontend).
- Make time slots and operating hours configurable from the Admin Dashboard instead of a constants file.
- Add optimistic UI updates and toast notifications instead of inline alerts.
- Add refresh tokens / shorter-lived access tokens for stronger session security.
- Rate-limit auth endpoints to reduce brute-force risk.

---

## 8. Deployment

This assignment requires a public deployment URL. Suggested path:

1. **Database**: create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), whitelist all IPs (or your host's IP), and copy the connection string into `MONGODB_URI`.
2. **Backend**: deploy the `backend/` folder to [Render](https://render.com) or [Railway](https://railway.app) as a Node web service. Set the environment variables from `.env.example` in the platform's dashboard. Build command: `npm install`. Start command: `npm start`.
3. **Frontend**: deploy the `frontend/` folder to [Vercel](https://vercel.com) or [Netlify](https://netlify.com). Set `VITE_API_URL` to your deployed backend's `/api` URL. Build command: `npm run build`. Output directory: `dist`.
4. Update the backend's `CLIENT_ORIGIN` env var to your deployed frontend URL so CORS allows it.

---

## 9. Testing Notes (what was verified in this build environment)

- **Backend**: all files pass `node --check` (syntax validation), dependencies install cleanly, and the Express app boots correctly (fails fast with a clear error if `MONGODB_URI` is missing, confirming config validation works).
- **Frontend**: `npm run build` completes successfully with Vite, confirming there are no import/JSX/build errors across all pages and components.
- **Live database integration** (actually creating a reservation end-to-end, verifying the double-booking `409`, etc.) could **not** be executed inside this sandbox because it has no outbound network access to MongoDB installers/binaries. **You should run through the flow once against your own MongoDB instance (local or Atlas) before submitting** — install/seed, register a customer, register an admin (with the secret), book a table, try to double-book the same table/date/slot to confirm the `409` conflict message appears, and check the Admin Dashboard filters and cancel/update actions.
