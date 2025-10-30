# TurboVets Task Manager

A secure, role-based task management system demonstrating enterprise-grade authentication, authorization, and multi-tenant data isolation.

**GitHub Repository:** https://github.com/swz22/jkim-2a7f3c8d-9b4e-4f1a-a3d2-5c8e9f1b6a7d

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/swz22/jkim-2a7f3c8d-9b4e-4f1a-a3d2-5c8e9f1b6a7d.git
cd jkim-2a7f3c8d-9b4e-4f1a-a3d2-5c8e9f1b6a7d

# 2. Install dependencies
npm install

# 3. Start PostgreSQL
docker-compose up -d

# 4. Run application (both frontend and backend)
npm run dev
```

**Alternative: Run separately in different terminals**

```bash
# Terminal 1 - Backend (NestJS)
npx nx serve api

# Terminal 2 - Frontend (Angular)
npx nx serve web
```

**Access the application:**

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api

**First-time setup:**

1. Navigate to http://localhost:4200
2. Click "Create one" to register
3. Fill in your details and organization name
4. You'll be logged in as OWNER with full permissions

---

## Architecture & Design Rationale

### Technology Stack

**Backend:** NestJS + TypeORM + PostgreSQL
**Frontend:** Angular 18 (standalone components) + TailwindCSS
**Infrastructure:** NX Monorepo + Docker

### Monorepo Structure

```

turbovets-task-manager/
├── apps/
│ ├── api/ # NestJS backend
│ │ ├── auth/ # JWT authentication
│ │ ├── database/ # TypeORM entities
│ │ ├── task/ # Task CRUD operations
│ │ └── user/ # User management
│ │
│ └── web/ # Angular frontend
│ ├── components/ # Login, Tasks, Users
│ ├── services/ # API integration
│ └── guards/ # Route protection
│
└── libs/shared-types/ # Shared DTOs and types

```

### Database Design

**Key entities:** Organization → Users → Tasks

Every entity includes `organizationId` to enforce data isolation. This multi-tenant architecture ensures users can only access data within their organization.

**Entity relationships:**

- Organization has many Users and Tasks
- User belongs to one Organization
- Task belongs to one Organization
- Task has creator and optional assignee (both Users)

### Design Decisions

**1. Organization-Level Scoping**

All database queries filter by `organizationId`:

```typescript
const tasks = await this.taskRepository.find({
  where: { organizationId: currentUser.organizationId },
});
```

This prevents data leakage between organizations and enables true multi-tenant architecture.

**2. Service-Layer Authorization**

Rather than relying solely on route guards, authorization is enforced at the service layer:

```typescript
// RBAC check before database operation
if (currentUser.role === UserRole.MEMBER && task.createdById !== currentUser.id) {
  throw new ForbiddenException('Members can only delete their own tasks');
}
```

This provides defense-in-depth security.

**3. JWT with Refresh Tokens**

- Access tokens: 15 minutes (limits exposure)
- Refresh tokens: 7 days (better UX)
- Tokens include userId, organizationId, and role for authorization

**4. NX Monorepo**

Enables code sharing (shared-types library) between frontend and backend, ensuring type safety across the full stack.

---

## Access Control & User Roles

### Role Hierarchy

**OWNER**

- First user who creates the organization
- Can create OWNER, ADMIN, and MEMBER users
- Full access to all tasks and user management

**ADMIN**

- Can create ADMIN and MEMBER users (not OWNERs)
- Full access to all tasks
- Can manage any task in the organization

**MEMBER**

- Cannot create users
- Can view all tasks but only edit/delete their own
- Limited task management permissions

### Security Implementation

**Authentication Flow:**

1. User registers → Creates organization + OWNER account
2. User logs in → Receives JWT access token + refresh token
3. All API requests include `Authorization: Bearer <token>` header
4. Backend validates JWT and extracts user context

**Authorization Enforcement:**

Global JWT guard protects all routes by default:

```typescript
@UseGuards(JwtAuthGuard) // Applied globally
export class AppModule {}
```

Public endpoints explicitly opt-out:

```typescript
@Public()
@Post('login')
async login() { ... }
```

Role-based checks in services:

```typescript
// Only OWNER/ADMIN can add users
if (currentUser.role === UserRole.MEMBER) {
  throw new ForbiddenException('Only owners and admins can add users');
}
```

**Key Security Features:**

- Passwords hashed with bcrypt (10 rounds)
- JWT secrets in environment variables
- Organization-scoped database queries
- TypeORM prevents SQL injection
- CORS restricted to frontend origin

---

## Example Workflows

### Workflow 1: User Registration & Task Creation

```bash
# 1. Register new organization
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@company.com",
    "password": "secure123",
    "firstName": "Jane",
    "lastName": "Smith",
    "organizationName": "Acme Corp"
  }'

