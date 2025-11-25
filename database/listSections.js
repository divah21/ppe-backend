const { Section, Department, User } = require('../models');
const { sequelize } = require('./db');

(async () => {
  await sequelize.authenticate();
  
  console.log('\n=== AVAILABLE SECTIONS ===\n');
  const sections = await Section.findAll({ 
    include: [{ model: Department, as: 'department' }],
    order: [['createdAt', 'ASC']]
  });
  
  sections.forEach(s => {
    console.log(`${s.name.padEnd(35)} | Dept: ${s.department.name.padEnd(20)} | ID: ${s.id}`);
  });

  // Assign section_rep to first available section (or a specific one)
  const sectionRep = await User.findOne({ where: { username: 'section_rep' } });
  const firstSection = sections[0];
  
  if (sectionRep && firstSection) {
    await sectionRep.update({
      sectionId: firstSection.id,
      departmentId: firstSection.departmentId
    });
    console.log(`\n✓ Assigned section_rep to:`);
    console.log(`  Section: ${firstSection.name}`);
    console.log(`  Department: ${firstSection.department.name}`);
  }

  process.exit(0);
})();
