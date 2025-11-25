const { FailureReport, Employee, PPEItem, Allocation } = require('../models');

async function seedFailureReports() {
  try {
    console.log('🔧 Seeding failure reports...');

    // Get some employees and PPE items from the database
    const employees = await Employee.findAll({ limit: 8 });
    const ppeItems = await PPEItem.findAll({ limit: 10 });

    if (employees.length === 0 || ppeItems.length === 0) {
      console.log('⚠️  No employees or PPE items found. Please seed employees and PPE items first.');
      return;
    }

    const failureReports = [
      {
        employeeId: employees[0].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('boot'))?.id || ppeItems[0].id,
        description: 'Safety boots sole separated from upper after 6 months of use. Appears to be manufacturing defect as other employees report similar issues with same batch.',
        failureType: 'wear',
        severity: 'high',
        status: 'reported',
        observedAt: 'Section A - Underground Mining',
        reportedDate: new Date('2025-11-20'),
      },
      {
        employeeId: employees[1].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('hat') || p.name.toLowerCase().includes('helmet'))?.id || ppeItems[1].id,
        description: 'Hard hat cracked after impact with overhead pipe. Employee reported mild headache but no serious injury. Immediate replacement required.',
        failureType: 'damage',
        severity: 'critical',
        status: 'under-review',
        observedAt: 'Section C - Processing Plant',
        reportedDate: new Date('2025-11-22'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-22'),
        sheqDecision: 'Critical safety incident - investigating root cause. Employee cleared for duty after medical check.',
      },
      {
        employeeId: employees[2].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('glove'))?.id || ppeItems[2].id,
        description: 'Welding gloves showing thermal damage and holes in palm area. Employee continued using despite visible wear.',
        failureType: 'wear',
        severity: 'medium',
        status: 'resolved',
        observedAt: 'Engineering - Welding Bay',
        reportedDate: new Date('2025-11-18'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-19'),
        sheqDecision: 'Approved replacement. Reminder sent to supervisor about PPE inspection protocols.',
        actionTaken: 'Gloves replaced. Refresher training on PPE inspection scheduled for welding team.',
      },
      {
        employeeId: employees[3].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('goggle') || p.name.toLowerCase().includes('glasses'))?.id || ppeItems[3].id,
        description: 'Safety goggles lens scratched reducing visibility. Reported by employee during safety inspection.',
        failureType: 'wear',
        severity: 'medium',
        status: 'resolved',
        observedAt: 'Operations - Production Line 2',
        reportedDate: new Date('2025-11-15'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-16'),
        sheqDecision: 'Standard wear and tear. Approved for replacement.',
        actionTaken: 'New goggles issued. Old ones disposed as per protocol.',
      },
      {
        employeeId: employees[4].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('vest') || p.name.toLowerCase().includes('jacket'))?.id || ppeItems[4].id,
        description: 'High-visibility vest reflective strips fading significantly. Not meeting visibility standards for night shifts.',
        failureType: 'wear',
        severity: 'high',
        status: 'under-review',
        observedAt: 'Warehouse - Loading Bay',
        reportedDate: new Date('2025-11-21'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-23'),
        sheqDecision: 'Failed visibility test. Investigating batch quality with supplier.',
      },
      {
        employeeId: employees[5].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('respirator') || p.name.toLowerCase().includes('mask'))?.id || ppeItems[5].id,
        description: 'Respirator filter clogged prematurely, well before expected replacement date. Possible exposure to excess dust.',
        failureType: 'other',
        severity: 'critical',
        status: 'under-review',
        observedAt: 'Maintenance - Grinding Area',
        reportedDate: new Date('2025-11-23'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-23'),
        sheqDecision: 'Critical safety concern. Air quality testing ordered for grinding area.',
      },
      {
        employeeId: employees[6].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('boot'))?.id || ppeItems[0].id,
        description: 'Steel toe cap safety boots - toe cap detached from boot body. Manufacturing defect suspected.',
        failureType: 'defect',
        severity: 'critical',
        status: 'reported',
        observedAt: 'Plant Maintenance',
        reportedDate: new Date('2025-11-24'),
      },
      {
        employeeId: employees[7].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('harness'))?.id || ppeItems[6].id,
        description: 'Fall arrest harness strap showing fraying at attachment point. Discovered during routine inspection.',
        failureType: 'wear',
        severity: 'critical',
        status: 'resolved',
        observedAt: 'Equipment Maintenance - Elevated Work',
        reportedDate: new Date('2025-11-19'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-19'),
        sheqDecision: 'Critical equipment failure. Immediate replacement and work suspension until all harnesses inspected.',
        actionTaken: 'All harnesses inspected. 3 additional units replaced. Enhanced inspection protocol implemented.',
      },
      {
        employeeId: employees[1].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('glove'))?.id || ppeItems[2].id,
        description: 'Chemical resistant gloves degraded after contact with unknown substance. Material integrity compromised.',
        failureType: 'damage',
        severity: 'high',
        status: 'reported',
        observedAt: 'Operations - Chemical Storage',
        reportedDate: new Date('2025-11-23'),
      },
      {
        employeeId: employees[4].id,
        ppeItemId: ppeItems.find(p => p.name.toLowerCase().includes('ear') || p.name.toLowerCase().includes('hearing'))?.id || ppeItems[7].id,
        description: 'Ear defenders foam cushions deteriorated, reducing noise attenuation effectiveness.',
        failureType: 'wear',
        severity: 'medium',
        status: 'closed',
        observedAt: 'Operations - Noisy Machinery Area',
        reportedDate: new Date('2025-11-10'),
        reviewedBySHEQ: true,
        sheqReviewDate: new Date('2025-11-11'),
        sheqDecision: 'Normal wear pattern. Approved replacement.',
        actionTaken: 'Replaced. Audiometric testing confirmed no hearing damage.',
      },
    ];

    // Create failure reports
    const created = await FailureReport.bulkCreate(failureReports, {
      validate: true,
      individualHooks: true,
    });

    console.log(`✅ Successfully created ${created.length} failure reports`);

    // Display summary
    const statusCounts = await FailureReport.count({
      group: ['status'],
      raw: true,
    });

    const severityCounts = await FailureReport.count({
      group: ['severity'],
      raw: true,
    });

    console.log('\n📊 Failure Reports Summary:');
    console.log('   By Status:');
    statusCounts.forEach(s => console.log(`     - ${s.status}: ${s.count}`));
    console.log('   By Severity:');
    severityCounts.forEach(s => console.log(`     - ${s.severity}: ${s.count}`));

    return created;
  } catch (error) {
    console.error('❌ Error seeding failure reports:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('./db');
  
  sequelize.authenticate()
    .then(() => seedFailureReports())
    .then(() => {
      console.log('\n✅ Failure reports seeding completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to seed failure reports:', error);
      process.exit(1);
    });
}

module.exports = { seedFailureReports };
