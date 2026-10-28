import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { freeFiscalYear } from './finance.fixtures';
import { createFixtures, signIn, write } from './helpers';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const emailHelper = require('../helpers/email_helper');

const fx = createFixtures();

beforeAll(() => prepareV2());
afterAll(async () => {
  vi.restoreAllMocks();
  await fx.cleanup();
});

describe('budget allocation email', () => {
  it('escapes department and HOD names before they reach the HTML template', async () => {
    const send = vi.spyOn(emailHelper, 'sendBudgetAllocatedEmail').mockResolvedValue(undefined);
    const year = await freeFiscalYear();
    const { department, section } = await fx.org();
    await models.Department.update({ name: `${fx.tag}<b>x</b>` }, { where: { id: department.id } });
    const employee = await fx.employee(section.id, {
      firstName: '<a href="https://evil.test">Click</a>',
      lastName: "O'Neil & Co",
      email: `${fx.tag}@example.test`,
    });
    await fx.user('hod', { departmentId: department.id, employeeId: employee.id });
    const admin = await signIn((await fx.user('admin')).username);

    const company = await write(admin, 'post', '/api/v2/budgets/company').send({ fiscalYear: year, totalBudget: 1000 });
    fx.track('CompanyBudget', company.body.data.id);
    const res = await write(admin, 'post', '/api/v2/budgets').send({ departmentId: department.id, fiscalYear: year, allocatedAmount: 100 });
    expect(res.status).toBe(201);
    fx.track('Budget', res.body.data.id);

    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    const [, dept, hod] = send.mock.calls[0]!;
    expect(dept).toEqual({ name: `${fx.tag}&lt;b&gt;x&lt;/b&gt;` });
    expect(hod).toEqual({
      firstName: '&lt;a href=&quot;https://evil.test&quot;&gt;Click&lt;/a&gt;',
      lastName: 'O&#39;Neil &amp; Co',
      email: `${fx.tag}@example.test`,
    });
  });
});
