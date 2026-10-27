// Older rows were written before the audit middleware redacted credentials; never show them
const SENSITIVE_KEY = /pass(word)?|token|secret|api[-_]?key|otp|authorization|cookie/i;

export const REDACTED = '[REDACTED]';

export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? REDACTED : redact(v)])
  );
};
