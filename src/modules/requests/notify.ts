import { config } from '../../core/config';
import { models, type Row } from '../../core/db';
import { logger } from '../../core/logger';
import type { IssuedLine } from './fulfil';
import { requestNumber } from './service';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const mail = require('../../../helpers/email_helper') as {
  FRONTEND_URL: string;
  sendRequestSubmittedToHOD: (request: object, employee: object, hod: object) => Promise<unknown>;
  sendRequestApprovedToStores: (request: object, employee: object, approvedBy: object, storesEmails: string[]) => Promise<unknown>;
  sendPPEReadyForCollection: (request: object, employee: object, allocations: object[]) => Promise<unknown>;
  sendRequestRejectedEmail: (request: object, employee: object, rejectedBy: object, reason: string) => Promise<unknown>;
  sendTemplatedEmail: (to: string, subject: string, title: string, content: string, actionUrl?: string, actionText?: string) => Promise<unknown>;
};

// The v1 templates interpolate values into HTML as-is
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Runs after the response is decided; a mail failure is logged and never reaches the caller. */
const send = (label: string, fn: () => Promise<unknown>) => {
  if (config.env === 'test') return;
  setImmediate(() => {
    fn().catch((err) => logger.error({ err, label }, 'Request notification failed'));
  });
};

const loadRequest = (id: string) =>
  models.Request.findByPk(id, {
    include: [
      {
        model: models.Employee,
        as: 'targetEmployee',
        include: [
          {
            model: models.Section,
            as: 'section',
            include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
          },
        ],
      },
      { model: models.RequestItem, as: 'items', include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['name'] }] },
    ],
  });

const usersWithRole = async (role: string, where: Record<string, unknown> = {}) => {
  const r = await models.Role.findOne({ where: { name: role } });
  if (!r) return [];
  return models.User.findAll({
    where: { roleId: r.id, isActive: true, ...where },
    include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName', 'email'] }],
  });
};

const employeeOf = (r: Row) => {
  const e = r.targetEmployee;
  return {
    firstName: esc(e?.firstName ?? 'Visitor'),
    lastName: esc(e?.lastName ?? ''),
    worksNumber: esc(e?.worksNumber ?? 'N/A'),
    email: (e?.email as string | null) ?? null,
    section: esc(e?.section?.name ?? 'N/A'),
    department: esc(e?.section?.department?.name ?? 'N/A'),
  };
};

const requestFor = (r: Row) => ({
  id: r.id,
  requestNumber: requestNumber(r.id),
  createdAt: r.createdAt,
  reason: r.comment ? esc(r.comment) : null,
  items: (r.items as Row[]).map((i) => ({ name: esc(i.ppeItem?.name ?? 'PPE item'), quantity: i.quantity, size: esc(i.size ?? '') || null })),
});

const actorName = async (userId: string) => {
  const u = await models.User.findByPk(userId, {
    attributes: ['username'],
    include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName'] }],
  });
  return {
    firstName: esc(u?.employee?.firstName ?? u?.username ?? 'Approver'),
    lastName: esc(u?.employee?.lastName ?? ''),
  };
};

/** Section rep approved: tell the department's HODs (v1 sends this on section-rep approval). */
export const notifyHods = (requestId: string) =>
  send('hod-review', async () => {
    const r = await loadRequest(requestId);
    const departmentId = r?.targetEmployee?.section?.departmentId ?? r?.departmentId;
    if (!r || !departmentId) return;
    for (const hod of await usersWithRole('hod', { departmentId })) {
      const email = hod.employee?.email;
      if (!email) continue;
      await mail.sendRequestSubmittedToHOD(requestFor(r), employeeOf(r), {
        firstName: esc(hod.employee?.firstName ?? hod.username),
        lastName: esc(hod.employee?.lastName ?? ''),
        email,
      });
    }
  });

/** HOD approved: tell stores. */
export const notifyStores = (requestId: string, approverId: string) =>
  send('stores-review', async () => {
    const r = await loadRequest(requestId);
    if (!r) return;
    const emails = (await usersWithRole('stores')).map((u) => u.employee?.email as string | undefined).filter((e): e is string => !!e);
    if (emails.length === 0) return;
    await mail.sendRequestApprovedToStores(requestFor(r), employeeOf(r), await actorName(approverId), emails);
  });

export const notifyRejected = (requestId: string, rejectorId: string, reason: string) =>
  send('rejected', async () => {
    const r = await loadRequest(requestId);
    const employee = r && employeeOf(r);
    if (!r || !employee?.email) return;
    await mail.sendRequestRejectedEmail(requestFor(r), employee, await actorName(rejectorId), esc(reason));
  });

export const notifyIssued = (
  requestId: string,
  issued: IssuedLine[],
  outstanding: Array<{ ppeName: string; quantity: number; size: string | null }>
) =>
  send('issued', async () => {
    const r = await loadRequest(requestId);
    const employee = r && employeeOf(r);
    if (!r || !employee?.email) return;
    const lines = issued.map((i) => ({ ppeName: esc(i.ppeName), quantity: i.quantity, size: esc(i.size ?? 'Standard') }));
    if (outstanding.length === 0) {
      await mail.sendPPEReadyForCollection(requestFor(r), employee, lines);
      return;
    }
    const row = (cells: Array<string | number>) =>
      `<tr>${cells.map((c) => `<td style="padding:10px;border-bottom:1px solid #E5E7EB;">${c}</td>`).join('')}</tr>`;
    const content = `
      <p style="color:#374151;line-height:1.6;">Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">Your PPE request has been <strong>partially fulfilled</strong>. Some items are ready for collection; the rest are pending until stock is available.</p>
      <h3 style="margin-top:18px;">Items allocated</h3>
      <table style="width:100%;border-collapse:collapse;margin:8px 0;">${lines.map((l) => row([l.ppeName, l.quantity, l.size])).join('')}</table>
      <h3 style="margin-top:18px;">Items pending</h3>
      <table style="width:100%;border-collapse:collapse;margin:8px 0;">${outstanding.map((o) => row([esc(o.ppeName), o.quantity, esc(o.size ?? 'N/A')])).join('')}</table>
      <p style="color:#374151;line-height:1.6;">Allocated items are available at Stores. We will let you know when the rest arrive.</p>`;
    await mail.sendTemplatedEmail(
      employee.email,
      `PPE Partially Fulfilled - #${requestNumber(r.id)}`,
      'PPE Partially Fulfilled',
      content,
      `${mail.FRONTEND_URL}/v2/requests/${r.id}`,
      'View request'
    );
  });
