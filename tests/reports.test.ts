import ExcelJS from 'exceljs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app } from './helpers';
import { createInsightsWorld, type InsightsWorld } from './insights.fixtures';

let w: InsightsWorld;
type Agent = Awaited<ReturnType<InsightsWorld['agent']>>;
let admin: Agent;
let hod: Agent;
let stores: Agent;
let sectionRep: Agent;

beforeAll(async () => {
  await prepareV2();
  w = await createInsightsWorld();
  [admin, hod, stores, sectionRep] = await Promise.all([
    w.agent(w.users.admin),
    w.agent(w.users.hod),
    w.agent(w.users.stores),
    w.agent(w.users.sectionRep),
  ]);
});
afterAll(() => w?.fx.cleanup());

const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

/** Downloads a report and returns each sheet's cell text, row by row. */
const download = async (agent: Agent, path: string, query: Record<string, string> = {}) => {
  const res = await agent.get(`/api/v2/reports/${path}`).query(query).buffer(true).parse(binary);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('spreadsheetml');
  expect(res.headers['content-disposition']).toMatch(new RegExp(`attachment; filename="${path}_\\d{4}-\\d{2}-\\d{2}\\.xlsx"`));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.body);
  return wb.worksheets.map((ws) => {
    const rows: string[][] = [];
    ws.eachRow((row) => rows.push((row.values as unknown[]).slice(1).map((v) => (v instanceof Date ? v.toISOString() : String(v ?? '')))));
    return { name: ws.name, rows, text: rows.map((r) => r.join(' | ')).join('\n') };
  });
};

describe('GET /api/v2/reports', () => {
  it('lists the reports each role may run', async () => {
    const keys = async (agent: Agent) => (await agent.get('/api/v2/reports')).body.data.map((r: { key: string }) => r.key);
    expect(await keys(stores)).toEqual(['allocations', 'requests', 'stock', 'matrix', 'ppe-cards']);
    expect(await keys(hod)).toEqual(['allocations', 'requests', 'ppe-cards']);
    expect(await keys(sectionRep)).toEqual([]);
  });

  it('offers only in-scope departments and sections as filters', async () => {
    const res = await hod.get('/api/v2/reports/options');
    expect(res.status).toBe(200);
    expect(res.body.data.departments).toEqual([{ id: w.mine.department.id, name: w.mine.department.name }]);
    expect(res.body.data.sections).toEqual([{ id: w.mine.section.id, name: w.mine.section.name, departmentId: w.mine.department.id }]);
    expect(res.body.data.categories).toEqual([]);
    const all = (await stores.get('/api/v2/reports/options')).body.data;
    expect(all.categories).toContain(w.category);
    expect(all.locations).toContain(`${w.fx.tag}-store`);
  });
});

