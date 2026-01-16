# Cal.com Clone – Scheduling Platform

A full-stack scheduling and booking web application inspired by **Cal.com**, built as part of an **SDE Intern Fullstack Assignment**.

The application allows users to create event types, configure availability, and let others book time slots through a public booking page.

---

## 🚀 Features

### Core Features

* **Event Types Management**

  * Create, edit, delete (soft delete) event types
  * Each event type has a unique public booking URL
* **Availability Settings**

  * Configure available days and time ranges
  * Prevent overlapping or invalid availability
* **Public Booking Page**

  * Calendar-based date selection
  * Time slot generation based on availability
  * Prevents double booking
* **Bookings Dashboard**

  * View upcoming and past bookings
  * Cancel bookings safely

### Bonus Features

* Responsive UI (mobile & desktop)
* Soft deletion of event types
* Database-level race condition handling
* Input validation using Zod
* Seeded demo data for quick testing

---

## 🧱 Tech Stack

### Frontend

* React + Vite
* TypeScript
* Tailwind CSS
* React Query
* date-fns

### Backend

* Node.js
* Express.js
* Drizzle ORM
* Zod for validation

### Database

* PostgreSQL

---

## 🗂 Project Structure

```
client/        → Frontend (React)
server/        → Backend (Express)
shared/        → Shared schemas & API contracts
```

---

## 🧠 Design Decisions

### No Authentication

* Assumes a default logged-in user for admin functionality
* Focus is on scheduling logic, not auth complexity

### Timezone Handling

* Availability and slots are generated in **local time**
* Booking times are converted to **UTC** before storing
* Assumption is clearly documented and consistent

### Preventing Double Booking

* Enforced at **database level** using unique constraints
* API gracefully handles conflicts with HTTP 409 responses

### Soft Deletion

* Event types are hidden instead of deleted
* Preserves booking history and data integrity

---

## 🧪 Edge Cases Handled

* Race conditions during booking
* Overlapping availability input
* Invalid date/time selections
* Cancelled bookings reopening slots
* Past-date bookings blocked
* Slug collisions prevented

---

## 🧬 Database Schema Highlights

* Users → Event Types → Bookings (1-to-many)
* Availability stored per weekday
* Unique constraints to ensure data consistency

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone <repo-url>
cd cal-clone
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cal_clone
```

### 4️⃣ Run Database & Server

```bash
npm run dev
```

Database is automatically seeded with demo data.

---

## 🌐 Deployment

* Frontend: Vercel / Netlify
* Backend: Render / Railway
* Database: Railway / Supabase / Local PostgreSQL

---

## 📌 Assumptions

* Single default user (no login)
* One availability schedule per user
* All times treated consistently as local → UTC

---

## 📷 Screenshots

(Add screenshots of dashboard, booking page, confirmation)

---

## 🙌 Notes

This project was built with a strong focus on **correctness, data integrity, and clean architecture**, while keeping the scope realistic for an intern-level assignment.

AI tools were used during development, but all code was written with full understanding and can be explained line-by-line.

---

## 🔗 Links

* **GitHub Repository:** <link>
* **Live Demo:** <link>
