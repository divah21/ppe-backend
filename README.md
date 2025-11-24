# PPE Management System - Backend API

Complete Node.js + Express + PostgreSQL backend for the PPE Management System.

## 📋 Project Structure

```
ppe-backend/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
│
├── database/
│   ├── db.js                       # Database connection
│   ├── sequelizeConfig.js          # Sequelize configuration
│   ├── syncTables.js               # Database sync script
│   └── seedData.js                 # Seed data script (to create)
│
├── models/
│   ├── index.js                    # Models & associations
│   ├── role.js                     # Role model
│   ├── user.js                     # User model
│   ├── department.js               # Department model
│   ├── section.js                  # Section model
│   ├── employee.js                 # Employee model
│   ├── ppeItem.js                  # PPE Item model
│   ├── stock.js                    # Stock model
│   ├── request.js                  # Request model
│   ├── requestItem.js              # Request Item model
│   ├── allocation.js               # Allocation model
│   ├── budget.js                   # Budget model
│   ├── failureReport.js            # Failure Report model
│   ├── auditLog.js                 # Audit Log model
│   ├── document.js                 # Document model
│   └── forecast.js                 # Forecast model
│
└── apps/                           # Application modules
    ├── auth/                       # Authentication
    ├── users/                      # User management
    ├── departments/                # Department management
    ├── sections/                   # Section management
    ├── employees/                  # Employee management
    ├── ppe/                        # PPE items management
    ├── stock/                      # Stock management
    ├── requests/                   # Request workflow
    ├── allocations/                # Allocation tracking
    ├── budgets/                    # Budget management
    ├── failures/                   # Failure reporting
    ├── audit/                      # Audit logs
    └── reports/                    # Reports & analytics
```

## 🗄️ Database Models

### Core Models Created:

1. **Role** - User roles (admin, stores, section-rep, dept-rep, hod-hos, sheq)
2. **User** - System users with authentication
3. **Department** - Organizational departments
4. **Section** - Department sections
5. **Employee** - Mine employees
6. **PPEItem** - PPE product catalog
7. **Stock** - Inventory management
8. **Request** - PPE requests with approval workflow
9. **RequestItem** - Individual items in a request
10. **Allocation** - PPE issued to employees
11. **Budget** - Department budgets
12. **FailureReport** - PPE failure tracking
13. **AuditLog** - System audit trail
14. **Document** - File storage metadata
15. **Forecast** - Demand forecasting

### Key Relationships:

- User → Role (Many-to-One)
- Employee → Section → Department
- Request → User (creator), Employee (target), multiple approvers
- Request → RequestItems → PPEItem
- Allocation → Employee, PPEItem, User (issuer), Request (optional)
- Stock → PPEItem
- FailureReport → PPEItem, Allocation, User
- Budget → Department, Section
- Forecast → Department, PPEItem

## 🚀 Getting Started

### 1. Install Dependencies

```powershell
cd ppe-backend
npm install
```

### 2. Set Up Environment

```powershell
# Copy example env file
cp .env.example .env

# Edit .env with your database credentials
```

### 3. Create PostgreSQL Database

```sql
CREATE DATABASE ppe_system;
```

### 4. Sync Database Tables

```powershell
# Create all tables
npm run db:sync

# Force recreate (WARNING: drops existing tables)
npm run db:sync -- --force

# Alter existing tables to match models
npm run db:sync -- --alter
```

### 5. Seed Initial Data

```powershell
npm run db:seed
```

### 6. Start Development Server

```powershell
npm run dev
```

Server will start at `http://localhost:5000`

## 📡 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get current user profile

### Users
- `GET /users` - List users (Admin only)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (Admin)
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (Admin)

### Employees
- `GET /employees` - List employees
- `GET /employees/:id` - Get employee details
- `GET /employees/:id/allocations` - Get employee's PPE allocations
- `GET /employees/:id/history` - Get allocation history
- `POST /employees` - Add new employee
- `PUT /employees/:id` - Update employee
- `DELETE /employees/:id` - Remove employee

### PPE Items
- `GET /ppe` - List PPE items
- `GET /ppe/:id` - Get PPE item details
- `POST /ppe` - Add new PPE item (Stores/Admin)
- `PUT /ppe/:id` - Update PPE item
- `DELETE /ppe/:id` - Remove PPE item

### Stock Management
- `GET /stocks` - List all stock
- `GET /stocks/low` - Get low stock items
- `GET /stocks/:id` - Get stock details
- `POST /stocks` - Add stock batch
- `PUT /stocks/:id` - Update stock
- `POST /stocks/:id/adjust` - Adjust stock quantity