describe('report exports', () => {
  it('exports allocations grouped by employee with renewal and cost', async () => {
    const [sheet] = await download(admin, 'allocations', { departmentId: w.mine.department.id });
    expect(sheet!.name).toBe('Allocations');
    expect(sheet!.text).toContain(`Department: ${w.mine.department.name}`);
    expect(sheet!.text).toContain(w.items.extra.name);
    expect(sheet!.text).toContain(w.items.required.name);
    expect(sheet!.text).not.toContain(`${w.fx.tag}-Bob`);
    expect(sheet!.text.match(new RegExp(`${w.fx.tag}-Alice`, 'g'))).toHaveLength(1);
    expect(sheet!.text).toContain('Total allocations: 2   |   Total cost: 140.00');
  });

  it('never widens a HOD beyond their department', async () => {
    const [own] = await download(hod, 'allocations');
    expect(own!.text).toContain(`${w.fx.tag}-Alice`);
    expect(own!.text).toContain(`Scope: ${w.mine.department.name}`);
    expect(own!.text).not.toContain(`${w.fx.tag}-Bob`);
    const [foreign] = await download(hod, 'allocations', { departmentId: w.other.department.id, sectionId: w.other.section.id });
    expect(foreign!.text).toContain('Total allocations: 0');
    expect(foreign!.text).not.toContain(w.other.department.name);
    expect(foreign!.text).not.toContain(w.other.section.name);
    expect(foreign!.text).toContain('Department: Outside your scope');
  });

  it('filters allocations by period and search', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [sheet] = await download(admin, 'allocations', { q: `${w.fx.tag}-Alice`, from: today });
    expect(sheet!.text).toContain(w.items.required.name);
    expect(sheet!.text).not.toContain(w.items.extra.name);
  });

  it('exports requests in scope with their items', async () => {
    const [sheet] = await download(hod, 'requests');
    expect(sheet!.text).toContain(`${w.items.required.name} x1 (M)`);
    expect(sheet!.text).toContain('hod-review');
    expect(sheet!.text).not.toContain('stores-review');
    expect(sheet!.text).toContain('Total requests: 2');
  });

  it('exports stock with low-stock flags for stores', async () => {
    const [sheet] = await download(stores, 'stock', { category: w.category, lowOnly: 'true' });
    expect(sheet!.text).toContain(w.items.required.name);
    expect(sheet!.text).toContain('Low');
    expect(sheet!.text).toContain('Stock lines: 1   |   Units: 2   |   Value (USD): 10.00');
  });

  it('exports the PPE matrix as two sheets', async () => {
    const sheets = await download(stores, 'matrix', { departmentId: w.mine.department.id });
    expect(sheets.map((s) => s.name)).toEqual(['By job title', 'By section']);
    expect(sheets[1]!.text).toContain(w.mine.section.name);
    expect(sheets[1]!.text).toContain(w.items.neverIssued.name);
  });

  it('exports PPE cards with what is issued, due and missing', async () => {
    const [sheet] = await download(hod, 'ppe-cards', { q: `${w.fx.tag}-Alice` });
    const line = (item: string) => sheet!.rows.find((r) => r.includes(item))!;
    expect(line(w.items.required.name)).toContain('Issued');
    expect(line(w.items.neverIssued.name)).toContain('Not issued');
    expect(line(w.items.extra.name)).toEqual(expect.arrayContaining(['Additional', 'Due soon']));
    expect(sheet!.text).toContain('Employees: 1   |   Overdue: 0   |   Due within 30 days: 1   |   Not issued: 1');
  });

  it('records each export in the audit log', async () => {
    await download(stores, 'stock', { category: w.category });
    const entry = await models.AuditLog.findOne({
      where: { userId: w.users.stores.id, action: 'REPORT_EXPORT' },
      order: [['createdAt', 'DESC']],
    });
    expect(entry?.meta).toMatchObject({ report: 'stock', filters: { category: w.category } });
  });
});

describe('report validation and access', () => {
  it('rejects bad filters with 422', async () => {
    const range = await admin.get('/api/v2/reports/allocations').query({ from: '2026-05-01', to: '2026-04-01' });
    expect(range.status).toBe(422);
    expect(range.body.error.details.fieldErrors.to).toBeDefined();
    expect((await admin.get('/api/v2/reports/requests').query({ departmentId: 'nope' })).status).toBe(422);
    expect((await admin.get('/api/v2/reports/requests').query({ status: 'lost' })).status).toBe(422);
    expect((await admin.get('/api/v2/reports/allocations').query({ from: '2026-02-31' })).status).toBe(422);
  });

  it('forbids roles without the report', async () => {
    expect((await hod.get('/api/v2/reports/stock')).status).toBe(403);
    expect((await hod.get('/api/v2/reports/matrix')).status).toBe(403);
    expect((await sectionRep.get('/api/v2/reports/allocations')).status).toBe(403);
    expect((await sectionRep.get('/api/v2/reports/options')).status).toBe(403);
  });

  it('requires a session', async () => {
    expect((await request(app).get('/api/v2/reports')).status).toBe(401);
    expect((await request(app).get('/api/v2/reports/allocations')).status).toBe(401);
  });
});
