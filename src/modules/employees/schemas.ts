import { z } from 'zod';
import { listQuery } from '../../core/http';

export const EMPLOYEE_SORTS = ['name', 'worksNumber', 'section', 'dateJoined', 'createdAt'] as const;

export const employeeListQuery = listQuery(EMPLOYEE_SORTS, {
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  jobTitleId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  jobType: z.string().trim().max(100).optional(),
});

export const employeeSummaryQuery = z.object({
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

export const employeeOptionsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  sectionId: z.string().uuid().optional(),
});

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
const PHONE = /^[0-9+\-\s()]+$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalUpper = (max: number) => optionalText(max).transform((v) => (v ? v.toUpperCase() : null));

const optionalDate = z
  .union([z.string().trim().date('Enter a valid date'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const optionalId = z
  .union([z.string().uuid(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

export const employeeBody = z.object({
  worksNumber: z.string().trim().min(1, 'Enter the works number').max(50, 'Use at most 50 characters'),
  firstName: z.string().trim().min(1, 'Enter the first name').max(100, 'Use at most 100 characters'),
  lastName: z.string().trim().min(1, 'Enter the last name').max(100, 'Use at most 100 characters'),
  employeeId: optionalText(50),
  email: z
    .union([z.string().trim().toLowerCase().email('Enter a valid email address').max(255), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  phoneNumber: optionalText(20).refine((v) => v === null || PHONE.test(v), 'Use digits, spaces, +, - and brackets only'),
  sectionId: z.string({ required_error: 'Choose a section' }).uuid('Choose a section'),
  jobTitleId: optionalId,
  costCenterId: optionalId,
  jobType: optionalUpper(100),
  gender: z
    .union([z.string().trim().toUpperCase().pipe(z.enum(GENDERS, { message: 'Choose male, female or other' })), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  contractType: optionalUpper(50),
  dateOfBirth: optionalDate,
  dateJoined: optionalDate,
});

export type EmployeeInput = z.infer<typeof employeeBody>;

export const employeeUpdateBody = employeeBody.extend({
  // Admin only: also move user accounts that managed the old section or department
  moveAccounts: z.boolean().default(false),
});

export type EmployeeUpdate = z.infer<typeof employeeUpdateBody>;

export const transferQuery = z.object({
  sectionId: z.string().uuid('Choose a section'),
  jobTitleId: optionalId,
});

export type TransferQuery = z.infer<typeof transferQuery>;

export const IMPORT_MAX_ROWS = 2000;

export const importBody = z.object({
  dryRun: z.boolean().default(false),
  /** Leave employees whose works number exists as they are, instead of updating them */
  skipExisting: z.boolean().default(false),
  /** Email new employees who have an address, as adding one by hand does (v1 option) */
  sendOnboardingEmails: z.boolean().default(false),
  rows: z
    .array(z.record(z.unknown()))
    .min(1, 'The file has no employee rows')
    .max(IMPORT_MAX_ROWS, `Import at most ${IMPORT_MAX_ROWS} rows at a time`),
});

/** Spreadsheet cells arrive as strings, numbers or nothing; blanks mean "not given". */
const cell = (max: number) =>
  z.preprocess(
    (v) => (v === null || v === undefined ? undefined : String(v).trim() || undefined),
    z.string().max(max, `Use at most ${max} characters`).optional()
  );

const requiredCell = (max: number, message: string) =>
  z.preprocess(
    (v) => (v === null || v === undefined ? '' : String(v).trim()),
    z.string().min(1, message).max(max, `Use at most ${max} characters`)
  );

const GENDER_ALIASES: Record<string, (typeof GENDERS)[number]> = { M: 'MALE', F: 'FEMALE', MALE: 'MALE', FEMALE: 'FEMALE', OTHER: 'OTHER' };

export const importRow = z.object({
  worksNumber: requiredCell(50, 'Works number is required'),
  firstName: requiredCell(100, 'First name is required'),
  lastName: requiredCell(100, 'Last name is required'),
  section: requiredCell(100, 'Section is required'),
  jobTitle: cell(100),
  costCentre: cell(100),
  jobType: cell(100).transform((v) => v?.toUpperCase()),
  gender: cell(20).refine((v) => v === undefined || v.toUpperCase() in GENDER_ALIASES, 'Use male, female or other').transform(
    (v) => (v ? GENDER_ALIASES[v.toUpperCase()] : undefined)
  ),
  contractType: cell(50).transform((v) => v?.toUpperCase()),
  email: cell(255).pipe(z.string().toLowerCase().email('Enter a valid email address').optional()),
  phoneNumber: cell(20).refine((v) => v === undefined || PHONE.test(v), 'Use digits, spaces, +, - and brackets only'),
  dateJoined: cell(10).pipe(z.string().date('Use a YYYY-MM-DD date').optional()),
});

export type ImportRow = z.infer<typeof importRow>;
