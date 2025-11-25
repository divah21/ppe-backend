const { sequelize } = require('./db');

async function migrateRequestsTable() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    console.log('\n🔄 Starting requests table migration...\n');

    // Drop and recreate the requests table with new schema
    await sequelize.query('DROP TABLE IF EXISTS "requests" CASCADE;');
    console.log('✓ Dropped old requests table');

    // Create new requests table with all required columns
    await sequelize.query(`
      CREATE TABLE "requests" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "request_type" VARCHAR(50) NOT NULL,
        "comment" TEXT,
        "section_rep_approval_date" TIMESTAMPTZ,
        "section_rep_comment" TEXT,
        "dept_rep_approval_date" TIMESTAMPTZ,
        "dept_rep_comment" TEXT,
        "hod_approval_date" TIMESTAMPTZ,
        "hod_comment" TEXT,
        "stores_approval_date" TIMESTAMPTZ,
        "stores_comment" TEXT,
        "fulfilled_date" TIMESTAMPTZ,
        "rejection_reason" TEXT,
        "rejected_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "requested_by_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
        "section_rep_approver_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "dept_rep_approver_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "hod_approver_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "stores_approver_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "fulfilled_by_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "rejected_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
        "section_id" UUID REFERENCES "sections"("id") ON DELETE SET NULL
      );
    `);
    console.log('✓ Created new requests table with all columns');

    // Create indexes
    await sequelize.query('CREATE INDEX "requests_status_idx" ON "requests"("status");');
    await sequelize.query('CREATE INDEX "requests_requested_by_id_idx" ON "requests"("requested_by_id");');
    await sequelize.query('CREATE INDEX "requests_employee_id_idx" ON "requests"("employee_id");');
    await sequelize.query('CREATE INDEX "requests_department_id_idx" ON "requests"("department_id");');
    await sequelize.query('CREATE INDEX "requests_section_id_idx" ON "requests"("section_id");');
    console.log('✓ Created indexes');

    // Recreate request_items table
    await sequelize.query('DROP TABLE IF EXISTS "request_items" CASCADE;');
    console.log('✓ Dropped old request_items table');

    await sequelize.query(`
      CREATE TABLE "request_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "approved_quantity" INTEGER,
        "size" VARCHAR(50),
        "reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "request_id" UUID NOT NULL REFERENCES "requests"("id") ON DELETE CASCADE,
        "ppe_item_id" UUID NOT NULL REFERENCES "ppe_items"("id") ON DELETE CASCADE
      );
    `);
    console.log('✓ Created new request_items table');

    // Create indexes for request_items
    await sequelize.query('CREATE INDEX "request_items_request_id_idx" ON "request_items"("request_id");');
    await sequelize.query('CREATE INDEX "request_items_ppe_item_id_idx" ON "request_items"("ppe_item_id");');
    console.log('✓ Created request_items indexes');

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📋 Requests table schema:');
    console.log('   - status (with enum: pending, dept-rep-review, hod-review, stores-review, approved, fulfilled, rejected, cancelled)');
    console.log('   - All approval date and comment fields');
    console.log('   - All approver foreign keys');
    console.log('   - Department and section tracking');
    console.log('   - Proper indexes for performance\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateRequestsTable();
