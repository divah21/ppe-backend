import type { Row } from '../src/core/db';
import { createFixtures, signIn } from './helpers';

const monthsAgo = (months: number, plusDays = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() + plusDays);
  return d;
};

/**
 * Two departments ("mine" and "other") with employees, PPE items, stock, allocations and
 * requests, plus a signed-in user per role. Department A is where the scoped users work.
 */
export const createInsightsWorld = async () => {
  const fx = createFixtures();
  const mine = await fx.org();
  const other = await fx.org();
  const empA = await fx.employee(mine.section.id, { firstName: `${fx.tag}-Alice` });
  const empB = await fx.employee(other.section.id, { firstName: `${fx.tag}-Bob` });
  const category = `${fx.tag}-cat`;

  const item = (n: number, extra: Record<string, unknown> = {}) =>
    fx.make('PPEItem', { name: `${fx.tag}-item-${n}`, itemCode: `${fx.tag}-I${n}`, category, replacementFrequency: 6, ...extra });
  const required = await item(1);
  const extra = await item(2);
  const neverIssued = await item(3);
  await fx.make('SectionPPEMatrix', { sectionId: mine.section.id, ppeItemId: required.id, quantityRequired: 1 });
  await fx.make('SectionPPEMatrix', { sectionId: mine.section.id, ppeItemId: neverIssued.id, quantityRequired: 2 });
  const lowStock = await fx.make('Stock', { ppeItemId: required.id, quantity: 2, minLevel: 10, location: `${fx.tag}-store`, unitPriceUSD: 5 });

  const users = {
    admin: await fx.user('admin'),
    stores: await fx.user('stores'),
    sheq: await fx.user('sheq'),
    hod: await fx.user('hod', { departmentId: mine.department.id }),
    deptRep: await fx.user('department-rep', { departmentId: mine.department.id }),
    sectionRep: await fx.user('section-rep', { sectionId: mine.section.id }),
    otherSectionRep: await fx.user('section-rep', { sectionId: other.section.id }),
  };

  const allocation = (employee: Row, ppe: Row, issueDate: Date, quantity: number, totalCost: number) =>
    fx.make('Allocation', {
      employeeId: employee.id,
      ppeItemId: ppe.id,
      issuedById: users.stores.id,
      quantity,
      issueDate,
      unitCost: totalCost / quantity,
      totalCost,
      status: 'active',
      size: 'M',
    });
  // Renewal falls ~10 days from now (issue + 6 months)
  const dueSoon = await allocation(empA, extra, monthsAgo(6, 10), 1, 100);
  const thisMonth = await allocation(empA, required, new Date(), 2, 40);
  const otherDept = await allocation(empB, required, new Date(), 1, 50);

  const request = (employee: Row, org: typeof mine, status: string) =>
    fx.make('Request', {
      employeeId: employee.id,
      requestedById: users.sectionRep.id,
      departmentId: org.department.id,
      sectionId: org.section.id,
      status,
      requestType: 'replacement',
    });
  const pending = await request(empA, mine, 'pending');
  const hodReview = await request(empA, mine, 'hod-review');
  const storesReview = await request(empB, other, 'stores-review');
  await fx.make('RequestItem', { requestId: pending.id, ppeItemId: required.id, quantity: 1, size: 'M' });

  const agent = async (u: Row) => signIn(u.username);

  return {
    fx,
    mine,
    other,
    category,
    employees: { empA, empB },
    items: { required, extra, neverIssued },
    stock: { lowStock },
    allocations: { dueSoon, thisMonth, otherDept },
    requests: { pending, hodReview, storesReview },
    users,
    agent,
  };
};

export type InsightsWorld = Awaited<ReturnType<typeof createInsightsWorld>>;
