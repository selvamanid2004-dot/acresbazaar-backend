# AcresBazaar Real Estate Platform - Backend API 🚀

Robust, modular REST API server built with **NestJS**, **TypeScript**, and **Prisma ORM**.

---

## 🏗️ Architecture & Features

- **Framework**: [NestJS 10](https://nestjs.com/) (Express platform)
- **Database ORM**: [Prisma ORM 5](https://www.prisma.io/)
- **Authentication**: JWT-based Authentication (`@nestjs/jwt`, `passport-jwt`, `bcrypt`) with Role-Based Access Control (Super Admin, Buyer, Seller, Dealer, Common People / Spotter)
- **Data Models**:
  - `Admin`: Super Admin user authentication & management
  - `User`: Multi-role user accounts (Buyers, Sellers, Dealers, Spotters)
  - `Property`: Real estate listings with categories, pricing, locations, specifications, and approvals
  - `PropertyBooking`: Dealer & Buyer property booking workflows
  - `PropertyImage`: Multi-image listing attachments
  - `Category`: Dynamic property classifications
  - `Plan`: Membership & listing subscription plans (Gold, Platinum, etc.)
  - `Reward`: Spotter and dealer reward claims and approvals
  - `Report`: Property and issue reporting system
  - `VerifiedPartner`: Partner onboarding and status management
  - `WebsiteSetting`: Dynamic CMS settings (home, logo, contact, services)
  - `Chat`: Customer support chat & AI assistant conversation threads
  - `CalendarEvent`: Executive calendar schedules & inspection reminders
- **File Uploads**: Static serving for property and platform imagery (`/uploads`)
- **Reporting & Exports**: CSV & PDF generation engines (`pdfkit`, `csv-stringify`)

---

## 🛠️ Prerequisites

- **Node.js**: `v18.x` or `v20.x`+
- **npm**: `v9.x`+

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Database Setup (Prisma)
Generate the Prisma Client and initialize the database schema:
```bash
npx prisma generate
npx prisma db push
```

*(Optional)* Seed sample data:
```bash
npm run prisma:seed
```

### 4. Run the Development Server
```bash
npm run start:dev
```
The REST API will be accessible at: **`http://localhost:5001/api`**

---

## 📦 Production Build & Run

```bash
# Build the TypeScript project
npm run build

# Start the production server
npm run start
```

---

## 🔑 Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Server port | `5001` |
| `DATABASE_URL` | Database connection URL | `file:./dev.db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Custom secret string |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |

---

## 📄 License
Private & Confidential — AcresBazaar Platform.
