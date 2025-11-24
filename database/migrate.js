const { sequelize } = require('./db');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Add new columns to ppe_items (use underscored column names)
    console.log('📝 Adding columns to ppe_items...');
    await sequelize.query(`
      ALTER TABLE ppe_items 
      ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_ref_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'PPE',
      ADD COLUMN IF NOT EXISTS heavy_use_frequency INTEGER,
      ADD COLUMN IF NOT EXISTS account_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS account_description VARCHAR(255),
      ADD COLUMN IF NOT EXISTS has_size_variants BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_color_variants BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS size_scale VARCHAR(50);
    `);
    console.log('✅ ppe_items updated\n');

    // Add new columns to stocks (use underscored column names)
    console.log('📝 Adding columns to stocks...');
    await sequelize.query(`
      ALTER TABLE stocks 
      ADD COLUMN IF NOT EXISTS max_level INTEGER,
      ADD COLUMN IF NOT EXISTS reorder_point INTEGER,
      ADD COLUMN IF NOT EXISTS bin_location VARCHAR(50),
      ADD COLUMN IF NOT EXISTS color VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_stock_take TIMESTAMP,
      ADD COLUMN IF NOT EXISTS unit_price_usd DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS total_value_usd DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS stock_account VARCHAR(50);
    `);
    console.log('✅ stocks updated\n');

    // Create size_scales and sizes tables
    console.log('📝 Creating size_scales and sizes tables...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS size_scales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category_group VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_size_scales_category ON size_scales(category_group);

      CREATE TABLE IF NOT EXISTS sizes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scale_id UUID NOT NULL REFERENCES size_scales(id) ON DELETE CASCADE,
        value VARCHAR(50) NOT NULL,
        label VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        eu_size VARCHAR(20),
        us_size VARCHAR(20),
        uk_size VARCHAR(20),
        meta JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_scale_value UNIQUE (scale_id, value)
      );
      CREATE INDEX IF NOT EXISTS idx_sizes_scale ON sizes(scale_id);
      CREATE INDEX IF NOT EXISTS idx_sizes_sort ON sizes(sort_order);
    `);
    console.log('✅ sizes infrastructure created\n');

    // Add departmentId to cost_centers if table exists
    console.log('📝 Checking cost_centers table...');
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cost_centers';
    `);
    
    if (tables.length > 0) {
      await sequelize.query(`
        ALTER TABLE cost_centers 
        ADD COLUMN IF NOT EXISTS "departmentId" UUID;
      `);
      console.log('✅ cost_centers updated\n');
    } else {
      console.log('⏭️  cost_centers table does not exist yet\n');
    }

    // Drop and recreate job_title_ppe_matrix if it exists with issues
    console.log('📝 Creating job_title_ppe_matrix table...');
    await sequelize.query(`DROP TABLE IF EXISTS job_title_ppe_matrix CASCADE;`);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_title_ppe_matrix (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_title VARCHAR(100) NOT NULL,
        ppe_item_id UUID NOT NULL REFERENCES ppe_items(id) ON DELETE CASCADE,
        quantity_required INTEGER NOT NULL DEFAULT 1,
        replacement_frequency INTEGER,
        heavy_use_frequency INTEGER,
        is_mandatory BOOLEAN DEFAULT true,
        category VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_job_title_ppe_item UNIQUE (job_title, ppe_item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_matrix_job_title ON job_title_ppe_matrix(job_title);
      CREATE INDEX IF NOT EXISTS idx_matrix_ppe_item ON job_title_ppe_matrix(ppe_item_id);
      CREATE INDEX IF NOT EXISTS idx_matrix_category ON job_title_ppe_matrix(category);
    `);
    console.log('✅ job_title_ppe_matrix table created\n');

    console.log('✅ All migrations completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
