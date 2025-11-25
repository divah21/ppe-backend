const { User, Department, Section, Role } = require('../models');
const { sequelize } = require('./db');

async function updateUserAssignments() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Get departments and sections
    const opsDept = await Department.findOne({ where: { name: 'Operations' } });
    const laboratorySection = await Section.findOne({ 
      where: { name: 'Laboratory' },
      include: [{ model: Department, as: 'department' }]
    });

    if (!opsDept) {
      console.error('✗ Operations department not found');
      return;
    }

    console.log(`\n✓ Found Operations Department: ${opsDept.id}`);
    
    if (laboratorySection) {
      console.log(`✓ Found Laboratory Section: ${laboratorySection.id} (Department: ${laboratorySection.departmentId})`);
    }

    // Update section_rep - assign to Laboratory section
    const sectionRep = await User.findOne({ where: { username: 'section_rep' } });
    if (sectionRep && laboratorySection) {
      await sectionRep.update({
        sectionId: laboratorySection.id,
        departmentId: laboratorySection.departmentId
      });
      console.log(`\n✓ Updated section_rep:`);
      console.log(`  - sectionId: ${laboratorySection.id} (${laboratorySection.name})`);
      console.log(`  - departmentId: ${laboratorySection.departmentId} (${laboratorySection.department.name})`);
    } else {
      console.log('\n✗ section_rep user or Laboratory section not found');
    }

    // Update dept_rep - assign to Operations department
    const deptRep = await User.findOne({ where: { username: 'dept_rep' } });
    if (deptRep) {
      await deptRep.update({
        departmentId: opsDept.id,
        sectionId: null // Dept rep oversees entire department
      });
      console.log(`\n✓ Updated dept_rep:`);
      console.log(`  - departmentId: ${opsDept.id} (${opsDept.name})`);
      console.log(`  - sectionId: null (oversees all sections)`);
    } else {
      console.log('\n✗ dept_rep user not found');
    }

    // Update hod_ops - assign to Operations department
    const hodOps = await User.findOne({ where: { username: 'hod_ops' } });
    if (hodOps) {
      await hodOps.update({
        departmentId: opsDept.id,
        sectionId: null // HOD oversees entire department
      });
      console.log(`\n✓ Updated hod_ops:`);
      console.log(`  - departmentId: ${opsDept.id} (${opsDept.name})`);
      console.log(`  - sectionId: null (oversees all sections)`);
    } else {
      console.log('\n✗ hod_ops user not found');
    }

    // Update sheq_officer - no specific department/section (global role)
    const sheqOfficer = await User.findOne({ where: { username: 'sheq_officer' } });
    if (sheqOfficer) {
      await sheqOfficer.update({
        departmentId: null,
        sectionId: null
      });
      console.log(`\n✓ Updated sheq_officer:`);
      console.log(`  - departmentId: null (global access)`);
      console.log(`  - sectionId: null (global access)`);
    } else {
      console.log('\n✗ sheq_officer user not found');
    }

    // Verify updates
    console.log('\n\n=== VERIFICATION ===');
    const users = await User.findAll({
      where: {
        username: ['section_rep', 'dept_rep', 'hod_ops', 'sheq_officer']
      },
      include: [
        { model: Role, as: 'role', attributes: ['name'] },
        { model: Department, as: 'department', attributes: ['name'] },
        { model: Section, as: 'section', attributes: ['name'] }
      ]
    });

    console.table(users.map(u => ({
      username: u.username,
      role: u.role?.name,
      department: u.department?.name || 'N/A',
      section: u.section?.name || 'N/A'
    })));

    console.log('\n✓ User assignments updated successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error updating user assignments:', error);
    process.exit(1);
  }
}

updateUserAssignments();
