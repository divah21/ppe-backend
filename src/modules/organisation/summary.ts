import { QueryTypes } from 'sequelize';
import { sequelize } from '../../core/db';

/** Counts for the organisation screens' cards. */
export const organisationSummary = async () => {
  const [r] = await sequelize.query<Record<string, string>>(
    `SELECT
       (SELECT COUNT(*) FROM departments WHERE is_active) AS departments,
       (SELECT COUNT(*) FROM departments WHERE NOT is_active) AS inactive_departments,
       (SELECT COUNT(*) FROM sections WHERE is_active) AS sections,
       (SELECT COUNT(*) FROM sections WHERE NOT is_active) AS inactive_sections,
       (SELECT COUNT(*) FROM job_titles WHERE "isActive") AS job_titles,
       (SELECT COUNT(*) FROM job_titles WHERE NOT "isActive") AS inactive_job_titles,
       (SELECT COUNT(*) FROM job_titles jt WHERE jt."ppeCategoryId" IS NULL AND EXISTS (SELECT 1 FROM job_title_ppe_matrix m WHERE m."jobTitleId" = jt.id AND m.is_active)) AS categories,
       (SELECT COUNT(*) FROM job_titles WHERE "ppeCategoryId" IS NOT NULL) AS mapped,
       (SELECT COUNT(*) FROM job_titles jt WHERE jt."isActive" AND jt."ppeCategoryId" IS NULL
          AND NOT EXISTS (SELECT 1 FROM job_title_ppe_matrix m WHERE m."jobTitleId" = jt.id AND m.is_active)) AS without_ppe,
       (SELECT COUNT(*) FROM cost_centers) AS cost_centres,
       (SELECT COUNT(*) FROM employees WHERE "isActive") AS employees`,
    { type: QueryTypes.SELECT }
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    departments: { active: n('departments'), inactive: n('inactive_departments') },
    sections: { active: n('sections'), inactive: n('inactive_sections') },
    jobTitles: { active: n('job_titles'), inactive: n('inactive_job_titles'), categories: n('categories'), mapped: n('mapped'), withoutPpe: n('without_ppe') },
    costCentres: n('cost_centres'),
    employees: n('employees'),
  };
};
