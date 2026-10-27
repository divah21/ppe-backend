import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PASSWORD, app, createFixtures } from './helpers';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const transporter = require('../helpers/mailer_transport.js');
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { escapeHtml } = require('../helpers/email_helper');

const fx = createFixtures();
afterAll(() => fx.cleanup());
afterEach(() => vi.restoreAllMocks());

describe('v1 notification emails', () => {
  it('escapeHtml encodes markup and tolerates empty values', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('sends the typed rejection reason and names as text, not HTML', async () => {
    const { section } = await fx.org();
    const employee = await fx.employee(section.id, { firstName: '<b>Eve</b>', email: `${fx.tag}@example.test` });
    const admin = await fx.user('admin');
    const req = await fx.make('Request', { status: 'pending', employeeId: employee.id, requestedById: admin.id });
    const sent = vi.spyOn(transporter, 'sendMail').mockResolvedValue({ messageId: 'test' });

    const login = await request(app).post('/api/v1/auth/login').send({ username: admin.username, password: PASSWORD });
    const res = await request(app)
      .put(`/api/v1/requests/${req.id}/reject`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ rejectionReason: '<a href="https://evil.test">Re-submit here</a>' });

    expect(res.status).toBe(200);
    expect(sent).toHaveBeenCalledTimes(1);
    const { html, to } = sent.mock.calls[0]![0] as { html: string; to: string };
    expect(to).toBe(`${fx.tag}@example.test`);
    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;');
    expect(html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
  });
});
