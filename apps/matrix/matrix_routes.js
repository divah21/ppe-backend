const express = require('express');
const router = express.Router();
const { JobTitlePPEMatrix, SectionPPEMatrix, PPEItem, Employee, JobTitle, Section, Department } = require('../../models');
const { sequelize } = require('../../database/db');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');
const { buildTableExcel, buildTablePdf, buildTablesExcel, buildTablesPdf } = require('../../helpers/report_table_helper');

console.log('[MATRIX ROUTES] Module loaded at', new Date().toISOString());

// Column layout shared by the job-title matrix Excel + PDF export
const JOB_TITLE_MATRIX_COLUMNS = [
  { header: 'Job Title', key: 'jobTitle', width: 28, w: 0.2 },
  { header: 'PPE Item', key: 'itemName', width: 30, w: 0.22 },
  { header: 'Item Code', key: 'itemCode', width: 16, w: 0.12 },
  { header: 'Category', key: 'category', width: 18, w: 0.16 },
  { header: 'Qty Required', key: 'quantityRequired', width: 13, w: 0.1, align: 'center' },
  { header: 'Replacement (months)', key: 'replacementFrequency', width: 20, w: 0.12, align: 'center' },
  { header: 'Mandatory', key: 'mandatory', width: 12, w: 0.08, align: 'center' }
];

// Column layout for the section matrix (also used by the combined report)
const SECTION_MATRIX_COLUMNS = [
  { header: 'Section', key: 'sectionName', width: 24, w: 0.18 },
  { header: 'Department', key: 'departmentName', width: 22, w: 0.16 },
  { header: 'PPE Item', key: 'itemName', width: 30, w: 0.2 },
  { header: 'Item Code', key: 'itemCode', width: 16, w: 0.12 },
  { header: 'Category', key: 'category', width: 18, w: 0.14 },
  { header: 'Qty Required', key: 'quantityRequired', width: 13, w: 0.08, align: 'center' },
  { header: 'Replacement (months)', key: 'replacementFrequency', width: 20, w: 0.08, align: 'center' },
  { header: 'Mandatory', key: 'mandatory', width: 12, w: 0.06, align: 'center' }
];

// Column layout for the employee PPE matrix report (employee -> their matrix)
const EMPLOYEE_MATRIX_COLUMNS = [
  { header: 'Employee', key: 'employeeName', width: 26, w: 0.13 },
  { header: 'Works No.', key: 'worksNumber', width: 13, w: 0.07 },
  { header: 'Section', key: 'sectionName', width: 20, w: 0.11 },
  { header: 'Department', key: 'departmentName', width: 20, w: 0.11 },
  { header: 'Job Title', key: 'jobTitle', width: 20, w: 0.11 },
  { header: 'PPE Item', key: 'itemName', width: 28, w: 0.16 },
  { header: 'Item Code', key: 'itemCode', width: 14, w: 0.08 },
  { header: 'Category', key: 'category', width: 16, w: 0.09 },
  { header: 'Qty', key: 'quantityRequired', width: 7, w: 0.05, align: 'center' },
  { header: 'Replacement (months)', key: 'replacementFrequency', width: 20, w: 0.06, align: 'center' },
  { header: 'Mandatory', key: 'mandatory', width: 11, w: 0.03, align: 'center' }
];

/**
 * Build per-employee PPE matrix rows: every employee with their section and the
 * PPE matrix that applies to them. Eligibility is merged from the Section matrix
 * (baseline) and the Job Title matrix (override) — mirroring request validation.
 * Rows are grouped per employee (repeated employee identity is blanked).
 */
