# Commission Ledger Backend Walkthrough

The backend for your Commission Ledger application is now ready. It is built using **Node.js**, **Express.js**, and **MongoDB**, featuring a robust Role-Based Access Control (RBAC) system.

## Key Features

- **Role Management**: Define roles like `Superadmin`, `Admin`, and `User`.
- **Menu Access**: Granular control over which user roles can access specific frontend menus.
- **Authentication**: Secure JWT-based login system.
- **Full CRUD**: complete APIs for Farmers, Vendors, Vegetables, Purchases, and Sales.

## Getting Started

### 1. Database Configuration
By default, the application connects to a local MongoDB instance. In `commission-backend/.env`, you can update the `MONGO_URI`:
```env
MONGO_URI=mongodb://localhost:27017/commission-ledger
```

### 2. Initial Setup (Seeding)
To create the default roles and the initial Superadmin user, run:
```bash
cd commission-backend
npm run seed
```
**Default Credentials:**
- **Email**: `admin@example.com`
- **Password**: `password123`

### 3. Running the Server
Start the development server with:
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

## Architecture Overview

### Roles & Permissions
Roles are stored in the database with their respective menu access permissions:
- **Superadmin**: Full access to everything, including User and Role management.
- **Admin**: Access to business data and User management, but cannot change Role permissions.
- **User**: Read/Write access to daily entries (Farmers, Vendors, Purchases, Sales) but restricted from administrative modules and reports.

### Folder Structure
- `controllers/`: Contains the business logic for each resource.
- `models/`: Mongoose schemas for MongoDB.
- `routes/`: Express route definitions.
- `middleware/`: Authentication and authorization logic.
- `scripts/`: Initialization scripts like `seed.js`.

## API Endpoints Summary

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Public | Authenticate and get JWT |
| `/api/users` | GET/POST | Admin+ | Manage application users |
| `/api/roles` | GET/PUT | Superadmin | Manage role permissions |
| `/api/farmers` | ALL | User+ | CRUD farmers |
| `/api/vendors` | ALL | User+ | CRUD vendors |
| `/api/vegetables` | ALL | User+ | CRUD vegetables |
| `/api/purchases` | ALL | User+ | CRUD purchase entries |
| `/api/sales` | ALL | User+ | CRUD sales entries |

---

### Tips
- You can now update your frontend code to use these API endpoints instead of the local zustand stores for data persistence.
