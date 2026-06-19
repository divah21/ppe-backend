const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Employee Allocations Report helper.
 *
 * Both builders accept:
 *   rows  - array of normalized allocation rows (see normalizeAllocations)
 *   meta  - { title, generatedBy, generatedAt, filters: { employeeName, sectionName,
 *            departmentName, fromDate, toDate } }
 *
 * buildAllocationExcel -> Promise<Buffer>
 * buildAllocationPdf   -> Promise<Buffer>
 */

const COLUMNS = [
  { header: 'Employee', key: 'employeeName', width: 28 },
  { header: 'Works No.', key: 'worksNumber', width: 14 },
  { header: 'Item / Asset', key: 'itemName', width: 30 },
  { header: 'Item Code', key: 'itemCode', width: 14 },
  { header: 'Section', key: 'sectionName', width: 22 },
  { header: 'Department', key: 'departmentName', width: 22 },
  { header: 'Qty', key: 'quantity', width: 7 },
  { header: 'Size', key: 'size', width: 9 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Date Assigned', key: 'issueDate', width: 16 },
  { header: 'Next Renewal', key: 'nextRenewalDate', width: 16 }
];

/**
 * Compute the next renewal date from issueDate + ppeItem.replacementFrequency
 * (in months), falling back to the stored nextRenewalDate / expiryDate.
 * Mirrors the calculation used by the allocations API.
 */
const computeRenewalDate = (obj, ppeItem) => {
  try {
    const freq = ppeItem && ppeItem.replacementFrequency ? parseInt(ppeItem.replacementFrequency) : null;
    if (obj.issueDate && freq && !isNaN(freq)) {
      const d = new Date(obj.issueDate);
      d.setMonth(d.getMonth() + freq);
      return d;
    }
  } catch (e) {
    // fall through to stored values
  }
  const fallback = obj.nextRenewalDate || obj.expiryDate;
  if (fallback) {
    const d = new Date(fallback);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  // DD/MM/YYYY to match the en-ZA locale used across the app
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

/**
 * Flatten Sequelize allocation instances/plain objects into report rows.
 */
const normalizeAllocations = (allocations) => {
  // Allocations arrive pre-sorted so each employee's rows are contiguous.
  // Blank the repeated employee identity within a group so the report reads
  // as grouped per person for easy identification.
  let prevKey = null;
  return (allocations || []).map((a) => {
    const obj = typeof a.toJSON === 'function' ? a.toJSON() : a;
    const employee = obj.employee || {};
    const section = employee.section || {};
    const department = section.department || {};
    const ppeItem = obj.ppeItem || {};

    const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Unknown';
    const worksNumber = employee.worksNumber || '';
    const groupKey = `${employee.id || ''}|${worksNumber}|${fullName}`;
    const isSameGroup = groupKey === prevKey;
    prevKey = groupKey;

    return {
      employeeName: isSameGroup ? '' : fullName,
      worksNumber: isSameGroup ? '' : worksNumber,
      itemName: ppeItem.name || 'Unknown Item',
      itemCode: ppeItem.itemCode || '',
      sectionName: isSameGroup ? '' : section.name || '',
      departmentName: isSameGroup ? '' : department.name || '',
      quantity: obj.quantity != null ? obj.quantity : '',
      size: obj.size || '',
      status: obj.status || '',
      issueDate: formatDate(obj.issueDate),
      nextRenewalDate: formatDate(computeRenewalDate(obj, ppeItem))
    };
  });
};

/**
 * Build the human-readable list of applied filters for the report header.
 */
const buildFilterLines = (filters = {}) => {
  const lines = [];
  if (filters.employeeName) lines.push(`Employee: ${filters.employeeName}`);
  if (filters.sectionName) lines.push(`Section: ${filters.sectionName}`);
  if (filters.departmentName) lines.push(`Department: ${filters.departmentName}`);
  const period =
    filters.fromDate || filters.toDate
      ? `Period: ${filters.fromDate ? formatDate(filters.fromDate) : '—'} to ${filters.toDate ? formatDate(filters.toDate) : '—'}`
      : 'Period: All dates';
  lines.push(period);
  return lines;
};

const buildAllocationExcel = async (allocations, meta = {}) => {
  const rows = normalizeAllocations(allocations);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.generatedBy || 'PPE Management System';
  const sheet = workbook.addWorksheet('Allocations');

  const lastCol = COLUMNS.length;
  const lastColLetter = sheet.getColumn(lastCol).letter;

  // Title
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = meta.title || 'Employee Allocations Report';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'left' };

  // Filter / context lines
  const filterLines = buildFilterLines(meta.filters);
  if (meta.generatedAt) filterLines.push(`Generated: ${formatDate(meta.generatedAt)}`);
  if (meta.generatedBy) filterLines.push(`By: ${meta.generatedBy}`);

  let cursor = 2;
  filterLines.forEach((line) => {
    sheet.mergeCells(`A${cursor}:${lastColLetter}${cursor}`);
    const c = sheet.getCell(`A${cursor}`);
    c.value = line;
    c.font = { size: 10, color: { argb: 'FF555555' } };
    cursor += 1;
  });

  const headerRowNumber = cursor + 1;

  // Freeze the title/filter lines and header row so data scrolls beneath them.
  // (ySplit must be > 0 — a frozen view with ySplit: 0 produces an invalid
  // pane element that makes Excel flag the file as corrupt on open.)
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

  // Header row
  const headerRow = sheet.getRow(headerRowNumber);
  COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } };
    sheet.getColumn(idx + 1).width = col.width;
  });
  headerRow.commit();

  // Data rows
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(headerRowNumber + 1 + i);
    COLUMNS.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      cell.value = row[col.key];
      cell.alignment = {
        horizontal: ['quantity', 'size', 'status'].includes(col.key) ? 'center' : 'left',
        vertical: 'middle'
      };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FB' } };
      }
    });
    excelRow.commit();
  });

  // Total row
  const totalRowNumber = headerRowNumber + 1 + rows.length + 1;
  sheet.mergeCells(`A${totalRowNumber}:C${totalRowNumber}`);
  const totalCell = sheet.getCell(`A${totalRowNumber}`);
  totalCell.value = `Total allocations: ${rows.length}`;
  totalCell.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildAllocationPdf = (allocations, meta = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const rows = normalizeAllocations(allocations);
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left;

      // Title
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1F4E78')
        .text(meta.title || 'Employee Allocations Report', startX, doc.y);
      doc.moveDown(0.3);

      // Filter / context lines
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      const filterLines = buildFilterLines(meta.filters);
      if (meta.generatedAt) filterLines.push(`Generated: ${formatDate(meta.generatedAt)}`);
      if (meta.generatedBy) filterLines.push(`By: ${meta.generatedBy}`);
      filterLines.forEach((line) => doc.text(line, startX, doc.y));
      doc.moveDown(0.5);

      // Columns sized for landscape A4 (subset of the Excel columns; weighted widths)
      const pdfColumns = [
        { header: 'Employee', key: 'employeeName', w: 0.15 },
        { header: 'Works No.', key: 'worksNumber', w: 0.08 },
        { header: 'Item / Asset', key: 'itemName', w: 0.16 },
        { header: 'Item Code', key: 'itemCode', w: 0.08 },
        { header: 'Section', key: 'sectionName', w: 0.12 },
        { header: 'Department', key: 'departmentName', w: 0.12 },
        { header: 'Qty', key: 'quantity', w: 0.04 },
        { header: 'Size', key: 'size', w: 0.04 },
        { header: 'Status', key: 'status', w: 0.07 },
        { header: 'Date Assigned', key: 'issueDate', w: 0.07 },
        { header: 'Next Renewal', key: 'nextRenewalDate', w: 0.07 }
      ];
      const colX = [];
      let acc = startX;
      pdfColumns.forEach((c) => {
        colX.push(acc);
        acc += c.w * pageWidth;
      });

      const rowHeight = 18;
      const padding = 3;

      const drawHeader = (y) => {
        doc.rect(startX, y, pageWidth, rowHeight).fill('#1F4E78');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        pdfColumns.forEach((c, i) => {
          doc.text(c.header, colX[i] + padding, y + padding, {
            width: c.w * pageWidth - padding * 2,
            height: rowHeight,
            ellipsis: true
          });
        });
        return y + rowHeight;
      };

      let y = drawHeader(doc.y);
      doc.font('Helvetica').fontSize(8);

      rows.forEach((row, idx) => {
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = drawHeader(doc.page.margins.top);
          doc.font('Helvetica').fontSize(8);
        }
        if (idx % 2 === 1) {
          doc.rect(startX, y, pageWidth, rowHeight).fill('#F2F6FB');
        }
        doc.fillColor('#333333');
        pdfColumns.forEach((c, i) => {
          const val = row[c.key];
          doc.text(val === '' || val == null ? '-' : String(val), colX[i] + padding, y + padding, {
            width: c.w * pageWidth - padding * 2,
            height: rowHeight,
            ellipsis: true
          });
        });
        y += rowHeight;
      });

      // Total
      doc.moveTo(startX, y + 4).lineTo(startX + pageWidth, y + 4).strokeColor('#BFBFBF').stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1F4E78')
        .text(`Total allocations: ${rows.length}`, startX, y + 8);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  normalizeAllocations,
  buildAllocationExcel,
  buildAllocationPdf
};
