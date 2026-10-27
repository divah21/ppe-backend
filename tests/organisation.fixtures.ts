import type { createFixtures } from './helpers';
import { signIn } from './helpers';

type Fixtures = ReturnType<typeof createFixtures>;
export type Agent = Awaited<ReturnType<typeof signIn>>;

/**
 * Two departments ("mine" and "other"), each with one section, plus signed-in agents for every role.
 * Department-bound users act for "mine"; the section rep acts for mine.section.
 */
export const orgWorld = async (fx: Fixtures) => {
  const mine = await fx.org();
  const other = await fx.org();
  const as = async (role: string, opts: Parameters<Fixtures['user']>[1] = {}) => signIn((await fx.user(role, opts)).username);
  const agents = {
    admin: await as('admin'),
    sheq: await as('sheq'),
    stores: await as('stores'),
    hod: await as('hod', { departmentId: mine.department.id }),
    departmentRep: await as('department-rep', { departmentId: mine.department.id }),
    sectionRep: await as('section-rep', { sectionId: mine.section.id }),
  };
  return { mine, other, agents };
};

export const ids = (body: { data: Array<{ id: string }> }) => body.data.map((r) => r.id).sort();
