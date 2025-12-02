# Database Migrations

This folder contains database migration scripts for the PPE System.

## Quick Start - New Database Setup

For a fresh database installation, run migrations in this order:

```bash
# 1. Run all migrations
node database/runAllMigrations.js

# 2. Sync Sequelize models (creates/updates tables)
node database/syncTables.js

# 3. Seed initial data (roles, users, departments, etc.)
node database/seedData.js
```

## Production Database Setup

When deploying to production or a new environment:

1. **Ensure PostgreSQL is running** and connection details are in `.env`
2. **Run migrations**: `node database/runAllMigrations.js`
3. **Sync models**: `node database/syncTables.js`
4. **Seed data**: `node database/seedData.js`

The migrations are **idempotent** - they check if changes already exist before applying them, so it's safe to run them multiple times.

## Individual Migrations

If you need to run specific migrations:

### Core Table Structure
- `addJobTitlesTable.js` - Creates job_titles table and links to employees/matrix
- `addMatrixIsActiveColumn.js` - Adds is_active flag to PPE matrix
- `addMatrixJobTitleIdIndex.js` - Performance indexes for matrix queries

### PPE Items Enhancements
- `addVariantFields.js` - Adds available_sizes and available_colors (JSONB)

### Requests Table Enhancements
- `migrate-requests-enhancements.js` - **Comprehensive migration** including:
  - SHEQ approval workflow fields (sheq_approval_date, sheq_comment, sheq_approver_id)
  - Emergency/visitor request support (is_emergency_visitor field)
  - Makes employee_id nullable for guest/visitor requests
  - Adds 'sheq-review' to status enum
  - Ensures all request types exist (new, replacement, emergency, annual)

### Legacy Individual Migrations (now consolidated)
These are still available but covered by `migrate-requests-enhancements.js`:
- `addSheqFields.js` - SHEQ workflow fields
- `addIsEmergencyVisitorField.js` - Guest/visitor support
- `makeEmployeeIdNullable.js` - Nullable employee_id

## Model Changes

When adding new fields to models, you have two options:

### Option 1: Update Model + Run Migration (Recommended for Production)
1. Update the Sequelize model in `models/`
2. Create a migration script in `database/`
3. Run the migration: `node database/your-migration.js`

### Option 2: Sync Models (Development Only)
```bash
node database/syncTables.js
```
⚠️ **Warning**: `sync({ alter: true })` can cause data loss in production. Always use migrations for production.

## Migration Best Practices

1. **Always check if change exists** before applying (idempotent)
2. **Use snake_case** for PostgreSQL column names (not camelCase)
3. **Set default values** when adding NOT NULL columns
4. **Test on development** before running on production
5. **Add to runAllMigrations.js** if it should run on fresh installs

## Database Schema Updates

After running migrations, the Sequelize models should reflect the database schema. Key fields updated:

### Request Model (`models/request.js`)
```javascript
{
  employeeId: { type: UUID, allowNull: true },  // Nullable for guest/visitor
  requestedById: { type: UUID, allowNull: false },
  isEmergencyVisitor: { type: BOOLEAN, default: false },
  sheqApprovalDate: { type: DATE, allowNull: true },
  sheqComment: { type: TEXT, allowNull: true },
  sheqApproverId: { type: UUID, allowNull: true }
}
```

## Troubleshooting

### Migration fails with "column already exists"
- The migration is idempotent and should skip existing columns
- Check the error details - might be a different issue

### Sequelize model doesn't match database
- Run: `node database/syncTables.js`
- Check model definitions in `models/` folder
- Ensure `underscored: true` is set for snake_case

### ENUM values not updating
- PostgreSQL ENUM types can't remove values easily
- Add new values with `ALTER TYPE ... ADD VALUE`
- For removals, consider creating a new enum type

## Files Overview

| File | Purpose |
|------|---------|
| `runAllMigrations.js` | Master script - runs all migrations |
| `syncTables.js` | Syncs Sequelize models with database |
| `seedData.js` | Seeds initial data (roles, users, etc.) |
| `migrate-requests-enhancements.js` | Comprehensive requests table updates |
| `db.js` | Database connection configuration |

## Environment Variables

Required in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ppe_system
DB_USER=postgres
DB_PASSWORD=your_password
```
