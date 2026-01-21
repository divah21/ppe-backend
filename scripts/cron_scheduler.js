/**
 * Cron Job Scheduler
 * 
 * This module sets up scheduled tasks using node-cron.
 * 
 * Tasks:
 * - Daily at 7:00 AM: Low stock alerts & PPE renewal reminders
 * 
 * To enable cron jobs, set ENABLE_CRON=true in your .env file
 */

const cron = require('node-cron');
const { runScheduledNotifications } = require('./scheduled_notifications');

// Configuration
const CRON_ENABLED = process.env.ENABLE_CRON === 'true';

/**
 * Initialize cron jobs
 */
const initializeCronJobs = () => {
  if (!CRON_ENABLED) {
    console.log('⏸️  Cron jobs disabled (set ENABLE_CRON=true to enable)');
    return;
  }

  console.log('🕐 Initializing cron jobs...');

  // Daily notifications at 7:00 AM
  // Cron expression: minute hour day-of-month month day-of-week
  cron.schedule('0 7 * * *', async () => {
    console.log('\n🔔 Running scheduled notifications (daily 7:00 AM)...');
    try {
      await runScheduledNotifications();
    } catch (error) {
      console.error('❌ Error in scheduled notifications:', error.message);
    }
  }, {
    timezone: process.env.TIMEZONE || 'Africa/Harare'
  });

  console.log('✅ Cron job scheduled: Daily notifications at 7:00 AM');

  // Optional: Run a test check at noon for testing purposes
  // Uncomment to enable
  /*
  cron.schedule('0 12 * * *', async () => {
    console.log('\n🔔 Running midday stock check...');
    try {
      const { sendLowStockAlerts } = require('./scheduled_notifications');
      await sendLowStockAlerts();
    } catch (error) {
      console.error('❌ Error in midday check:', error.message);
    }
  }, {
    timezone: process.env.TIMEZONE || 'Africa/Harare'
  });
  */

  console.log('🕐 Cron jobs initialized successfully');
};

/**
 * Run notifications manually (for testing)
 */
const runNow = async () => {
  console.log('🚀 Running notifications manually...');
  await runScheduledNotifications();
};

module.exports = {
  initializeCronJobs,
  runNow
};
