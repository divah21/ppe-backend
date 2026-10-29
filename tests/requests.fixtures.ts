import { models, sequelize, type Row } from '../src/core/db';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

/**
 * An organisation for the request workflow: department A (sections A1, A2) and department B,
 * one user per role, employees, PPE items with a section matrix, stock and a budget.
 */
export const createRequestWorld = async () => {
  const fx = createFixtures();
  const a = await fx.org();
  const a2 = await fx.make('Section', { name: `${fx.tag}-section-a2`, departmentId: a.department.id });
  const b = await fx.org();

  const empA1 = await fx.employee(a.section.id, { email: null });
  const empA1b = await fx.employee(a.section.id);
  const empA2 = await fx.employee(a2.id);
  const empB = await fx.employee(b.section.id);

  const gloves = await fx.make('PPEItem', { name: `${fx.tag} gloves`, itemCode: `${fx.tag}-GLV`, replacementFrequency: 6 });
  const boots = await fx.make('PPEItem', {
    name: `${fx.tag} boots`,
    itemCode: `${fx.tag}-BTS`,
    hasSizeVariants: true,
    availableSizes: ['8', '9', '10'],
    replacementFrequency: 12,
  });
  const helmet = await fx.make('PPEItem', { name: `${fx.tag} helmet`, itemCode: `${fx.tag}-HLM` });

  await fx.make('SectionPPEMatrix', { sectionId: a.section.id, ppeItemId: gloves.id, quantityRequired: 2, isActive: true });
  await fx.make('SectionPPEMatrix', { sectionId: a.section.id, ppeItemId: boots.id, quantityRequired: 1, isActive: true });

  const stock = {
    gloves: await fx.make('Stock', { ppeItemId: gloves.id, quantity: 100, unitPriceUSD: 2.5 }),
    boots9: await fx.make('Stock', { ppeItemId: boots.id, quantity: 1, size: '9', unitPriceUSD: 40 }),
    boots8: await fx.make('Stock', { ppeItemId: boots.id, quantity: 10, size: '8', unitPriceUSD: 40 }),
    helmet: await fx.make('Stock', { ppeItemId: helmet.id, quantity: 0, unitPriceUSD: 15 }),
  };

  const budget = await fx.make('Budget', {
    departmentId: a.department.id,
    fiscalYear: new Date().getFullYear(),
    allocatedAmount: 1000,
    totalSpent: 0,
  });

  const users = {
    admin: await fx.user('admin'),
    sectionRep: await fx.user('section-rep', { sectionId: a.section.id }),
    sectionRepPeer: await fx.user('section-rep', { sectionId: a.section.id }),
    sectionRepA2: await fx.user('section-rep', { sectionId: a2.id }),
    deptRep: await fx.user('department-rep', { departmentId: a.department.id }),
    hod: await fx.user('hod', { departmentId: a.department.id }),
    hodB: await fx.user('hod', { departmentId: b.department.id }),
    sheq: await fx.user('sheq'),
    stores: await fx.user('stores'),
  };

  const agents = {} as Record<keyof typeof users, Agent>;
  for (const [key, user] of Object.entries(users)) agents[key as keyof typeof users] = await signIn(user.username);

  const employeeIds = [empA1, empA1b, empA2, empB].map((e) => e.id as string);

  /** Inserts a request directly, e.g. to start in a stage the API cannot reach today. */
  const insertRequest = async (
    status: string,
    employee: Row,
    items: Array<{ ppeItemId: string; quantity: number; size?: string }>,
    extra: Record<string, unknown> = {}
  ) => {
    const request = await models.Request.create({
      status,
      employeeId: employee.id,
      requestedById: users.sectionRep.id,
      sectionId: employee.sectionId,
      requestType: 'replacement',
      ...extra,
    });
    await models.RequestItem.bulkCreate(items.map((i) => ({ ...i, requestId: request.id })));
    return request;
  };

  const cleanup = async () => {
    // Visitor requests have no employee, so they are found by who raised them
    const replacements = { ids: employeeIds, users: Object.values(users).map((u) => u.id as string) };
    const mine = `SELECT id FROM requests WHERE employee_id IN (:ids) OR requested_by_id IN (:users)`;
    await sequelize.query(`DELETE FROM allocations WHERE employee_id IN (:ids) OR request_id IN (${mine})`, { replacements });
    await sequelize.query(`DELETE FROM request_items WHERE request_id IN (${mine})`, { replacements });
    await sequelize.query(`DELETE FROM requests WHERE id IN (${mine})`, { replacements });
    await fx.cleanup();
  };

  return {
    fx,
    a: { ...a, section2: a2 },
    b,
    employees: { empA1, empA1b, empA2, empB },
    ppe: { gloves, boots, helmet },
    stock,
    budget,
    users,
    agents,
    insertRequest,
    cleanup,
  };
};

export type RequestWorld = Awaited<ReturnType<typeof createRequestWorld>>;
