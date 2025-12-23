const winston = require('winston');
require('winston-daily-rotate-file');

// Email-specific log transport
const emailTransport = new winston.transports.DailyRotateFile({
  filename: './logs/email/email-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
});

// Error log transport for failed emails
const errorTransport = new winston.transports.DailyRotateFile({
  filename: './logs/email/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
});

const { combine, timestamp, printf, json } = winston.format;

const emailFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` | ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const emailLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    emailFormat
  ),
  transports: [emailTransport, errorTransport],
  defaultMeta: { service: 'ppe-email-service' },
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  emailLogger.add(
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        emailFormat
      ),
    })
  );
}

/**
 * Log email sent successfully
 */
emailLogger.logEmailSent = (to, subject, type) => {
  emailLogger.info(`Email sent successfully`, {
    to,
    subject,
    type,
    sentAt: new Date().toISOString(),
  });
};

/**
 * Log email failure
 */
emailLogger.logEmailError = (to, subject, type, error) => {
  emailLogger.error(`Failed to send email`, {
    to,
    subject,
    type,
    error: error.message,
    stack: error.stack,
    failedAt: new Date().toISOString(),
  });
};

module.exports = emailLogger;
