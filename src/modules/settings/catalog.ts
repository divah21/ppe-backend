import { z, type ZodTypeAny } from 'zod';

/*
 * Every setting an admin may change, with its type, default and validation. Defaults are what the
 * system does when no row is stored. Keys outside this catalog are rejected.
 */

export type SettingKind = 'boolean' | 'number' | 'text' | 'email' | 'select' | 'time' | 'secret' | 'idList';
export type StoredType = 'string' | 'number' | 'boolean' | 'json';
export type SettingValue = string | number | boolean | string[];

export interface SettingDef {
  key: string;
  label: string;
  description: string;
  kind: SettingKind;
  default: SettingValue;
  options?: ReadonlyArray<{ value: string; label: string }>;
  min?: number;
  max?: number;
  unit?: string;
  schema: ZodTypeAny;
}

type Meta = { label: string; description: string };

const bool = (key: string, m: Meta, def: boolean): SettingDef => ({ key, ...m, kind: 'boolean', default: def, schema: z.boolean() });

const int = (key: string, m: Meta, def: number, min: number, max: number, unit?: string): SettingDef => ({
  key,
  ...m,
  kind: 'number',
  default: def,
  min,
  max,
  unit,
  schema: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Enter a whole number')
    .min(min, `Enter ${min} or more`)
    .max(max, `Enter ${max} or less`),
});

const text = (key: string, m: Meta, def: string, opts: { max?: number; required?: boolean; pattern?: [RegExp, string] } = {}): SettingDef => {
  let s = z.string().trim().max(opts.max ?? 255, `Keep it under ${opts.max ?? 255} characters`);
  if (opts.required) s = s.min(1, 'This is required');
  if (opts.pattern) s = s.regex(opts.pattern[0], opts.pattern[1]);
  return { key, ...m, kind: 'text', default: def, schema: opts.pattern && !opts.required ? s.or(z.literal('')) : s };
};

const email = (key: string, m: Meta, def: string): SettingDef => ({
  key,
  ...m,
  kind: 'email',
  default: def,
  schema: z.string().trim().max(255).email('Enter a valid email address').or(z.literal('')),
});

const choice = (key: string, m: Meta, def: string, options: ReadonlyArray<{ value: string; label: string }>): SettingDef => ({
  key,
  ...m,
  kind: 'select',
  default: def,
  options,
  schema: z.string().refine((v) => options.some((o) => o.value === v), 'Choose one of the listed options'),
});

const time = (key: string, m: Meta, def: string): SettingDef => ({
  key,
  ...m,
  kind: 'time',
  default: def,
  schema: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 18:00'),
});

const secret = (key: string, m: Meta): SettingDef => ({ key, ...m, kind: 'secret', default: '', schema: z.string().max(255) });

