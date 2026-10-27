import { Op } from 'sequelize';
import { models } from '../src/core/db';
import { createFixtures } from './helpers';

/** createFixtures() plus the PPE items, job titles and allocations the matrix tests need. */
export const createMatrixFixtures = () => {
  const fx = createFixtures();
  const items: string[] = [];
  const jobTitles: string[] = [];
  const sections: string[] = [];
  let n = 0;

  const ppeItem = async (extra: Record<string, unknown> = {}) => {
    n++;
    const row = await fx.make('PPEItem', {
      name: `${fx.tag}-item-${n}`,
      itemCode: `${fx.tag}-I${n}`,
      category: 'HANDS',
      replacementFrequency: null,
      ...extra,
    });
    items.push(row.id);
    return row;
  };

  const jobTitle = async (sectionId: string, extra: Record<string, unknown> = {}) => {
    n++;
    const row = await fx.make('JobTitle', { name: `${fx.tag}-jt-${n}`, sectionId, ...extra });
    jobTitles.push(row.id);
    return row;
  };

  const org = async () => {
    const o = await fx.org();
    sections.push(o.section.id);
    return o;
  };

  const allocation = (employeeId: string, ppeItemId: string, issueDate: Date, extra: Record<string, unknown> = {}) =>
    fx.make('Allocation', { employeeId, ppeItemId, quantity: 1, issueDate, status: 'active', allocationType: 'annual', ...extra });

  const cleanup = async () => {
    await models.JobTitlePPEMatrix.destroy({
      where: { [Op.or]: [{ jobTitleId: jobTitles }, { ppeItemId: items }, { jobTitle: { [Op.like]: `${fx.tag}%` } }] },
    });
    await models.SectionPPEMatrix.destroy({ where: { [Op.or]: [{ sectionId: sections }, { ppeItemId: items }] } });
    await fx.cleanup();
  };

  return { ...fx, org, ppeItem, jobTitle, allocation, cleanup };
};

export const monthsAgo = (count: number, from = new Date()) => {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() - count);
  return d;
};
