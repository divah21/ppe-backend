import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { logger } from '../../core/logger';

export type Cell = string | number | Date | null;

export interface Column {
  header: string;
  key: string;
  width: number;
  align?: 'center' | 'right';
  /** Excel number format, e.g. 'dd/mm/yyyy' or '#,##0.00' */
  numFmt?: string;
}

export interface Sheet {
  name: string;
  title: string;
  infoLines: string[];
  columns: Column[];
  rows: Array<Record<string, Cell>>;
  totalLabel: string;
}

export const DATE_FMT = 'dd/mm/yyyy';
export const MONEY_FMT = '#,##0.00';

// Matches the v1 report styling so exports look the same to the people who file them
const HEADER_FILL = 'FF1F4E78';
const ZEBRA_FILL = 'FFF2F6FB';

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const writeSheet = (wb: ExcelJS.stream.xlsx.WorkbookWriter, sheet: Sheet) => {
  const headerRow = sheet.infoLines.length + 3;
  const ws = wb.addWorksheet(sheet.name.slice(0, 31), { views: [{ state: 'frozen', ySplit: headerRow }] });
  ws.columns = sheet.columns.map((c) => ({ key: c.key, width: c.width }));
  const span = sheet.columns.length;

  const line = (n: number, value: string, font: Partial<ExcelJS.Font>) => {
    ws.mergeCells(n, 1, n, span);
    const row = ws.getRow(n);
    row.getCell(1).value = value;
    row.getCell(1).font = font;
    row.commit();
  };

  line(1, sheet.title, { size: 16, bold: true });
  sheet.infoLines.forEach((text, i) => line(i + 2, text, { size: 10, color: { argb: 'FF555555' } }));

  const header = ws.getRow(headerRow);
  sheet.columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  header.commit();

  sheet.rows.forEach((data, r) => {
    const row = ws.getRow(headerRow + 1 + r);
    sheet.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = data[c.key] ?? null;
      cell.alignment = { horizontal: c.align ?? 'left', vertical: 'middle' };
      if (c.numFmt) cell.numFmt = c.numFmt;
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } };
    });
    row.commit();
  });

  const total = ws.getRow(headerRow + sheet.rows.length + 2);
  total.getCell(1).value = sheet.totalLabel;
  total.getCell(1).font = { bold: true };
  total.commit();
  ws.commit();
};

/** Streams a workbook to the response. Call only once all data is loaded, so errors can still be JSON. */
export const streamWorkbook = async (res: Response, filename: string, creator: string, sheets: Sheet[]) => {
  res.status(200);
  res.setHeader('Content-Type', XLSX_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: false });
  wb.creator = creator;
  wb.created = new Date();
  try {
    for (const sheet of sheets) writeSheet(wb, sheet);
    await wb.commit();
  } catch (err) {
    // Headers are gone; the only honest signal left is a broken download
    logger.error({ err, filename }, 'Report stream failed');
    res.destroy(err as Error);
  }
};
