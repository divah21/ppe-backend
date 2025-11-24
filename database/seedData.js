const { sequelize } = require('./db');
const {
  Role,
  User,
  Department,
  Section,
  Employee,
  PPEItem,
  Stock
} = require('../models');

const seedData = async () => {
  try {
    console.log('Starting database seeding...');

    // Sync database first
    await sequelize.sync({ force: true });
    console.log('Database synced successfully');

    // 0. Seed Size Scales and Sizes (standardized sizing)
    console.log('Seeding size scales and sizes...');
    const { SizeScale, Size } = require('../models');

    // Create scales
    const scales = await SizeScale.bulkCreate([
      { code: 'GARMENT_NUM', name: 'Garment Numeric (34-50)', categoryGroup: 'BODY' },
      { code: 'ALPHA', name: 'Alpha (XS-3XL)', categoryGroup: 'BODY' },
      { code: 'FOOTWEAR_NUM', name: 'Footwear Numeric (4-13)', categoryGroup: 'FEET' },
      { code: 'GLOVE_NUM', name: 'Glove Numeric (7-12)', categoryGroup: 'HANDS' },
      { code: 'STD', name: 'Standard (Std)', categoryGroup: 'GENERAL' }
    ]);

    const scaleMap = {};
    scales.forEach(s => { scaleMap[s.code] = s; });

    // Helper to bulk add sizes
    const addSizes = async (scaleCode, values) => {
      const scale = scaleMap[scaleCode];
      if (!scale) return;
      const rows = values.map((v, i) => ({
        scaleId: scale.id,
        value: String(v),
        label: String(v),
        sortOrder: i
      }));
      await Size.bulkCreate(rows, { ignoreDuplicates: true });
    };

    await addSizes('GARMENT_NUM', ['34','36','38','40','42','44','46','48','50']);
    await addSizes('ALPHA', ['XS','S','M','L','XL','2XL','3XL']);
    await addSizes('FOOTWEAR_NUM', ['4','5','6','7','8','9','10','11','12','13']);
    await addSizes('GLOVE_NUM', ['7','8','9','10','11','12']);
    await addSizes('STD', ['Std']);
    console.log('✓ Size scales and sizes seeded');

    // 1. Seed Roles
    console.log('Seeding roles...');
    const roles = await Role.bulkCreate([
      {
        name: 'admin',
        description: 'System Administrator',
        permissions: ['all']
      },
      {
        name: 'stores',
        description: 'Stores Personnel',
        permissions: ['manage_stock', 'manage_allocations', 'approve_requests', 'view_reports']
      },
      {
        name: 'section-rep',
        description: 'Section Representative',
        permissions: ['create_requests', 'view_employees', 'view_allocations']
      },
      {
        name: 'department-rep',
        description: 'Department Representative',
        permissions: ['approve_requests', 'view_reports', 'manage_employees', 'view_budget']
      },
      {
        name: 'hod-hos',
        description: 'Head of Department/Head of Section',
        permissions: ['approve_requests', 'view_reports', 'manage_budget', 'view_employees']
      },
      {
        name: 'sheq',
        description: 'SHEQ Officer',
        permissions: ['review_failures', 'view_reports', 'manage_compliance']
      }
    ]);
    console.log(`✓ Created ${roles.length} roles`);

    // 2. Seed Departments
    console.log('Seeding departments...');
    const departments = await Department.bulkCreate([
      { name: 'Engineering', code: 'ENG', description: 'Engineering Department' },
      { name: 'Operations', code: 'OPS', description: 'Operations Department' },
      { name: 'Maintenance', code: 'MAINT', description: 'Maintenance Department' },
      { name: 'Safety', code: 'SAFE', description: 'Safety Department' },
      { name: 'Administration', code: 'ADMIN', description: 'Administration Department' }
    ]);
    console.log(`✓ Created ${departments.length} departments`);

    // 3. Seed Sections
    console.log('Seeding sections...');
    const sections = await Section.bulkCreate([
      { name: 'Mechanical', departmentId: departments[0].id, description: 'Mechanical Engineering' },
      { name: 'Electrical', departmentId: departments[0].id, description: 'Electrical Engineering' },
      { name: 'Production', departmentId: departments[1].id, description: 'Production Operations' },
      { name: 'Quality Control', departmentId: departments[1].id, description: 'Quality Control' },
      { name: 'Plant Maintenance', departmentId: departments[2].id, description: 'Plant Maintenance' },
      { name: 'Equipment Maintenance', departmentId: departments[2].id, description: 'Equipment Maintenance' },
      { name: 'SHEQ', departmentId: departments[3].id, description: 'Safety, Health, Environment & Quality' },
      { name: 'HR', departmentId: departments[4].id, description: 'Human Resources' }
    ]);
    console.log(`✓ Created ${sections.length} sections`);

    // 4. Seed Users
    console.log('Seeding users...');
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@ppe-system.com',
        passwordHash: 'Admin@123', // Will be hashed by hook
        firstName: 'System',
        lastName: 'Administrator',
        roleId: roles[0].id
      },
      {
        username: 'stores_mgr',
        email: 'stores@ppe-system.com',
        passwordHash: 'Stores@123',
        firstName: 'John',
        lastName: 'Stores',
        roleId: roles[1].id
      },
      {
        username: 'section_rep1',
        email: 'section1@ppe-system.com',
        passwordHash: 'Section@123',
        firstName: 'Alice',
        lastName: 'Section',
        roleId: roles[2].id,
        departmentId: departments[0].id
      },
      {
        username: 'dept_rep1',
        email: 'dept1@ppe-system.com',
        passwordHash: 'DeptRep@123',
        firstName: 'Bob',
        lastName: 'Department',
        roleId: roles[3].id,
        departmentId: departments[0].id
      },
      {
        username: 'hod1',
        email: 'hod1@ppe-system.com',
        passwordHash: 'HOD@123',
        firstName: 'Carol',
        lastName: 'Head',
        roleId: roles[4].id,
        departmentId: departments[0].id
      },
      {
        username: 'sheq_officer',
        email: 'sheq@ppe-system.com',
        passwordHash: 'SHEQ@123',
        firstName: 'David',
        lastName: 'Safety',
        roleId: roles[5].id,
        departmentId: departments[3].id
      }
    ], { individualHooks: true }); // Enable hooks for password hashing
    console.log(`✓ Created ${users.length} users`);

    // 5. Seed Employees
    console.log('Seeding employees...');
    const employees = await Employee.bulkCreate([
      {
        worksNumber: 'EMP001',
        firstName: 'Neil',
        lastName: 'Thompson',
        jobType: 'Welder',
        sectionId: sections[0].id,
        email: 'neil.thompson@company.com',
        phoneNumber: '+263 71 123 4567'
      },
      {
        worksNumber: 'EMP002',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        jobType: 'Electrician',
        sectionId: sections[1].id,
        email: 'sarah.mitchell@company.com',
        phoneNumber: '+263 71 234 5678'
      },
      {
        worksNumber: 'EMP003',
        firstName: 'James',
        lastName: 'Carter',
        jobType: 'Forklift Operator',
        sectionId: sections[2].id,
        email: 'james.carter@company.com',
        phoneNumber: '+263 71 345 6789'
      },
      {
        worksNumber: 'EMP004',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        jobType: 'Machine Operator',
        sectionId: sections[2].id,
        email: 'emily.rodriguez@company.com',
        phoneNumber: '+263 71 456 7890'
      },
      {
        worksNumber: 'EMP005',
        firstName: 'Michael',
        lastName: 'Chen',
        jobType: 'Warehouse Clerk',
        sectionId: sections[3].id,
        email: 'michael.chen@company.com',
        phoneNumber: '+263 71 567 8901'
      },
      {
        worksNumber: 'EMP006',
        firstName: 'Lisa',
        lastName: 'Anderson',
        jobType: 'Safety Officer',
        sectionId: sections[6].id,
        email: 'lisa.anderson@company.com',
        phoneNumber: '+263 71 678 9012'
      },
      {
        worksNumber: 'EMP007',
        firstName: 'Robert',
        lastName: 'Williams',
        jobType: 'Maintenance Technician',
        sectionId: sections[4].id,
        email: 'robert.williams@company.com',
        phoneNumber: '+263 71 789 0123'
      },
      {
        worksNumber: 'EMP008',
        firstName: 'Jennifer',
        lastName: 'Brown',
        jobType: 'Painter',
        sectionId: sections[5].id,
        email: 'jennifer.brown@company.com',
        phoneNumber: '+263 71 890 1234'
      }
    ]);
    console.log(`✓ Created ${employees.length} employees`);

    // 6. Seed PPE Items
    console.log('Seeding PPE items...');
    const ppeItems = await PPEItem.bulkCreate([
      {
        name: 'Safety Helmet',
        itemCode: 'PPE-HELM-001',
        category: 'Head Protection',
        replacementFrequency: 24,
        isMandatory: true,
        description: 'Hard hat for head protection'
      },
      {
        name: 'Safety Boots',
        itemCode: 'PPE-BOOT-001',
        category: 'Foot Protection',
        replacementFrequency: 12,
        isMandatory: true,
        description: 'Steel toe cap boots'
      },
      {
        name: 'Safety Gloves',
        itemCode: 'PPE-GLOV-001',
        category: 'Hand Protection',
        replacementFrequency: 3,
        isMandatory: true,
        description: 'General purpose work gloves'
      },
      {
        name: 'Welding Gloves',
        itemCode: 'PPE-GLOV-002',
        category: 'Hand Protection',
        replacementFrequency: 6,
        isMandatory: false,
        description: 'Heat resistant welding gloves'
      },
      {
        name: 'Safety Goggles',
        itemCode: 'PPE-GOGG-001',
        category: 'Eye Protection',
        replacementFrequency: 12,
        isMandatory: true,
        description: 'Impact resistant safety goggles'
      },
      {
        name: 'Welding Helmet',
        itemCode: 'PPE-WELD-001',
        category: 'Head Protection',
        replacementFrequency: 24,
        isMandatory: false,
        description: 'Auto-darkening welding helmet'
      },
      {
        name: 'Hi-Vis Vest',
        itemCode: 'PPE-VEST-001',
        category: 'Body Protection',
        replacementFrequency: 12,
        isMandatory: true,
        description: 'High visibility safety vest'
      },
      {
        name: 'Dust Mask',
        itemCode: 'PPE-MASK-001',
        category: 'Respiratory Protection',
        replacementFrequency: 1,
        isMandatory: false,
        description: 'Disposable dust mask'
      },
      {
        name: 'Respirator',
        itemCode: 'PPE-RESP-001',
        category: 'Respiratory Protection',
        replacementFrequency: 12,
        isMandatory: false,
        description: 'Half-face respirator'
      },
      {
        name: 'Ear Plugs',
        itemCode: 'PPE-EAR-001',
        category: 'Hearing Protection',
        replacementFrequency: 1,
        isMandatory: true,
        description: 'Disposable foam ear plugs'
      },
      {
        name: 'Ear Muffs',
        itemCode: 'PPE-EAR-002',
        category: 'Hearing Protection',
        replacementFrequency: 24,
        isMandatory: false,
        description: 'Over-ear hearing protection'
      },
      {
        name: 'Coveralls',
        itemCode: 'PPE-COV-001',
        category: 'Body Protection',
        replacementFrequency: 12,
        isMandatory: false,
        description: 'Full body coveralls'
      },
      {
        name: 'Apron (Leather)',
        itemCode: 'PPE-APR-001',
        category: 'Body Protection',
        replacementFrequency: 12,
        isMandatory: false,
        description: 'Leather welding apron'
      },
      {
        name: 'Face Shield',
        itemCode: 'PPE-FACE-001',
        category: 'Face Protection',
        replacementFrequency: 12,
        isMandatory: false,
        description: 'Clear face shield'
      },
      {
        name: 'Knee Pads',
        itemCode: 'PPE-KNEE-001',
        category: 'Knee Protection',
        replacementFrequency: 12,
        isMandatory: false,
        description: 'Protective knee pads'
      }
    ]);
    console.log(`✓ Created ${ppeItems.length} PPE items`);

    // 7. Seed Stock
    console.log('Seeding stock...');
    const stockItems = await Stock.bulkCreate([
      { ppeItemId: ppeItems[0].id, quantity: 150, minLevel: 30, unitCost: 15.50, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[1].id, quantity: 200, minLevel: 40, unitCost: 45.00, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[2].id, quantity: 500, minLevel: 100, unitCost: 3.50, supplier: 'WorkGear Inc' },
      { ppeItemId: ppeItems[3].id, quantity: 80, minLevel: 20, unitCost: 12.00, supplier: 'WeldSupply Co' },
      { ppeItemId: ppeItems[4].id, quantity: 250, minLevel: 50, unitCost: 8.50, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[5].id, quantity: 45, minLevel: 10, unitCost: 125.00, supplier: 'WeldSupply Co' },
      { ppeItemId: ppeItems[6].id, quantity: 300, minLevel: 60, unitCost: 12.00, supplier: 'WorkGear Inc' },
      { ppeItemId: ppeItems[7].id, quantity: 1000, minLevel: 200, unitCost: 0.50, supplier: 'MedSupply' },
      { ppeItemId: ppeItems[8].id, quantity: 60, minLevel: 15, unitCost: 35.00, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[9].id, quantity: 2000, minLevel: 400, unitCost: 0.25, supplier: 'MedSupply' },
      { ppeItemId: ppeItems[10].id, quantity: 100, minLevel: 20, unitCost: 22.00, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[11].id, quantity: 120, minLevel: 25, unitCost: 28.00, supplier: 'WorkGear Inc' },
      { ppeItemId: ppeItems[12].id, quantity: 35, minLevel: 10, unitCost: 18.00, supplier: 'WeldSupply Co' },
      { ppeItemId: ppeItems[13].id, quantity: 150, minLevel: 30, unitCost: 6.50, supplier: 'SafetyPro Ltd' },
      { ppeItemId: ppeItems[14].id, quantity: 75, minLevel: 15, unitCost: 15.00, supplier: 'WorkGear Inc' }
    ]);
    console.log(`✓ Created ${stockItems.length} stock items`);

    console.log('\n✓✓✓ Database seeding completed successfully! ✓✓✓\n');
    console.log('Default credentials:');
    console.log('-------------------');
    console.log('Admin:        username: admin         password: Admin@123');
    console.log('Stores:       username: stores_mgr    password: Stores@123');
    console.log('Section Rep:  username: section_rep1  password: Section@123');
    console.log('Dept Rep:     username: dept_rep1     password: DeptRep@123');
    console.log('HOD:          username: hod1          password: HOD@123');
    console.log('SHEQ:         username: sheq_officer  password: SHEQ@123\n');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run seed if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
