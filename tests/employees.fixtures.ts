import { signIn, type createFixtures } from './helpers';

type Fixtures = ReturnType<typeof createFixtures>;

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

/**
 * Two departments: "mine" has sections A and B, "other" has one section. Employees in each,
 * one inactive, plus PPE allocations and requests for employee `a`, and a user per role.
 */
export const employeeWorld = async (fx: Fixtures) => {
  const mine = await fx.org();
  const other = await fx.org();
  const sectionB = await fx.make('Section', {
    name: `${fx.tag}-section-b`,
    code: `${fx.tag}-SB`,
    departmentId: mine.department.id,
  });
  const jobTitle = await fx.make('JobTitle', { name: `${fx.tag}-Fitter`, sectionId: mine.section.id });
  const costCentre = await fx.make('CostCenter', {
    code: `${fx.tag}-CC`,
    name: `${fx.tag} Plant`,
    departmentId: mine.department.id,
  });

  const a = await fx.employee(mine.section.id, {
    firstName: 'Thandiwe',
    lastName: `${fx.tag}Moyo`,
    jobTitleId: jobTitle.id,
    costCenterId: costCentre.id,
  });
  const b = await fx.employee(sectionB.id, { firstName: 'Brian', lastName: `${fx.tag}Ncube` });
  const c = await fx.employee(other.section.id, { firstName: 'Chipo', lastName: `${fx.tag}Dube` });
  const d = await fx.employee(mine.section.id, { firstName: 'Dumi', lastName: `${fx.tag}Sibanda`, isActive: false });

  const roleUser = async (role: string, opts: Parameters<Fixtures['user']>[1] = {}) =>
    signIn((await fx.user(role, opts)).username);

  const agents = {
    admin: await roleUser('admin'),
    sheq: await roleUser('sheq'),
    stores: await roleUser('stores'),
    hod: await roleUser('hod', { departmentId: mine.department.id }),
    deptRep: await roleUser('department-rep', { departmentId: mine.department.id }),
    sectionRep: await roleUser('section-rep', { sectionId: mine.section.id }),
  };
  const requester = await fx.user('section-rep', { sectionId: mine.section.id });

  const boots = await fx.make('PPEItem', {
    itemCode: `${fx.tag}-BOOT`,
    name: `${fx.tag} Safety boots`,
    category: 'FEET',
    replacementFrequency: 6,
  });
  const helmet = await fx.make('PPEItem', {
    itemCode: `${fx.tag}-HELM`,
    name: `${fx.tag} Hard hat`,
    category: 'HEAD',
    replacementFrequency: 12,
  });
  await fx.make('Allocation', { employeeId: a.id, ppeItemId: boots.id, quantity: 1, size: '9', issueDate: monthsAgo(8) });
  await fx.make('Allocation', { employeeId: a.id, ppeItemId: helmet.id, quantity: 1, issueDate: new Date() });
  await fx.make('Allocation', { employeeId: a.id, ppeItemId: helmet.id, quantity: 1, issueDate: monthsAgo(14), status: 'replaced' });

  const request = await fx.make('Request', {
    employeeId: a.id,
    requestedById: requester.id,
    sectionId: mine.section.id,
    departmentId: mine.department.id,
    status: 'pending',
    requestType: 'replacement',
  });
  await fx.make('RequestItem', { requestId: request.id, ppeItemId: boots.id, quantity: 1 });

  return { mine, other, sectionB, jobTitle, costCentre, employees: { a, b, c, d }, agents, request };
};

export type EmployeeWorld = Awaited<ReturnType<typeof employeeWorld>>;