const idList = (key: string, m: Meta): SettingDef => ({
  key,
  ...m,
  kind: 'idList',
  default: [],
  schema: z.array(z.string().uuid('Choose items from the catalogue')).max(500),
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
  (label, i) => ({ value: String(i + 1).padStart(2, '0'), label })
);

const ROLE_OPTIONS = [
  { value: 'section-rep', label: 'Section rep' },
  { value: 'department-rep', label: 'Department rep' },
  { value: 'hod', label: 'Head of department' },
  { value: 'stores', label: 'Stores' },
  { value: 'sheq', label: 'SHEQ' },
];

export interface SettingCategory {
  key: string;
  label: string;
  description: string;
  settings: SettingDef[];
}

export const CATALOG: readonly SettingCategory[] = [
  {
    key: 'general',
    label: 'General',
    description: 'Names, regional formats and maintenance mode.',
    settings: [
      text('systemName', { label: 'System name', description: 'Shown in page titles and emails' }, 'Eureka PPE System', { required: true, max: 100 }),
      text('organizationName', { label: 'Organisation name', description: 'Printed on reports' }, 'Eureka Mining', { required: true, max: 100 }),
      choice('timezone', { label: 'Time zone', description: 'Used for schedules and dates' }, 'Africa/Johannesburg', [
        { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
        { value: 'Africa/Harare', label: 'Harare (CAT)' },
        { value: 'UTC', label: 'UTC' },
      ]),
      choice('dateFormat', { label: 'Date format', description: 'How dates are displayed' }, 'DD/MM/YYYY', [
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
      ]),
      text('currency', { label: 'Currency', description: 'Three-letter ISO code, for example USD' }, 'ZAR', {
        required: true,
        max: 3,
        pattern: [/^[A-Z]{3}$/, 'Use a three-letter code like USD'],
      }),
      choice('language', { label: 'Language', description: 'Default language' }, 'en', [{ value: 'en', label: 'English' }]),
      choice('fiscalYearStart', { label: 'Financial year starts', description: 'First month of the budget year' }, '01', MONTHS),
      bool('maintenanceMode', { label: 'Maintenance mode', description: 'Flags the system as under maintenance' }, false),
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Which alerts and summaries are emailed.',
    settings: [
      bool('emailNotifications', { label: 'Email notifications', description: 'Master switch for all emails' }, true),
      bool('budgetAlerts', { label: 'Budget alerts', description: 'Warn when a budget passes the threshold' }, true),
      int('budgetThreshold', { label: 'Budget alert threshold', description: 'Share of budget spent before alerting' }, 80, 1, 100, '%'),
      bool('approvalRequests', { label: 'Approval requests', description: 'Email approvers when a request needs them' }, true),
      bool('lowStockAlerts', { label: 'Low stock alerts', description: 'Email stores when stock runs low' }, true),
      int('stockThreshold', { label: 'Low stock threshold', description: 'Default quantity treated as low' }, 10, 0, 100_000, 'units'),
      bool('weeklyReports', { label: 'Weekly reports', description: 'Send a weekly summary' }, true),
      bool('monthlyReports', { label: 'Monthly reports', description: 'Send a monthly summary' }, false),
      bool('ppeExpiryAlerts', { label: 'PPE renewal alerts', description: 'Warn before PPE is due for renewal' }, true),
      int('expiryDaysBefore', { label: 'Renewal warning', description: 'Days before renewal to warn' }, 30, 1, 365, 'days'),
      bool('newUserAlerts', { label: 'New user alerts', description: 'Email admins when an account is created' }, true),
      bool('systemAlerts', { label: 'System alerts', description: 'Critical system alerts' }, true),
    ],
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Password rules, lockout and auditing.',
    settings: [
      int('sessionTimeout', { label: 'Session timeout', description: 'Idle time before signing out' }, 30, 5, 1440, 'minutes'),
      int('passwordMinLength', { label: 'Minimum password length', description: 'Characters required' }, 8, 8, 128, 'characters'),
      bool('requireUppercase', { label: 'Require an uppercase letter', description: 'Passwords need A–Z' }, true),
      bool('requireNumber', { label: 'Require a number', description: 'Passwords need 0–9' }, true),
      bool('requireSpecialChar', { label: 'Require a symbol', description: 'Passwords need a symbol such as !' }, true),
      bool('twoFactorAuth', { label: 'Two-factor sign-in', description: 'Require a second step at sign-in' }, false),
      bool('passwordExpiry', { label: 'Password expiry', description: 'Ask people to change passwords regularly' }, true),
      int('passwordExpiryDays', { label: 'Password lifetime', description: 'Days before a password expires' }, 90, 1, 365, 'days'),
      int('maxLoginAttempts', { label: 'Sign-in attempts', description: 'Failed attempts before lockout' }, 5, 1, 20),
      int('lockoutDuration', { label: 'Lockout duration', description: 'How long an account stays locked' }, 15, 1, 1440, 'minutes'),
      bool('ipWhitelisting', { label: 'IP allow list', description: 'Only allow known networks' }, false),
      bool('auditLogging', { label: 'Audit logging', description: 'Record changes in the audit log' }, true),
    ],
  },
  {
    key: 'database',
    label: 'Backups',
    description: 'Automatic database backups. Schedule changes apply immediately.',
    settings: [
      bool('autoBackup', { label: 'Automatic backups', description: 'Back up the database every day' }, true),
      time('backupTime', { label: 'Backup time', description: 'Server time, 24-hour clock' }, '18:00'),
      int('backupRetention', { label: 'Keep backups for', description: 'Older automatic backups are deleted' }, 30, 1, 3650, 'days'),
    ],
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Outgoing mail server and sender details.',
    settings: [
      text('smtpServer', { label: 'SMTP server', description: 'Host name of the mail server' }, '', {
        pattern: [/^[A-Za-z0-9.-]+$/, 'Enter a host name like smtp.example.com'],
      }),
      int('smtpPort', { label: 'SMTP port', description: 'Usually 587 for TLS' }, 587, 1, 65_535),
      choice('encryption', { label: 'Encryption', description: 'How the connection is secured' }, 'tls', [
        { value: 'tls', label: 'TLS (STARTTLS)' },
        { value: 'ssl', label: 'SSL' },
        { value: 'none', label: 'None' },
      ]),
      text('smtpUsername', { label: 'SMTP username', description: 'Account used to send mail' }, ''),
      secret('smtpPassword', { label: 'SMTP password', description: 'Stored securely and never shown again' }),
      email('fromEmail', { label: 'From address', description: 'Sender address on emails' }, 'noreply@eureka.com'),
      text('fromName', { label: 'From name', description: 'Sender name on emails' }, 'Eureka PPE System', { max: 100 }),
      email('replyTo', { label: 'Reply-to address', description: 'Where replies go' }, 'support@eureka.com'),
      int('maxRetries', { label: 'Retry attempts', description: 'Retries for a failed email' }, 3, 0, 10),
      int('rateLimitPerHour', { label: 'Hourly limit', description: 'Most emails sent per hour' }, 100, 1, 100_000, 'emails'),
    ],
  },
  {
    key: 'appearance',
    label: 'Appearance',
    description: 'Defaults for the classic screens.',
    settings: [
      choice('theme', { label: 'Theme', description: 'Default colour theme' }, 'system', [
        { value: 'system', label: 'Match device' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]),
      text('primaryColor', { label: 'Accent colour', description: 'Hex colour, for example #3b82f6' }, '#3b82f6', {
        required: true,
        max: 7,
        pattern: [/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #3b82f6'],
      }),
      choice('sidebarPosition', { label: 'Sidebar position', description: 'Side of the screen for navigation' }, 'left', [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ]),
      bool('compactMode', { label: 'Compact mode', description: 'Tighter spacing' }, false),
      bool('showBreadcrumbs', { label: 'Breadcrumbs', description: 'Show the page trail' }, true),
      bool('animationsEnabled', { label: 'Animations', description: 'Animate transitions' }, true),
      int('tableRowsPerPage', { label: 'Rows per page', description: 'Default table page size' }, 10, 5, 100, 'rows'),
      choice('dateTimeFormat', { label: 'Clock', description: 'How times are displayed' }, '24h', [
        { value: '24h', label: '24-hour' },
        { value: '12h', label: '12-hour' },
      ]),
    ],
  },
  {
    key: 'api',
    label: 'API',
    description: 'Request rate limits.',
    settings: [
      bool('rateLimitEnabled', { label: 'Rate limiting', description: 'Throttle heavy API use' }, true),
      int('requestsPerMinute', { label: 'Requests per minute', description: 'Per client' }, 60, 1, 10_000),
      int('requestsPerHour', { label: 'Requests per hour', description: 'Per client' }, 1000, 1, 1_000_000),
    ],
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Account defaults and request limits.',
    settings: [
      choice('defaultRole', { label: 'Default role', description: 'Role given to new accounts' }, 'section-rep', ROLE_OPTIONS),
      bool('requireEmailVerification', { label: 'Verify email', description: 'New accounts confirm their email' }, true),
      bool('autoActivateAccounts', { label: 'Activate automatically', description: 'New accounts are active straight away' }, false),
      bool('welcomeEmailEnabled', { label: 'Welcome email', description: 'Email new account holders' }, true),
      int('passwordResetExpiry', { label: 'Reset link lifetime', description: 'Hours a reset link stays valid' }, 24, 1, 168, 'hours'),
      choice('defaultDashboard', { label: 'Default dashboard', description: 'Home screen after sign-in' }, 'role_based', [
        { value: 'role_based', label: 'Based on role' },
      ]),
      int('maxPPERequestItems', { label: 'Items per request', description: 'Most PPE lines on one request' }, 10, 1, 100, 'items'),
      bool('requireManagerApproval', { label: 'Manager approval', description: 'Requests need a manager to approve' }, true),
      bool('allowSelfRegistration', { label: 'Self registration', description: 'People can create their own accounts' }, false),
    ],
  },
  {
    key: 'allocation',
    label: 'Allocations',
    description: 'Extra items beyond the PPE matrix.',
    settings: [
      bool('enableAdditionalItems', { label: 'Allow additional items', description: 'Request items outside the PPE matrix' }, true),
      bool('restrictAdditionalItems', { label: 'Restrict additional items', description: 'Only the items listed below' }, false),
      idList('allowedAdditionalItemIds', { label: 'Allowed additional items', description: 'PPE items that may be added' }),
      int('maxAdditionalItems', { label: 'Additional items per request', description: 'Most extra lines on one request' }, 5, 0, 50, 'items'),
      bool('requireJustificationForAdditional', { label: 'Require a reason', description: 'Extra items need a justification' }, true),
    ],
  },
];

export const CATEGORY_KEYS = CATALOG.map((c) => c.key) as [string, ...string[]];

export const findCategory = (key: string) => CATALOG.find((c) => c.key === key);

export const storedTypeOf = (def: SettingDef): StoredType =>
  def.kind === 'boolean' ? 'boolean' : def.kind === 'number' ? 'number' : def.kind === 'idList' ? 'json' : 'string';

/** Body schema for one category: known keys only, at least one. */
export const categoryBody = (category: SettingCategory) =>
  z
    .object(Object.fromEntries(category.settings.map((s) => [s.key, s.schema.optional()])))
    .strict()
    .refine((v) => Object.values(v).some((x) => x !== undefined), 'Change at least one setting');