### Request Workflow
- `GET /requests` - List requests (role-filtered)
- `GET /requests/:id` - Get request details
- `POST /requests` - Create new request (Section Rep)
- `PUT /requests/:id/approve-hod` - HOD approval
- `PUT /requests/:id/approve-dept-rep` - Dept Rep approval
- `PUT /requests/:id/approve-stores` - Stores approval
- `PUT /requests/:id/reject` - Reject request
- `POST /requests/:id/fulfill` - Fulfill request & create allocations

### Allocations
- `GET /allocations` - List allocations
- `GET /allocations/upcoming-renewals` - Get upcoming renewals
- `GET /allocations/overdue` - Get overdue renewals
- `POST /allocations` - Create manual allocation (Stores)
- `PUT /allocations/:id` - Update allocation
- `PUT /allocations/:id/renew` - Renew allocation

### Budgets
- `GET /budgets` - List budgets
- `GET /budgets/usage` - Get budget usage report
- `POST /budgets` - Create budget (Admin)
- `PUT /budgets/:id` - Update budget

### Failure Reports
- `GET /failures` - List failure reports
- `POST /failures` - Report PPE failure
- `PUT /failures/:id/review` - SHEQ review
- `PUT /failures/:id/resolve` - Mark as resolved

### Reports
- `GET /reports/allocations` - Allocation report
- `GET /reports/stock-levels` - Stock levels report
- `GET /reports/budget-utilization` - Budget report
- `GET /reports/premature-failures` - Failure analysis
- `GET /reports/employee-ppe-card/:id` - Employee PPE card

### Audit Logs
- `GET /audit` - List audit logs (Admin/SHEQ)
- `GET /audit/:id` - Get audit log details

## 🔐 Authentication & Authorization

### JWT Authentication
- Access tokens expire in 7 days (configurable)
- Refresh tokens expire in 30 days
- Tokens include: userId, roleId, role name, department, section

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, configuration |
| **Stores** | Stock management, fulfill requests, allocations |
| **HOD** | Approve department requests (first level) |
| **Dept Rep** | Approve requests (second level), view dept reports |
| **Section Rep** | Create requests, view section data |
| **SHEQ** | Override approvals, review failures, audit access |

## 🔄 Request Workflow

```
1. Section Rep creates request
   ↓
2. Status: PENDING → waiting for HOD
   ↓
3. HOD approves → Status: HOD-APPROVED
   ↓
4. Dept Rep approves → Status: DEPT-REP-APPROVED
   ↓
5. Stores approves → Status: STORES-APPROVED
   ↓
6. Stores fulfills → Creates allocations
   ↓
7. Status: COMPLETED
```

### Override Path:
SHEQ can override at any stage → Status: STORES-APPROVED (skip intermediate approvals)

## 📊 Data Models

### Request Status Flow
- `pending` → `hod-approved` → `dept-rep-approved` → `stores-approved` → `completed`
- `rejected` (at any stage)
- `cancelled` (by creator before approval)

### Allocation Status
- `active` - Currently in use
- `expired` - Past renewal date
- `replaced` - Replaced with new allocation
- `returned` - Returned to stores

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### API Testing
Use the provided Postman collection (to be created) or:

```bash
# Register user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@dgz.com","password":"admin123","fullName":"Admin User","roleId":"<role-uuid>"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dgz.com","password":"admin123"}'
```

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ppe_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=30d

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🛠️ Next Steps

### Immediate Tasks:
1. ✅ Database models created
2. ✅ Associations configured
3. ✅ App structure set up
4. ⏳ Create route handlers (in progress)
5. ⏳ Implement middleware (auth, validation, error handling)
6. ⏳ Create seed data
7. ⏳ Write API documentation
8. ⏳ Add unit tests
9. ⏳ Connect to frontend

### To Complete:
- [ ] Create all route files in `apps/` directories
- [ ] Implement JWT authentication middleware
- [ ] Add input validation middleware
- [ ] Create seed data script
- [ ] Set up audit logging middleware
- [ ] Implement file upload for documents
- [ ] Add rate limiting
- [ ] Create API documentation (Swagger)
- [ ] Write unit tests
- [ ] Set up CI/CD

## 📦 Dependencies

### Production
- **express** - Web framework
- **sequelize** - ORM for PostgreSQL
- **pg** - PostgreSQL client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cors** - CORS middleware
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **morgan** - HTTP logger
- **winston** - Application logger
- **multer** - File uploads
- **uuid** - UUID generation

### Development
- **nodemon** - Auto-restart on changes
- **jest** - Testing framework
- **supertest** - API testing

## 🤝 Integration with Frontend

Frontend can connect to this backend by:

1. Update frontend `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

2. Create API service in frontend:
```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    });
    return response.json();
  }
};
```

3. Replace localStorage state management with API calls

## 📄 License

ISC

## 👥 Author

Your Team

---

**Built with Node.js, Express, PostgreSQL & Sequelize**