async function getEmployeeMatrixRows({ sectionId, departmentId } = {}) {
  // 1. Employees (optionally filtered by section / department)
  const employeeWhere = { isActive: true };
  if (sectionId) employeeWhere.sectionId = sectionId;
  const sectionInclude = {
    model: Section,
    as: 'section',
    required: !!departmentId,
    where: departmentId ? { departmentId } : undefined,
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
  };
  const employees = await Employee.findAll({
    where: employeeWhere,
    attributes: ['id', 'firstName', 'lastName', 'worksNumber', 'sectionId', 'jobTitleId', 'jobTitle'],
    include: [
      sectionInclude,
      { model: JobTitle, as: 'jobTitleRef', attributes: ['id', 'name', 'ppeCategoryId'], required: false }
    ]
  });

  // 2. Matrix sources, grouped into maps (batched — no N+1)
  const sectionEntries = await SectionPPEMatrix.findAll({
    where: { isActive: true },
    include: [{ model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category'] }]
  });
  const jobTitleEntries = await JobTitlePPEMatrix.findAll({
    where: { isActive: true },
    include: [{ model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category'] }]
  });

  const sectionMap = new Map(); // sectionId -> entries[]
  for (const e of sectionEntries) {
    const k = e.sectionId;
    if (!sectionMap.has(k)) sectionMap.set(k, []);
    sectionMap.get(k).push(e.toJSON());
  }
  const jobTitleMap = new Map(); // jobTitleId -> entries[]
  for (const e of jobTitleEntries) {
    if (!e.jobTitleId) continue;
    const k = e.jobTitleId;
    if (!jobTitleMap.has(k)) jobTitleMap.set(k, []);
    jobTitleMap.get(k).push(e.toJSON());
  }

  // 3. Sort employees by section then name so each person's rows are contiguous
  const sortedEmployees = employees
    .map((e) => e.toJSON())
    .sort((a, b) => {
      const sa = (a.section && a.section.name) || '';
      const sb = (b.section && b.section.name) || '';
      if (sa !== sb) return sa.localeCompare(sb);
      const na = `${a.firstName || ''} ${a.lastName || ''}`;
      const nb = `${b.firstName || ''} ${b.lastName || ''}`;
      return na.localeCompare(nb);
    });

  const rows = [];
  for (const emp of sortedEmployees) {
    const section = emp.section || {};
    const department = section.department || {};
    const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Unknown';
    const jobTitleName = (emp.jobTitleRef && emp.jobTitleRef.name) || emp.jobTitle || '';

    // Merge: section baseline, then job title override (by ppeItemId)
    const matrixJobTitleId = (emp.jobTitleRef && emp.jobTitleRef.ppeCategoryId) || emp.jobTitleId;
    const merged = new Map();
    for (const entry of sectionMap.get(emp.sectionId) || []) {
      merged.set(entry.ppeItemId, entry);
    }
    for (const entry of jobTitleMap.get(matrixJobTitleId) || []) {
      merged.set(entry.ppeItemId, entry);
    }

    const items = Array.from(merged.values()).sort((a, b) => {
      const ca = a.category || (a.ppeItem && a.ppeItem.category) || '';
      const cb = b.category || (b.ppeItem && b.ppeItem.category) || '';
      if (ca !== cb) return ca.localeCompare(cb);
      const na = (a.ppeItem && a.ppeItem.name) || '';
      const nb = (b.ppeItem && b.ppeItem.name) || '';
      return na.localeCompare(nb);
    });

    const identity = {
      employeeName: fullName,
      worksNumber: emp.worksNumber || '',
      sectionName: section.name || '',
      departmentName: department.name || '',
      jobTitle: jobTitleName
    };

    if (items.length === 0) {
      rows.push({
        ...identity,
        itemName: '— No PPE matrix defined —',
        itemCode: '',
        category: '',
        quantityRequired: '',
        replacementFrequency: '',
        mandatory: ''
      });
      continue;
    }

    items.forEach((entry, idx) => {
      const ppeItem = entry.ppeItem || {};
      rows.push({
        // Blank repeated identity within the employee group for visual grouping
        employeeName: idx === 0 ? identity.employeeName : '',
        worksNumber: idx === 0 ? identity.worksNumber : '',
        sectionName: idx === 0 ? identity.sectionName : '',
        departmentName: idx === 0 ? identity.departmentName : '',
        jobTitle: idx === 0 ? identity.jobTitle : '',
        itemName: ppeItem.name || 'Unknown Item',
        itemCode: ppeItem.itemCode || ppeItem.itemRefCode || '',
        category: entry.category || ppeItem.category || '',
        quantityRequired: entry.quantityRequired != null ? entry.quantityRequired : '',
        replacementFrequency: entry.replacementFrequency != null ? entry.replacementFrequency : '',
        mandatory: entry.isMandatory ? 'Yes' : 'No'
      });
    });
  }

  return { rows, employeeCount: sortedEmployees.length };
}

// Fetch + normalize all job-title matrix rows (optionally filtered)
async function getJobTitleMatrixRows(where = {}) {
  const entries = await JobTitlePPEMatrix.findAll({
    where: { isActive: true, ...where },
    include: [
      { model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category'] },
      { model: JobTitle, as: 'jobTitleRef', attributes: ['name'], required: false }
    ],
    order: [['jobTitle', 'ASC'], ['category', 'ASC']]
  });
  return entries.map((e) => {
    const obj = e.toJSON();
    return {
      jobTitle: (obj.jobTitleRef && obj.jobTitleRef.name) || obj.jobTitle || '',
      itemName: (obj.ppeItem && obj.ppeItem.name) || 'Unknown Item',
      itemCode: (obj.ppeItem && (obj.ppeItem.itemCode || obj.ppeItem.itemRefCode)) || '',
      category: obj.category || (obj.ppeItem && obj.ppeItem.category) || '',
      quantityRequired: obj.quantityRequired != null ? obj.quantityRequired : '',
      replacementFrequency: obj.replacementFrequency != null ? obj.replacementFrequency : '',
      mandatory: obj.isMandatory ? 'Yes' : 'No'
    };
  });
}

// Fetch + normalize all section matrix rows
async function getSectionMatrixRows() {
  const entries = await SectionPPEMatrix.findAll({
    where: { isActive: true },
    include: [
      { model: Section, as: 'section', include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }] },
      { model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category'] }
    ],
    order: [[{ model: Section, as: 'section' }, 'name', 'ASC']]
  });
  return entries.map((e) => {
    const obj = e.toJSON();
    const section = obj.section || {};
    return {
      sectionName: section.name || '',
      departmentName: (section.department && section.department.name) || '',
      itemName: (obj.ppeItem && obj.ppeItem.name) || 'Unknown Item',
      itemCode: (obj.ppeItem && (obj.ppeItem.itemCode || obj.ppeItem.itemRefCode)) || '',
      category: (obj.ppeItem && obj.ppeItem.category) || '',
      quantityRequired: obj.quantityRequired != null ? obj.quantityRequired : '',
      replacementFrequency: obj.replacementFrequency != null ? obj.replacementFrequency : '',
      mandatory: obj.isMandatory ? 'Yes' : 'No'
    };
  });
}

// Conditional debug logger
const logDebug = (...args) => {
  if (process.env.DEBUG_MATRIX === '1') {
    console.log('[MATRIX]', ...args);
  }
};

// Simple test route to verify router is working
router.post('/test', (req, res) => {
  console.log('[MATRIX TEST] Test endpoint hit!');
  res.json({ success: true, message: 'Matrix router is working' });
});

/**
 * @route   GET /api/v1/matrix
 * @desc    Get all job title PPE matrix entries
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { jobTitle, jobTitleId, category, ppeItemId, departmentId, page = 1, limit = 100 } = req.query;

    // If departmentId provided, get PPE category names for job titles in that department
    let departmentPPECategories = null;
    if (departmentId) {
      // Get job titles that belong to sections in this department
      const jobTitleRecords = await JobTitle.findAll({
        attributes: ['id', 'name', 'ppeCategoryId'],
        include: [{
          model: Section,
          as: 'section',
          where: { departmentId },
          attributes: []
        }]
      });
      
      if (jobTitleRecords.length > 0) {
        // Collect unique ppeCategoryIds
        const ppeCategoryIds = [...new Set(jobTitleRecords.map(jt => jt.ppeCategoryId).filter(Boolean))];
        
        // Get the PPE category names (these are also JobTitle records used as categories)
        if (ppeCategoryIds.length > 0) {
          const ppeCategories = await JobTitle.findAll({
            attributes: ['name'],
            where: { id: { [Op.in]: ppeCategoryIds } }
          });
          departmentPPECategories = ppeCategories.map(c => c.name);
        }
        
        // Also include the job title names in case matrix uses them directly
        const jobTitleNames = jobTitleRecords.map(jt => jt.name);
        departmentPPECategories = departmentPPECategories 
          ? [...new Set([...departmentPPECategories, ...jobTitleNames])]
          : jobTitleNames;
      }
    }

    const where = {};
    if (jobTitle) where.jobTitle = { [Op.iLike]: `%${jobTitle}%` };
    if (jobTitleId) where.jobTitleId = jobTitleId;
    if (category) where.category = category;
    if (ppeItemId) where.ppeItemId = ppeItemId;
    // Filter by PPE categories for the department
    if (departmentPPECategories && departmentPPECategories.length > 0) {
      where.jobTitle = { [Op.in]: departmentPPECategories };
    } else if (departmentId && (!departmentPPECategories || departmentPPECategories.length === 0)) {
      // If departmentId provided but no PPE categories found, return empty
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        }
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: matrixEntries } = await JobTitlePPEMatrix.findAndCountAll({
      where,
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category', 'unit', 'hasSizeVariants', 'hasColorVariants']
      }],
      limit: parseInt(limit),
      offset,
      order: [['jobTitle', 'ASC'], ['category', 'ASC']]
    });

    res.json({
      success: true,
      data: matrixEntries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/job-titles
 * @desc    Get all unique job titles from the matrix
 * @access  Private
 */
router.get('/job-titles', authenticate, async (req, res, next) => {
  try {
    const jobTitles = await JobTitlePPEMatrix.findAll({
      attributes: ['jobTitle'],
      group: ['jobTitle'],
      order: [['jobTitle', 'ASC']]
    });

    const uniqueJobTitles = jobTitles.map(item => item.jobTitle);

    res.json({
      success: true,
      data: uniqueJobTitles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/by-job-title/:jobTitle
 * @desc    Get PPE requirements for a specific job title
 * @access  Private
 */
router.get('/by-job-title/:jobTitle', authenticate, async (req, res, next) => {
  try {
    const { jobTitle } = req.params;

    const requirements = await JobTitlePPEMatrix.findAll({
      where: {
        jobTitle: { [Op.iLike]: jobTitle },
        isActive: true
      },
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: { isActive: true }
      }],
      order: [['category', 'ASC']]
    });

    // Group by category
    const groupedByCategory = requirements.reduce((acc, req) => {
      const category = req.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(req);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        jobTitle,
        requirements,
        groupedByCategory,
        totalItems: requirements.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/bulk-upload-template
 * @desc    Get template data for bulk matrix upload (PPE items, sections, job titles)
 * @access  Private
 */
router.get('/bulk-upload-template', authenticate, async (req, res, next) => {
  try {
    console.log('[MATRIX TEMPLATE] Fetching template data for bulk upload...');
    
    // Get all PPE items
    const ppeItems = await PPEItem.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency', 'unit'],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    console.log(`[MATRIX TEMPLATE] Found ${ppeItems.length} PPE items`);

    // Get all sections with departments
    const sections = await Section.findAll({
      include: [{ 
        model: Department, 
        as: 'department', 
        attributes: ['id', 'name'],
        required: false
      }],
      order: [['name', 'ASC']]
    });
    console.log(`[MATRIX TEMPLATE] Found ${sections.length} sections`);

    // Get all job titles
    const jobTitles = await JobTitle.findAll({
      include: [{ 
        model: Section, 
        as: 'section',
        required: false,
        include: [{ 
          model: Department, 
          as: 'department', 
          attributes: ['id', 'name'],
          required: false
        }]
      }],
      order: [['name', 'ASC']]
    });
    console.log(`[MATRIX TEMPLATE] Found ${jobTitles.length} job titles`);

    res.json({
      success: true,
      data: {
        ppeItems: ppeItems.map(p => ({
          id: p.id,
          name: p.name,
          itemCode: p.itemCode || '',
          category: p.category || '',
          replacementFrequency: p.replacementFrequency,
          unit: p.unit || 'Each'
        })),
        sections: sections.map(s => ({
          id: s.id,
          name: s.name,
          department: s.department?.name || 'Unknown'
        })),
        jobTitles: jobTitles.map(jt => ({
          id: jt.id,
          name: jt.name,
          section: jt.section?.name || 'Unknown',
          department: jt.section?.department?.name || 'Unknown'
        }))
      }
    });
  } catch (error) {
    console.error('[MATRIX TEMPLATE] Error fetching template data:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/:id
 * @route   GET /api/v1/matrix/employee-report
 * @desc    Export the per-employee PPE matrix: every employee with their section
 *          and the PPE matrix that applies to them (merged from section + job
 *          title eligibility). Supports filtering by section / department.
 * @query   format=excel|pdf, sectionId, departmentId
 * @access  Private (Stores, Admin, SHEQ)
 */
router.get('/employee-report', authenticate, requireRole('stores', 'admin', 'sheq'), async (req, res, next) => {
  try {
    const { format = 'excel', sectionId, departmentId } = req.query;
    const reportFormat = String(format).toLowerCase();
    if (!['excel', 'pdf'].includes(reportFormat)) {
      return res.status(400).json({ success: false, message: "Invalid format. Use 'excel' or 'pdf'." });
    }

    const { rows, employeeCount } = await getEmployeeMatrixRows({ sectionId, departmentId });

    const infoLines = [];
    if (sectionId) {
      const sec = await Section.findByPk(sectionId, { attributes: ['name'] });
      if (sec) infoLines.push(`Section: ${sec.name}`);
    }
    if (departmentId) {
      const dept = await Department.findByPk(departmentId, { attributes: ['name'] });
      if (dept) infoLines.push(`Department: ${dept.name}`);
    }

    const generatedBy = req.user && req.user.employee
      ? [req.user.employee.firstName, req.user.employee.lastName].filter(Boolean).join(' ')
      : (req.user && req.user.username) || 'System';

    const meta = {
      title: 'Employee PPE Matrix Report',
      infoLines,
      generatedAt: new Date(),
      generatedBy,
      totalLabel: `Total employees: ${employeeCount}   |   Matrix line items: ${rows.length}`
    };

    const stamp = new Date().toISOString().slice(0, 10);
    if (reportFormat === 'pdf') {
      const buffer = await buildTablePdf({ columns: EMPLOYEE_MATRIX_COLUMNS, rows, meta });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="employee_ppe_matrix_${stamp}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }
    const buffer = await buildTableExcel({ sheetName: 'Employee PPE Matrix', columns: EMPLOYEE_MATRIX_COLUMNS, rows, meta });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employee_ppe_matrix_${stamp}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/report/combined
 * @desc    Export the FULL PPE Eligibility Matrix (Job Title + Section) in one
 *          file. Excel = two sheets; PDF = two sections.
 * @query   format=excel|pdf
 * @access  Private (Stores, Admin, SHEQ)
 */
router.get('/report/combined', authenticate, requireRole('stores', 'admin', 'sheq'), async (req, res, next) => {
  try {
    const reportFormat = String(req.query.format || 'excel').toLowerCase();
    if (!['excel', 'pdf'].includes(reportFormat)) {
      return res.status(400).json({ success: false, message: "Invalid format. Use 'excel' or 'pdf'." });
    }

    const [jobTitleRows, sectionRows] = await Promise.all([
      getJobTitleMatrixRows(),
      getSectionMatrixRows()
    ]);

    const generatedBy = req.user && req.user.employee
      ? [req.user.employee.firstName, req.user.employee.lastName].filter(Boolean).join(' ')
      : (req.user && req.user.username) || 'System';
    const generatedAt = new Date();

    const jobTitleTable = {
      sheetName: 'Job Title Matrix',
      columns: JOB_TITLE_MATRIX_COLUMNS,
      rows: jobTitleRows,
      meta: {
        title: 'PPE Eligibility Matrix — By Job Title',
        generatedAt,
        generatedBy,
        totalLabel: `Total matrix entries: ${jobTitleRows.length}`
      }
    };
    const sectionTable = {
      sheetName: 'Section Matrix',
      columns: SECTION_MATRIX_COLUMNS,
      rows: sectionRows,
      meta: {
        title: 'PPE Eligibility Matrix — By Section',
        generatedAt,
        generatedBy,
        totalLabel: `Total matrix entries: ${sectionRows.length}`
      }
    };

    const stamp = generatedAt.toISOString().slice(0, 10);
    if (reportFormat === 'pdf') {
      const buffer = await buildTablesPdf({ tables: [jobTitleTable, sectionTable] });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ppe_matrix_full_${stamp}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }
    const buffer = await buildTablesExcel({ tables: [jobTitleTable, sectionTable], creator: generatedBy });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ppe_matrix_full_${stamp}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/report
 * @desc    Export the Job Title PPE Eligibility Matrix as Excel or PDF.
 *          Shows the required PPE per job title (item, category, quantity,
 *          replacement frequency, mandatory). Supports filtering by job title,
 *          category and department.
 * @query   format=excel|pdf, jobTitle, jobTitleId, category, departmentId
 * @access  Private (Stores, Admin, SHEQ)
 */
router.get('/report', authenticate, requireRole('stores', 'admin', 'sheq'), async (req, res, next) => {
  try {
    const { format = 'excel', jobTitle, jobTitleId, category, departmentId } = req.query;

    const reportFormat = String(format).toLowerCase();
    if (!['excel', 'pdf'].includes(reportFormat)) {
      return res.status(400).json({ success: false, message: "Invalid format. Use 'excel' or 'pdf'." });
    }

    const where = { isActive: true };
    if (jobTitle) where.jobTitle = { [Op.iLike]: `%${jobTitle}%` };
    if (jobTitleId) where.jobTitleId = jobTitleId;
    if (category) where.category = category;

    // Optionally narrow to job titles within a department (via their section)
    const infoLines = [];
    if (departmentId) {
      const jobTitleRecords = await JobTitle.findAll({
        attributes: ['name'],
        include: [{ model: Section, as: 'section', where: { departmentId }, attributes: [] }]
      });
      const names = [...new Set(jobTitleRecords.map((jt) => jt.name).filter(Boolean))];
      where.jobTitle = { [Op.in]: names.length ? names : ['__none__'] };
      const dept = await Department.findByPk(departmentId, { attributes: ['name'] });
      if (dept) infoLines.push(`Department: ${dept.name}`);
    }
    if (jobTitle) infoLines.push(`Job Title: ${jobTitle}`);
    if (category) infoLines.push(`Category: ${category}`);

    const entries = await JobTitlePPEMatrix.findAll({
      where,
      include: [
        { model: PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category'] },
        { model: JobTitle, as: 'jobTitleRef', attributes: ['name'], required: false }
      ],
      order: [['jobTitle', 'ASC'], ['category', 'ASC']]
    });

    const rows = entries.map((e) => {
      const obj = e.toJSON();
      return {
        jobTitle: (obj.jobTitleRef && obj.jobTitleRef.name) || obj.jobTitle || '',
        itemName: (obj.ppeItem && obj.ppeItem.name) || 'Unknown Item',
        itemCode: (obj.ppeItem && (obj.ppeItem.itemCode || obj.ppeItem.itemRefCode)) || '',
        category: obj.category || (obj.ppeItem && obj.ppeItem.category) || '',
        quantityRequired: obj.quantityRequired != null ? obj.quantityRequired : '',
        replacementFrequency: obj.replacementFrequency != null ? obj.replacementFrequency : '',
        mandatory: obj.isMandatory ? 'Yes' : 'No'
      };
    });

    const generatedBy = req.user && req.user.employee
      ? [req.user.employee.firstName, req.user.employee.lastName].filter(Boolean).join(' ')
      : (req.user && req.user.username) || 'System';

    const meta = {
      title: 'PPE Eligibility Matrix — By Job Title',
      infoLines,
      generatedAt: new Date(),
      generatedBy,
      totalLabel: `Total matrix entries: ${rows.length}`
    };

    const stamp = new Date().toISOString().slice(0, 10);
    if (reportFormat === 'pdf') {
      const buffer = await buildTablePdf({ columns: JOB_TITLE_MATRIX_COLUMNS, rows, meta });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="job_title_matrix_${stamp}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }
    const buffer = await buildTableExcel({ sheetName: 'Job Title Matrix', columns: JOB_TITLE_MATRIX_COLUMNS, rows, meta });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="job_title_matrix_${stamp}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/:id
 * @desc    Get single matrix entry by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id, {
      include: [{
        model: PPEItem,
        as: 'ppeItem'
      }]
    });

    if (!matrixEntry) {
      return res.status(404).json({
        success: false,
        message: 'Matrix entry not found'
      });
    }

    res.json({
      success: true,
      data: matrixEntry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/matrix
 * @desc    Create new job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('quantityRequired').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be positive'),
    body('heavyUseFrequency').optional().isInt({ min: 1 }).withMessage('Heavy use frequency must be positive'),
    body('category').optional().trim(),
    body('isMandatory').optional().isBoolean()
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const {
        jobTitle,
        ppeItemId,
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category,
        isMandatory,
        notes
      } = req.body;

      // Check if PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // Check if entry already exists
      const existing = await JobTitlePPEMatrix.findOne({
        where: {
          jobTitle,
          ppeItemId
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This PPE item is already assigned to this job title'
        });
      }

      const matrixEntry = await JobTitlePPEMatrix.create({
        jobTitle,
        ppeItemId,
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category: category || ppeItem.category,
        isMandatory,
        notes
      });

      const createdEntry = await JobTitlePPEMatrix.findByPk(matrixEntry.id, {
        include: [{
          model: PPEItem,
          as: 'ppeItem'
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Job title PPE requirement created successfully',
        data: createdEntry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/bulk
 * @desc    Bulk create job title PPE matrix entries
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/bulk',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    body('entries').isArray({ min: 1 }).withMessage('Entries array is required'),
    body('entries.*.jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('entries.*.ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('entries.*.quantityRequired').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const { entries } = req.body;

      // Validate all PPE items exist in bulk
      const ppeItemIds = [...new Set(entries.map(e => e.ppeItemId))];
      const ppeItems = await PPEItem.findAll({
        where: { id: { [Op.in]: ppeItemIds } },
        attributes: ['id', 'category']
      });
      const ppeItemMap = new Map(ppeItems.map(item => [item.id, item]));

      // Check for missing PPE items
      const missingPPEItems = ppeItemIds.filter(id => !ppeItemMap.has(id));
      if (missingPPEItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: `PPE items not found: ${missingPPEItems.join(', ')}`
        });
      }

      // Check for existing entries
      const existingEntries = await JobTitlePPEMatrix.findAll({
        where: {
          [Op.or]: entries.map(e => ({
            jobTitleId: e.jobTitleId,
            ppeItemId: e.ppeItemId
          }))
        },
        attributes: ['jobTitleId', 'ppeItemId']
      });

      const existingSet = new Set(
        existingEntries.map(e => `${e.jobTitleId}_${e.ppeItemId}`)
      );

      // Filter out existing entries
      const newEntries = entries.filter(e => {
        const key = `${e.jobTitleId}_${e.ppeItemId}`;
        return !existingSet.has(key);
      });

      if (newEntries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All entries already exist',
          data: {
            duplicates: entries.length,
            created: 0
          }
        });
      }

      // Prepare data for bulk insert
      const bulkData = newEntries.map(entry => {
        const ppeItem = ppeItemMap.get(entry.ppeItemId);
        return {
          jobTitleId: entry.jobTitleId,
          jobTitle: entry.jobTitle,
          ppeItemId: entry.ppeItemId,
          quantityRequired: entry.quantityRequired || 1,
          replacementFrequency: entry.replacementFrequency || 12,
          heavyUseFrequency: entry.heavyUseFrequency,
          category: entry.category || ppeItem.category,
          isMandatory: entry.isMandatory !== undefined ? entry.isMandatory : true,
          notes: entry.notes,
          isActive: entry.isActive !== undefined ? entry.isActive : true
        };
      });

      // Bulk insert
      const createdEntries = await JobTitlePPEMatrix.bulkCreate(bulkData);

      res.status(201).json({
        success: true,
        message: `Created ${createdEntries.length} entries${existingSet.size > 0 ? `, skipped ${existingSet.size} duplicates` : ''}`,
        data: {
          created: createdEntries.length,
          duplicates: existingSet.size,
          entries: createdEntries
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/replace
 * @desc    Replace all matrix entries for a given job title in a single transaction
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/replace',
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] Request received!');
    console.log('[MATRIX REPLACE DEBUG] Body:', JSON.stringify(req.body).substring(0, 200));
    next();
  },
  authenticate,
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After auth, user:', req.user?.username);
    next();
  },
  requireRole('admin', 'sheq', 'stores'),
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After role check');
    next();
  },
  [
    body('entries').isArray({ min: 1 }).withMessage('Entries array is required'),
    body('entries.*.ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('entries.*.quantityRequired').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After validation rules');
    next();
  },
  validate,
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After validate middleware');
    next();
  },
  auditLog('REPLACE', 'matrix'),
  async (req, res, next) => {
    console.log('[MATRIX REPLACE] Starting...');
    const t0 = Date.now();
    let t = null;
    try {
      const { entries } = req.body;
      console.log('[MATRIX REPLACE] Entries count:', entries.length);

      // Determine jobTitleId / jobTitle from entries (all should be same)
      const jobTitleIdSet = new Set(entries.map((e) => e.jobTitleId).filter(Boolean));
      const jobTitleSet = new Set(entries.map((e) => e.jobTitle).filter(Boolean));

      if (jobTitleIdSet.size === 0 && jobTitleSet.size === 0) {
        return res.status(400).json({ success: false, message: 'jobTitleId or jobTitle is required' });
      }
      if (jobTitleIdSet.size > 1) {
        return res.status(400).json({ success: false, message: 'All entries must have the same jobTitleId' });
      }
      if (jobTitleSet.size > 1) {
        return res.status(400).json({ success: false, message: 'All entries must have the same jobTitle' });
      }

      const jobTitleId = jobTitleIdSet.size === 1 ? [...jobTitleIdSet][0] : null;
      const jobTitle = jobTitleSet.size === 1 ? [...jobTitleSet][0] : null;
      console.log('[MATRIX REPLACE] JobTitleId:', jobTitleId, 'JobTitle:', jobTitle);
      logDebug('replace start', { jobTitleId, jobTitle, count: entries.length });

      // Validate PPE items in bulk
      console.log('[MATRIX REPLACE] Validating PPE items...');
      const tValidate0 = Date.now();
      const ppeItemIds = [...new Set(entries.map((e) => e.ppeItemId))];
      const ppeItems = await PPEItem.findAll({ where: { id: { [Op.in]: ppeItemIds } }, attributes: ['id', 'category'] });
      const ppeItemMap = new Map(ppeItems.map((i) => [i.id, i]));
      const missing = ppeItemIds.filter((id) => !ppeItemMap.has(id));
      if (missing.length) {
        return res.status(400).json({ success: false, message: `PPE items not found: ${missing.join(', ')}` });
      }
      const tValidateMs = Date.now() - tValidate0;
      console.log('[MATRIX REPLACE] PPE validation done in', tValidateMs, 'ms');
      logDebug('validated PPE items', { unique: ppeItemIds.length, ms: tValidateMs });

      // Start transaction AFTER validation to minimize lock time
      console.log('[MATRIX REPLACE] Starting transaction...');
      t = await sequelize.transaction();

      // Delete existing entries for this job title (supports both legacy and new fields)
      console.log('[MATRIX REPLACE] Deleting existing entries...');
      const tDelete0 = Date.now();
      const where = jobTitleId ? { jobTitleId } : { jobTitle };
      const deleted = await JobTitlePPEMatrix.destroy({ where, transaction: t });
      const tDeleteMs = Date.now() - tDelete0;
      console.log('[MATRIX REPLACE] Deleted', deleted, 'entries in', tDeleteMs, 'ms');
      logDebug('deleted existing', { deleted, ms: tDeleteMs });

      // Prepare and bulk insert new entries
      console.log('[MATRIX REPLACE] Preparing rows for bulk insert...');
      const rows = entries.map((e) => {
        const p = ppeItemMap.get(e.ppeItemId);
        return {
          jobTitleId: jobTitleId || null,
          jobTitle: jobTitle || e.jobTitle || null,
          ppeItemId: e.ppeItemId,
          quantityRequired: e.quantityRequired || 1,
          replacementFrequency: e.replacementFrequency || 12,
          heavyUseFrequency: e.heavyUseFrequency,
          category: e.category || p?.category,
          isMandatory: e.isMandatory !== undefined ? e.isMandatory : true,
          notes: e.notes,
          isActive: e.isActive !== undefined ? e.isActive : true
        };
      });

      console.log('[MATRIX REPLACE] Bulk inserting', rows.length, 'rows...');
      const tInsert0 = Date.now();
      await JobTitlePPEMatrix.bulkCreate(rows, { transaction: t });
      const tInsertMs = Date.now() - tInsert0;
      console.log('[MATRIX REPLACE] Bulk insert done in', tInsertMs, 'ms');
      
      console.log('[MATRIX REPLACE] Committing transaction...');
      await t.commit();

      const totalMs = Date.now() - t0;
      console.log('[MATRIX REPLACE] Complete! Total time:', totalMs, 'ms');
      logDebug('replace done', { created: rows.length, totalMs, tValidateMs, tDeleteMs, tInsertMs });

      res.status(201).json({ success: true, message: 'Matrix replaced successfully', data: { created: rows.length, timings: { validateMs: tValidateMs, deleteMs: tDeleteMs, insertMs: tInsertMs, totalMs } } });
    } catch (error) {
      console.error('[MATRIX REPLACE] Error:', error.message);
      if (t) await t.rollback();
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/matrix/:id
 * @desc    Update job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    param('id').isUUID().withMessage('Valid matrix entry ID is required'),
    body('jobTitle').optional().trim(),
    body('jobTitleId').optional().isUUID().withMessage('Valid job title ID is required'),
    body('ppeItemId').optional().isUUID().withMessage('Valid PPE item ID is required'),
    body('quantityRequired').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be positive'),
    body('heavyUseFrequency').optional().isInt({ min: 1 }).withMessage('Heavy use frequency must be positive'),
    body('category').optional().trim(),
    body('isMandatory').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  auditLog('UPDATE', 'matrix'),
  async (req, res, next) => {
    try {
      const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Matrix entry not found'
        });
      }

      const {
        jobTitle,
        jobTitleId,
        ppeItemId,
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category,
        isMandatory,
        notes,
        isActive
      } = req.body;

      // If changing job title, get the name from JobTitle table
      let jobTitleName = jobTitle;
      if (jobTitleId && !jobTitle) {
        const jobTitleRecord = await JobTitle.findByPk(jobTitleId);
        if (jobTitleRecord) {
          jobTitleName = jobTitleRecord.name;
        }
      }

      await matrixEntry.update({
        ...(jobTitleName !== undefined && { jobTitle: jobTitleName }),
        ...(jobTitleId !== undefined && { jobTitleId }),
        ...(ppeItemId !== undefined && { ppeItemId }),
        ...(quantityRequired !== undefined && { quantityRequired }),
        ...(replacementFrequency !== undefined && { replacementFrequency }),
        ...(heavyUseFrequency !== undefined && { heavyUseFrequency }),
        ...(category !== undefined && { category }),
        ...(isMandatory !== undefined && { isMandatory }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      });

      const updatedEntry = await JobTitlePPEMatrix.findByPk(matrixEntry.id, {
        include: [{
          model: PPEItem,
          as: 'ppeItem'
        }]
      });

      res.json({
        success: true,
        message: 'Matrix entry updated successfully',
        data: updatedEntry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/matrix/by-job-title/:jobTitleName
 * @desc    Delete all matrix entries for a specific job title
 * @access  Private (Admin, SHEQ, Stores)
 */
router.delete(
  '/by-job-title/:jobTitleName',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  async (req, res, next) => {
    try {
      const { jobTitleName } = req.params;
      console.log('[MATRIX] Delete by job title:', jobTitleName);
      
      const deletedCount = await JobTitlePPEMatrix.destroy({
        where: {
          jobTitle: { [Op.iLike]: jobTitleName }
        }
      });

      console.log('[MATRIX] Deleted count:', deletedCount);

      if (deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No matrix entries found for this job title'
        });
      }

      res.json({
        success: true,
        message: `Deleted ${deletedCount} matrix entries for job title "${jobTitleName}"`,
        deletedCount
      });
    } catch (error) {
      console.error('[MATRIX] Delete error:', error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/matrix/:id
 * @desc    Delete job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    param('id').isUUID().withMessage('Valid matrix entry ID is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Matrix entry not found'
        });
      }

      await matrixEntry.destroy();

      res.json({
        success: true,
        message: 'Matrix entry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/bulk-upload
 * @desc    Bulk upload PPE matrix configuration from Excel
 *          Creates job titles if they don't exist, maps PPE items by name
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  async (req, res, next) => {
    const t = await sequelize.transaction();
    
    try {
      const { entries, defaultSectionId, createJobTitles = true, createPPEItems = true, updateExisting = false } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Entries array is required'
        });
      }

      // Load all PPE items for name matching
      const allPPEItems = await PPEItem.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency', 'unit']
      });
      
      // Create lookup maps for PPE items (by name, partial name match)
      const ppeByName = new Map();
      const ppeByCode = new Map();
      allPPEItems.forEach(item => {
        ppeByName.set(item.name.toLowerCase().trim(), item);
        if (item.itemCode) {
          ppeByCode.set(item.itemCode.toLowerCase().trim(), item);
        }
      });

      // Load all job titles
      const allJobTitles = await JobTitle.findAll({
        include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
      });
      const jobTitleByName = new Map();
      allJobTitles.forEach(jt => {
        jobTitleByName.set(jt.name.toLowerCase().trim(), jt);
      });

      // Load all sections
      const allSections = await Section.findAll({
        include: [{ model: Department, as: 'department' }]
      });
      const sectionByName = new Map();
      allSections.forEach(s => {
        sectionByName.set(s.name.toLowerCase().trim(), s);
      });

      // Get default section for new job titles
      let defaultSection = null;
      if (defaultSectionId) {
        defaultSection = await Section.findByPk(defaultSectionId);
      }
      if (!defaultSection && allSections.length > 0) {
        // Use first available section as fallback
        defaultSection = allSections[0];
      }

      const results = {
        matrixCreated: [],
        matrixUpdated: [],
        matrixSkipped: [],
        jobTitlesCreated: [],
        ppeItemsCreated: [],
        ppeItemsUpdated: [],
        ppeNotFound: [],
        errors: []
      };

      // Helper to determine PPE category based on item name
      const determinePPECategory = (name) => {
        const nameLower = name.toLowerCase();
        
        // FEET
        if (nameLower.includes('boot') || nameLower.includes('shoe') || nameLower.includes('spat')) {
          return 'FEET';
        }
        // HANDS
        if (nameLower.includes('glove')) {
          return 'HANDS';
        }
        // EYES/FACE
        if (nameLower.includes('glass') || nameLower.includes('goggle') || nameLower.includes('shield') || 
            nameLower.includes('visor') || nameLower.includes('visa') || nameLower.includes('helmet')) {
          return 'EYES/FACE';
        }
        // HEAD
        if (nameLower.includes('hard hat') || nameLower.includes('hat') || nameLower.includes('sunbrim') || 
            nameLower.includes('liner') || nameLower.includes('hair net') || nameLower.includes('neckerchief')) {
          return 'HEAD';
        }
        // EARS
        if (nameLower.includes('ear') || nameLower.includes('noise')) {
          return 'EARS';
        }
        // RESPIRATORY
        if (nameLower.includes('mask') || nameLower.includes('respirator') || nameLower.includes('cartridge') || 
            nameLower.includes('filter')) {
          return 'RESPIRATORY';
        }
        // BODY/TORSO
        if (nameLower.includes('suit') || nameLower.includes('jacket') || nameLower.includes('vest') || 
            nameLower.includes('apron') || nameLower.includes('shirt') || nameLower.includes('trouser') ||
            nameLower.includes('coat') || nameLower.includes('overall') || nameLower.includes('rain')) {
          return 'BODY/TORSO';
        }
        // FALL PROTECTION
        if (nameLower.includes('harness') || nameLower.includes('lanyard')) {
          return 'FALL PROTECTION';
        }
        // SPECIALIZED EQUIPMENT
        if (nameLower.includes('tong') || nameLower.includes('bag') || nameLower.includes('guard')) {
          return 'SPECIALIZED EQUIPMENT';
        }
        
        return 'OTHER';
      };

      // Helper to determine if item has size variants
      const hasSizeVariants = (name) => {
        const nameLower = name.toLowerCase();
        return nameLower.includes('shoe') || nameLower.includes('boot') || nameLower.includes('glove') ||
               nameLower.includes('suit') || nameLower.includes('jacket') || nameLower.includes('shirt') ||
               nameLower.includes('trouser') || nameLower.includes('apron') || nameLower.includes('harness');
      };

      // Helper function to find PPE item by name (fuzzy match)
      const findPPEItem = (name) => {
        if (!name) return null;
        const normalizedName = name.toLowerCase().trim();
        
        // Exact match first
        if (ppeByName.has(normalizedName)) {
          return ppeByName.get(normalizedName);
        }
        
        // Partial match - check if PPE name contains the search term or vice versa
        for (const [key, item] of ppeByName) {
          if (key.includes(normalizedName) || normalizedName.includes(key)) {
            return item;
          }
        }
        
        // Try matching by item code
        if (ppeByCode.has(normalizedName)) {
          return ppeByCode.get(normalizedName);
        }
        
        return null;
      };

      // Helper to parse frequency string (e.g., "2", "8 months", "1year", "When worn out")
      const parseFrequency = (freqStr) => {
        if (!freqStr) return null;
        const str = freqStr.toString().toLowerCase().trim();
        
        // Check for "when worn out" or similar
        if (str.includes('worn') || str.includes('disposable') || str.includes('clogged') || str.includes('need')) {
          return 0; // 0 means "as needed"
        }
        
        // Extract number
        const match = str.match(/(\d+)/);
        if (!match) return null;
        
        const num = parseInt(match[1]);
        
        // Check for years
        if (str.includes('year')) {
          return num * 12; // Convert years to months
        }
        
        // Default to months
        return num;
      };

      // Process each entry
      for (const entry of entries) {
        try {
          const ppeName = (entry.ppeItem || entry.ppeName || entry['PPE ITEM'] || '').toString().trim();
          const jobTitleName = (entry.jobTitle || entry.occupation || entry['OCCUPATIONS'] || '').toString().trim();
          const quantity = parseInt(entry.quantity || entry.quantityRequired || 1) || 1;
          const frequency = parseFrequency(entry.frequency || entry.replacementFrequency || entry['ISSUANCE FREQUENCY']);
          const isMandatory = entry.isMandatory !== false;
          const specifications = (entry.specifications || entry['SPECIFICATIONS'] || '').toString().trim();
          const unit = (entry.unit || entry['UNIT OF MEASURE'] || 'Each').toString().trim();
          const gender = (entry.gender || '').toString().trim().toLowerCase();

          if (!ppeName) {
            results.errors.push({ entry, error: 'PPE item name is required' });
            continue;
          }

          // Find PPE item
          let ppeItem = findPPEItem(ppeName);
          
          // Determine category based on name
          const category = determinePPECategory(ppeName);
          
          // Parse unit of measure
          let ppeUnit = 'EA';
          const unitLower = unit.toLowerCase();
          if (unitLower.includes('pair')) ppeUnit = 'PAIR';
          else if (unitLower.includes('set')) ppeUnit = 'SET';
          else if (unitLower.includes('each') || unitLower === 'ea') ppeUnit = 'EA';
          
          // Parse frequency to get replacement frequency
          const replacementFreq = frequency || 12;
          
          if (ppeItem && createPPEItems) {
            // PPE item exists - update it with new info if specifications provided
            const updateData = {};
            if (specifications && specifications !== ppeItem.description) {
              updateData.description = specifications;
            }
            if (category && category !== 'OTHER' && ppeItem.category !== category) {
              updateData.category = category;
            }
            if (replacementFreq > 0 && replacementFreq !== ppeItem.replacementFrequency) {
              updateData.replacementFrequency = replacementFreq;
            }
            if (ppeUnit !== ppeItem.unit) {
              updateData.unit = ppeUnit;
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
              await ppeItem.update(updateData, { transaction: t });
              
              // Check if already tracked as updated
              const alreadyUpdated = results.ppeItemsUpdated.some(p => p.id === ppeItem.id);
              if (!alreadyUpdated) {
                results.ppeItemsUpdated.push({
                  id: ppeItem.id,
                  name: ppeItem.name,
                  itemCode: ppeItem.itemCode,
                  category: ppeItem.category,
                  updates: updateData
                });
              }
            }
          } else if (!ppeItem && createPPEItems) {
            // PPE item not found - create new one
            // Generate item code from name
            const itemCode = ppeName
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 30);
            
            // Create new PPE item
            ppeItem = await PPEItem.create({
              name: ppeName,
              itemCode: itemCode + '-' + Date.now().toString().slice(-6),
              category: category,
              unit: ppeUnit,
              description: specifications || null,
              replacementFrequency: replacementFreq > 0 ? replacementFreq : 12,
              hasSizeVariants: hasSizeVariants(ppeName),
              isMandatory: true,
              isActive: true
            }, { transaction: t });
            
            // Add to lookup maps
            ppeByName.set(ppeItem.name.toLowerCase().trim(), ppeItem);
            
            results.ppeItemsCreated.push({
              id: ppeItem.id,
              name: ppeItem.name,
              itemCode: ppeItem.itemCode,
              category: ppeItem.category,
              unit: ppeItem.unit
            });
          }
          
          if (!ppeItem) {
            results.ppeNotFound.push({ ppeName, entry });
            continue;
          }

          // Handle job title lookup - first try exact match, then try splitting by comma/&
          let jobTitleNames = [];
          const trimmedJobTitle = jobTitleName.trim();
          
          // First, check if the full job title name exists in the database (exact match)
          if (jobTitleByName.has(trimmedJobTitle.toLowerCase())) {
            jobTitleNames = [trimmedJobTitle];
          } else {
            // If no exact match, try splitting by comma or & (for old format compatibility)
            jobTitleNames = trimmedJobTitle
              .split(/[,&]/)
              .map(jt => jt.trim())
              .filter(jt => jt.length > 0);
          }

          if (jobTitleNames.length === 0) {
            results.errors.push({ entry, error: 'Job title/occupation is required' });
            continue;
          }

          // Process each job title
          for (const jtName of jobTitleNames) {
            // Find or create job title
            let jobTitle = jobTitleByName.get(jtName.toLowerCase().trim());
            
            if (!jobTitle && createJobTitles) {
              if (!defaultSection) {
                results.errors.push({ 
                  entry, 
                  jobTitle: jtName,
                  error: 'Cannot create job title: no default section available' 
                });
                continue;
              }

              // Create new job title with optional gender suffix
              let finalName = jtName;
              if (gender && !jtName.toLowerCase().includes(gender)) {
                // Check if this is a gender-specific entry
                if (gender === 'male' || gender === 'female' || gender === 'ladies') {
                  // Don't modify the name, gender will be handled in notes
                }
              }

              jobTitle = await JobTitle.create({
                name: finalName,
                sectionId: defaultSection.id,
                isActive: true
              }, { transaction: t });

              results.jobTitlesCreated.push({
                id: jobTitle.id,
                name: jobTitle.name,
                section: defaultSection.name
              });

              jobTitleByName.set(jobTitle.name.toLowerCase().trim(), jobTitle);
            }

            if (!jobTitle) {
              results.errors.push({ 
                entry, 
                jobTitle: jtName,
                error: `Job title "${jtName}" not found and createJobTitles is disabled` 
              });
              continue;
            }

            // Check for existing matrix entry
            const existingMatrix = await JobTitlePPEMatrix.findOne({
              where: {
                jobTitleId: jobTitle.id,
                ppeItemId: ppeItem.id
              },
              transaction: t
            });

            if (existingMatrix) {
              if (updateExisting) {
                await existingMatrix.update({
                  quantityRequired: quantity,
                  replacementFrequency: frequency || ppeItem.replacementFrequency || 12,
                  isMandatory,
                  notes: specifications || existingMatrix.notes,
                  category: ppeItem.category
                }, { transaction: t });

                results.matrixUpdated.push({
                  id: existingMatrix.id,
                  jobTitle: jobTitle.name,
                  ppeItem: ppeItem.name,
                  quantity,
                  frequency
                });
              } else {
                results.matrixSkipped.push({
                  jobTitle: jobTitle.name,
                  ppeItem: ppeItem.name,
                  reason: 'Already exists'
                });
              }
              continue;
            }

            // Create new matrix entry
            const matrixEntry = await JobTitlePPEMatrix.create({
              jobTitleId: jobTitle.id,
              jobTitle: jobTitle.name,
              ppeItemId: ppeItem.id,
              quantityRequired: quantity,
              replacementFrequency: frequency || ppeItem.replacementFrequency || 12,
              isMandatory,
              category: ppeItem.category,
              notes: specifications || null,
              isActive: true
            }, { transaction: t });

            results.matrixCreated.push({
              id: matrixEntry.id,
              jobTitle: jobTitle.name,
              ppeItem: ppeItem.name,
              quantity,
              frequency
            });
          }
        } catch (entryError) {
          results.errors.push({ entry, error: entryError.message });
        }
      }

      await t.commit();

      res.status(201).json({
        success: true,
        message: `Bulk upload completed: ${results.matrixCreated.length} matrix entries created, ${results.matrixUpdated.length} updated, ${results.matrixSkipped.length} skipped. PPE items: ${results.ppeItemsCreated.length} created, ${results.ppeItemsUpdated.length} updated.`,
        data: results
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
);

module.exports = router;
