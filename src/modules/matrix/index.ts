import { Router } from 'express';
import { audit } from '../../core/audit';
import { authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { JOB_TITLE_EDITORS, SECTION_EDITORS } from './policy';
import {
  eligibilityQuery,
  jobTitleMatrixQuery,
  jobTitleSaveBody,
  sectionMatrixQuery,
  sectionOptionsQuery,
  sectionSaveBody,
} from './schemas';
import {
  deleteJobTitleEntry,
  deleteSectionEntry,
  getEligibility,
  getJobTitleMatrix,
  getSectionMatrix,
  listJobTitleMatrix,
  listSectionMatrix,
  ppeItemOptions,
  saveJobTitleMatrix,
  saveSectionMatrix,
  sectionOptions,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/eligibility',
  route(async (req, res) => ok(res, await getEligibility(getAuth(req), parse(eligibilityQuery, req.query).employeeId)))
);

router.get('/options/ppe-items', route(async (_req, res) => ok(res, await ppeItemOptions())));

router.get(
  '/options/sections',
  route(async (req, res) => ok(res, await sectionOptions(getAuth(req), parse(sectionOptionsQuery, req.query).departmentId)))
);

/* Job-title matrix */

router.get(
  '/job-titles',
  route(async (req, res) => {
    const q = parse(jobTitleMatrixQuery, req.query);
    const { rows, count } = await listJobTitleMatrix(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/job-titles/:id',
  route(async (req, res) => ok(res, await getJobTitleMatrix(getAuth(req), parse(uuidParam, req.params).id)))
);

router.put(
  '/job-titles/entries',
  requireRole(...JOB_TITLE_EDITORS),
  route(async (req, res) => {
    const input = parse(jobTitleSaveBody, req.body);
    const result = await saveJobTitleMatrix(getAuth(req), input);
    await audit(req, 'MATRIX_SAVE', 'job_title_ppe_matrix', null, {
      ...result,
      jobTitleIds: [...new Set([...input.upserts, ...input.deletes].map((e) => e.jobTitleId))],
    });
    return ok(res, result);
  })
);

router.delete(
  '/job-titles/entries/:id',
  requireRole(...JOB_TITLE_EDITORS),
  route(async (req, res) => {
    await deleteJobTitleEntry(getAuth(req), parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

/* Section matrix */

router.get(
  '/sections',
  route(async (req, res) => {
    const q = parse(sectionMatrixQuery, req.query);
    const { rows, count } = await listSectionMatrix(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/sections/:id',
  route(async (req, res) => ok(res, await getSectionMatrix(getAuth(req), parse(uuidParam, req.params).id)))
);

router.put(
  '/sections/entries',
  requireRole(...SECTION_EDITORS),
  route(async (req, res) => {
    const input = parse(sectionSaveBody, req.body);
    const result = await saveSectionMatrix(getAuth(req), input);
    await audit(req, 'MATRIX_SAVE', 'section_ppe_matrix', null, {
      ...result,
      sectionIds: [...new Set([...input.upserts, ...input.deletes].map((e) => e.sectionId))],
    });
    return ok(res, result);
  })
);

router.delete(
  '/sections/entries/:id',
  requireRole(...SECTION_EDITORS),
  route(async (req, res) => {
    await deleteSectionEntry(getAuth(req), parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/matrix', router });