# Response includes accessToken and user details

# 2. Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement authentication",
    "description": "Add JWT auth to API"
  }'

# 3. Get all tasks (organization-scoped)
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Workflow 2: User Management

```bash
# 1. Login as OWNER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@company.com",
    "password": "secure123"
  }'

# 2. Add ADMIN user to organization
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "firstName": "Bob",
    "lastName": "Johnson",
    "role": "ADMIN"
  }'

# Response includes temporary password to share with new user

# 3. New user logs in with temp password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "<TEMP_PASSWORD>"
  }'
```

### Workflow 3: Testing Organization Isolation

**Test:** Verify users in different organizations cannot see each other's data

1. Register User A with "Company A" → Create tasks
2. Register User B with "Company B" → Create tasks
3. As User A, call GET /api/tasks → See only Company A tasks
4. As User B, call GET /api/tasks → See only Company B tasks

**Expected result:** Complete data isolation between organizations.

### Workflow 4: Role-Based Permissions

**Test:** Verify MEMBER cannot delete other users' tasks

1. Login as OWNER → Create Task 1
2. Add MEMBER user → Login as MEMBER
3. As MEMBER, create Task 2 → Can delete Task 2 ✓
4. As MEMBER, try to delete Task 1 → Forbidden ✗

**Expected result:** 403 Forbidden error when MEMBER tries to delete OWNER's task.

### UI Workflow

1. **Register** → Navigate to http://localhost:4200 → Create account
2. **Create Tasks** → Click "+ Create New Task" → Fill form → Submit
3. **Edit Tasks** → Click "Edit" on any task → Modify inline → Save
4. **Manage Team** → Click "Team" → Add users with roles → Note temp password
5. **Logout** → Click "Sign Out" → Try accessing /tasks → Redirected to login

---

## Future Improvements

### High Priority

**Force Password Change on First Login**

- New users with temporary passwords should be required to change their password immediately
- Improves security and ensures users have control over credentials

**User Deletion**

- OWNER/ADMIN should be able to remove users from organization
- Include confirmation dialog: "Are you sure you want to remove this user?"
- Soft delete vs. hard delete considerations for audit trail

**Email Notifications**

- Send temporary passwords via email instead of displaying in UI
- Password reset links for forgotten passwords
- Task assignment notifications

### Additional Features

**Task Enhancements**

- Task assignment to specific users
- Due dates and priority levels
- Task comments for collaboration
- Search and advanced filtering

**Security Improvements**

- Two-factor authentication (2FA)
- Rate limiting on authentication endpoints
- Session management (view/revoke active sessions)

**Audit & Analytics**

- Complete audit logging for all CRUD operations
- Dashboard with task completion metrics
- Activity timeline

**Technical Debt**

- Unit and integration tests with Jest
- E2E tests with Cypress/Playwright
- API documentation with Swagger/OpenAPI
- Pagination for large datasets
- WebSocket support for real-time updates

---

## Design Highlights

**Core Strengths:**

1. **Security-First Architecture** - Every query enforces organization scoping; authorization happens at the service layer
2. **Type Safety** - Shared types library eliminates type mismatches between frontend/backend
3. **Production Patterns** - JWT refresh tokens, password hashing, global auth guards
4. **Developer Experience** - Single command to run everything (`npm run dev`)

**Key Trade-offs:**

- Chose inline editing over modal forms (faster UX, simpler code)
- Temporary passwords shown in UI vs. email (faster for assessment demo)
- Service-layer authorization over complex guard hierarchy (more maintainable)

---

## Development Notes

**AI Assistance:** This project was developed with some AI assistance. All design decisions, implementation details, and architectural choices were made with full understanding and can be explained in depth.

---

## Contact

**John Kim**
E-mail: jkdev220@gmail.com  
GitHub: [@swz22](https://github.com/swz22)

Thank you for the opportunity to work on this assessment!
