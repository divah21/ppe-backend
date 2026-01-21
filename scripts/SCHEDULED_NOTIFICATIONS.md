# Scheduled Notifications

This module provides automated email notifications for the PPE Management System.

## Features

### 1. Low Stock & Critical Stock Alerts
- Scans all PPE items and checks current stock against minimum levels
- **Critical Stock**: Items at ≤30% of minimum stock level
- **Low Stock**: Items below minimum but above critical threshold
- Sends consolidated email to **Admin** and **Stores** personnel

### 2. PPE Renewal Reminders
- Scans active allocations and calculates renewal dates based on:
  - `issueDate` + `PPEItem.replacementFrequency` (months)
- Sends reminders for renewals due within **10 days**
- Recipients:
  - **Employees**: Individual reminders for their PPE items
  - **Section Reps**: Summary of renewals in their section
  - **HODs**: Summary of renewals in their department
  - **Admin**: Full summary across all departments
  - **Stores**: Full summary for procurement planning

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Enable cron jobs (set to 'true' to enable)
ENABLE_CRON=true

# Timezone for cron schedule (default: Africa/Harare)
TIMEZONE=Africa/Harare

# Email configuration
EMAIL_FROM="Chengeto PPE System" <noreply@yourcompany.com>
FRONTEND_URL=http://localhost:3000
```

## Running the Notifications

### Option 1: Automatic via Cron (Recommended for Production)

When the server starts with `ENABLE_CRON=true`, notifications will automatically run:
- **Daily at 7:00 AM** (local timezone)

### Option 2: Manual Execution

Run the script manually for testing:

```bash
cd ppe-backend
node scripts/scheduled_notifications.js
```

### Option 3: External Cron (Alternative)

If you prefer using system cron instead of node-cron:

```bash
# Add to crontab (run every day at 7:00 AM)
0 7 * * * cd /path/to/ppe-backend && /usr/bin/node scripts/scheduled_notifications.js >> /var/log/ppe-notifications.log 2>&1
```

## Email Templates

### Stock Alert Email
- Subject: `🚨 Daily Stock Alert: X Critical, Y Low Stock Items`
- Contains:
  - Critical items highlighted in red
  - Low stock items in amber
  - Table with item details (name, code, current stock, min level)
  - Action button to view inventory

### Employee Renewal Reminder
- Subject: `🔔 PPE Renewal Reminder - X Item(s) Due Soon`
- Contains:
  - Personalized greeting
  - Table of PPE items due for renewal
  - Days left indicator

### Management Renewal Summary
- Subject: `📋 Daily PPE Renewal Summary - X Renewal(s) Due (Y Urgent)`
- Contains:
  - Summary stats (total renewals, urgent count)
  - Breakdown by department
  - Employee details with PPE items and due dates
  - Action button to view allocations

## Files

| File | Description |
|------|-------------|
| `scripts/scheduled_notifications.js` | Main notification logic |
| `scripts/cron_scheduler.js` | Cron job scheduler |
| `app.js` | Server entry point (initializes cron) |

## Testing

To test without waiting for the scheduled time:

```javascript
// In Node.js REPL or a test script
const { runScheduledNotifications } = require('./scripts/scheduled_notifications');
runScheduledNotifications();
```

Or test individual functions:

```javascript
const { sendLowStockAlerts, sendRenewalReminders } = require('./scripts/scheduled_notifications');

// Test stock alerts only
await sendLowStockAlerts();

// Test renewal reminders only
await sendRenewalReminders();
```

## Customization

### Change Warning Period

Edit `RENEWAL_WARNING_DAYS` in `scheduled_notifications.js`:

```javascript
const RENEWAL_WARNING_DAYS = 10; // Change to desired number of days
```

### Change Critical Threshold

Edit `CRITICAL_STOCK_THRESHOLD` in `scheduled_notifications.js`:

```javascript
const CRITICAL_STOCK_THRESHOLD = 0.3; // 30% of min level = critical
```

### Change Schedule Time

Edit the cron expression in `cron_scheduler.js`:

```javascript
// Current: 7:00 AM daily
cron.schedule('0 7 * * *', async () => {
  // ...
});

// Examples:
// '0 8 * * *'      - 8:00 AM daily
// '0 7 * * 1-5'    - 7:00 AM weekdays only
// '0 7,18 * * *'   - 7:00 AM and 6:00 PM daily
```

## Troubleshooting

### Emails not sending

1. Check email configuration in `.env`
2. Verify SMTP credentials
3. Check `logs/email/` for error logs

### Cron not running

1. Verify `ENABLE_CRON=true` in `.env`
2. Check server logs for cron initialization message
3. Ensure timezone is correctly set

### Database connection errors

1. Verify database credentials
2. Check database is running
3. Test with manual script execution
