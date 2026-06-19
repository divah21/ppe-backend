const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generic styled table report builder used by tabular exports (e.g. the PPE
 * eligibility matrix report). Styling matches the allocations report.
 *
 * columns: [{ header, key, width (excel char width), w (pdf weight 0..1), align? }]
 * rows:    array of plain objects keyed by column.key
 * meta:    { title, infoLines?: string[], generatedBy?, generatedAt?, totalLabel? }
 *
 * Single-table:  buildTableExcel / buildTablePdf
 * Multi-table:   buildTablesExcel (one sheet per table) /
 *                buildTablesPdf (each table on its own page)
 */

const HEADER_FILL = 'FF1F4E78';
const ZEBRA_FILL = 'FFF2F6FB';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const buildInfoLines = (meta = {}) => {
  const lines = [...(meta.infoLines || [])];
  if (meta.generatedAt) lines.push(`Generated: ${formatDate(meta.generatedAt)}`);
  if (meta.generatedBy) lines.push(`By: ${meta.generatedBy}`);
  return lines;
};

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

const writeSheet = (sheet, { columns, rows, meta = {} }) => {
  const lastColLetter = sheet.getColumn(columns.length).letter;

  // Title
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = meta.title || 'Report';
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'left' };

  // Info / filter lines
  const infoLines = buildInfoLines(meta);
  let cursor = 2;
  infoLines.forEach((line) => {
    sheet.mergeCells(`A${cursor}:${lastColLetter}${cursor}`);
    const c = sheet.getCell(`A${cursor}`);
    c.value = line;
    c.font = { size: 10, color: { argb: 'FF555555' } };
    cursor += 1;
  });

  const headerRowNumber = cursor + 1;

  // Freeze title/info + header (ySplit must be > 0 to keep the file valid)
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

  // Header row
  const headerRow = sheet.getRow(headerRowNumber);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } };
    sheet.getColumn(idx + 1).width = col.width || 18;
  });
  headerRow.commit();

  // Data rows
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(headerRowNumber + 1 + i);
    columns.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      cell.value = row[col.key];
      cell.alignment = { horizontal: col.align || 'left', vertical: 'middle' };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } };
      }
    });
    excelRow.commit();
  });

  // Total row
  const totalRowNumber = headerRowNumber + 1 + rows.length + 1;
  sheet.mergeCells(`A${totalRowNumber}:C${totalRowNumber}`);
  const totalCell = sheet.getCell(`A${totalRowNumber}`);
  totalCell.value = meta.totalLabel || `Total rows: ${rows.length}`;
  totalCell.font = { bold: true };
};

const buildTableExcel = async ({ sheetName = 'Report', columns, rows, meta = {} }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.generatedBy || 'PPE Management System';
  writeSheet(workbook.addWorksheet(sheetName), { columns, rows, meta });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Build a workbook with one sheet per table.
 * tables: [{ sheetName, columns, rows, meta }]
 */
const buildTablesExcel = async ({ tables, creator }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator || 'PPE Management System';
  tables.forEach((t, i) => {
    writeSheet(workbook.addWorksheet(t.sheetName || `Sheet ${i + 1}`), {
      columns: t.columns,
      rows: t.rows,
      meta: t.meta || {}
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Draw a single table (header band + rows + total) starting at startY,
 * paginating as needed. Returns the Y position after the table.
 */
const drawTable = (doc, { columns, rows, totalLabel, startY }) => {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;

  const totalWeight = columns.reduce((s, c) => s + (c.w || 1 / columns.length), 0);
  const widthOf = (c) => ((c.w || 1 / columns.length) / totalWeight) * pageWidth;
  const colX = [];
  let acc = startX;
  columns.forEach((c) => {
    colX.push(acc);
    acc += widthOf(c);
  });

  const rowHeight = 18;
  const padding = 3;

  const drawHeader = (y) => {
    doc.rect(startX, y, pageWidth, rowHeight).fill('#1F4E78');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    columns.forEach((c, i) => {
      doc.text(c.header, colX[i] + padding, y + padding, {
        width: widthOf(c) - padding * 2,
        height: rowHeight,
        ellipsis: true
      });
    });
    return y + rowHeight;
  };

  let y = drawHeader(startY);
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
    columns.forEach((c, i) => {
      const val = row[c.key];
      doc.text(val === '' || val == null ? '-' : String(val), colX[i] + padding, y + padding, {
        width: widthOf(c) - padding * 2,
        height: rowHeight,
        ellipsis: true,
        align: c.align === 'center' ? 'center' : 'left'
      });
    });
    y += rowHeight;
  });

  doc.moveTo(startX, y + 4).lineTo(startX + pageWidth, y + 4).strokeColor('#BFBFBF').stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1F4E78')
    .text(totalLabel || `Total rows: ${rows.length}`, startX, y + 8);

  return y + 24;
};

const drawTitleBlock = (doc, meta = {}) => {
  const startX = doc.page.margins.left;
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1F4E78')
    .text(meta.title || 'Report', startX, doc.y);
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#555555');
  buildInfoLines(meta).forEach((line) => doc.text(line, startX, doc.y));
  doc.moveDown(0.5);
};

const buildTablePdf = ({ columns, rows, meta = {} }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawTitleBlock(doc, meta);
      drawTable(doc, { columns, rows, totalLabel: meta.totalLabel, startY: doc.y });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Build a single PDF containing multiple tables, each starting on its own page.
 * tables: [{ columns, rows, meta }]
 */
const buildTablesPdf = ({ tables, meta = {} }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Optional overall title once at the top
      if (meta.title) {
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1F4E78')
          .text(meta.title, doc.page.margins.left, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#555555');
        buildInfoLines(meta).forEach((line) => doc.text(line, doc.page.margins.left, doc.y));
        doc.moveDown(0.6);
      }

      tables.forEach((t, i) => {
        if (i > 0) doc.addPage();
        drawTitleBlock(doc, t.meta || {});
        drawTable(doc, { columns: t.columns, rows: t.rows, totalLabel: (t.meta || {}).totalLabel, startY: doc.y });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  buildTableExcel,
  buildTablePdf,
  buildTablesExcel,
  buildTablesPdf,
  formatDate
};
