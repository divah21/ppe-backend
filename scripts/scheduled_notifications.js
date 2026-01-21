/**
 * Scheduled Notifications Script
 * 
 * This script handles:
 * 1. Low Stock and Critical Stock Alerts - sent to Stores and Admin
 * 2. Upcoming PPE Renewal Reminders - sent to Employee, Section Rep, HOD, Admin, and Stores
 * 
 * Run this script via cron job:
 * - Daily at 7:00 AM: node scripts/scheduled_notifications.js
 * 
 * Cron expression: 0 7 * * *
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Op, literal } = require('sequelize');
const { sequelize } = require('../database/db');

// Import models
const {
  User,
  Role,
  Employee,
  Section,
  Department,
  PPEItem,
  Stock,
  Allocation
} = require('../models');

// Import email helper
const {
  sendLowStockAlert,
  sendTemplatedEmail
} = require('../helpers/email_helper');

const transporter = require('../helpers/mailer_transport');
const emailLogger = require('../helpers/email_logger');

// Configuration
const RENEWAL_WARNING_DAYS = 10; // Send reminders for renewals due in 10 days or less
const CRITICAL_STOCK_THRESHOLD = 0.3; // 30% of min level = critical
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SYSTEM_NAME = 'Chengeto PPE System';
const BRAND_COLOR = '#2563EB';
const BRAND_SECONDARY = '#1E40AF';

/**
 * Get email template
 */
const getEmailTemplate = (title, content, actionButton = null) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #f4f4f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_SECONDARY} 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🛡️ ${SYSTEM_NAME}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Personal Protective Equipment Management</p>
        </div>
        
        <!-- Content -->
        <div style="background-color: white; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <h2 style="color: ${BRAND_COLOR}; margin-top: 0; font-size: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">${title}</h2>
          ${content}
          
          ${actionButton ? `
            <div style="text-align: center; margin: 30px 0;">
              ${actionButton}
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1f2937; padding: 25px; text-align: center; color: #9ca3af; border-radius: 0 0 12px 12px;">
          <p style="margin: 0; font-size: 13px;">
            This is an automated message from ${SYSTEM_NAME}.<br>
            Please do not reply directly to this email.
          </p>
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} ${SYSTEM_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Create action button HTML
 */
const createActionButton = (url, text, color = BRAND_COLOR) => {
  return `<a href="${url}" style="background-color: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${text}</a>`;
};

/**
 * Send email utility
 */
const sendEmail = async (mailOptions, emailType) => {
  try {
    const result = await transporter.sendMail(mailOptions);
    emailLogger.logEmailSent(mailOptions.to, mailOptions.subject, emailType);
    console.log(`✅ ${emailType} email sent to: ${mailOptions.to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    emailLogger.logEmailError(mailOptions.to, mailOptions.subject, emailType, error);
    console.error(`❌ Failed to send ${emailType} email to ${mailOptions.to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get users by role name
 */
const getUsersByRole = async (roleName) => {
  try {
    const users = await User.findAll({
      where: { isActive: true },
      include: [
        {
          model: Role,
          as: 'role',
          where: { name: roleName }
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    return users;
  } catch (error) {
    console.error(`Error fetching ${roleName} users:`, error.message);
    return [];
  }
};

/**
 * Get Section Rep for a section
 */
const getSectionRep = async (sectionId) => {
  try {
    const sectionRep = await User.findOne({
      where: { 
        sectionId,
        isActive: true 
      },
      include: [
        {
          model: Role,
          as: 'role',
          where: { name: 'section-rep' }
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    return sectionRep;
  } catch (error) {
    console.error('Error fetching section rep:', error.message);
    return null;
  }
};

/**
 * Get HOD for a department
 */
const getHOD = async (departmentId) => {
  try {
    const hod = await User.findOne({
      where: { 
        departmentId,
        isActive: true 
      },
      include: [
        {
          model: Role,
          as: 'role',
          where: { name: 'hod' }
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    return hod;
  } catch (error) {
    console.error('Error fetching HOD:', error.message);
    return null;
  }
};

// ============================================================
// LOW STOCK ALERTS
// ============================================================

/**
 * Get low stock and critical stock items
 */
const getLowStockItems = async () => {
  try {
    // Get all PPE items with their stock levels
    const ppeItems = await PPEItem.findAll({
      include: [
        {
          model: Stock,
          as: 'stocks',
          attributes: ['id', 'quantity', 'size']
        }
      ]
    });

    const lowStockItems = [];
    const criticalStockItems = [];

    for (const item of ppeItems) {
      const totalStock = item.stocks?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
      const minLevel = item.minStockLevel || 10;

      if (totalStock < minLevel) {
        const stockItem = {
          id: item.id,
          name: item.name,
          itemCode: item.itemCode,
          category: item.category,
          currentStock: totalStock,
          minStockLevel: minLevel,
          deficit: minLevel - totalStock
        };

        if (totalStock <= minLevel * CRITICAL_STOCK_THRESHOLD) {
          criticalStockItems.push({ ...stockItem, status: 'critical' });
        } else {
          lowStockItems.push({ ...stockItem, status: 'low' });
        }
      }
    }

    return { lowStockItems, criticalStockItems };
  } catch (error) {
    console.error('Error fetching low stock items:', error.message);
    return { lowStockItems: [], criticalStockItems: [] };
  }
};

/**
 * Send low stock alert emails
 */
const sendLowStockAlerts = async () => {
  console.log('\n📦 Checking for low stock items...');
  
  const { lowStockItems, criticalStockItems } = await getLowStockItems();
  
  if (lowStockItems.length === 0 && criticalStockItems.length === 0) {
    console.log('✅ All stock levels are healthy');
    return;
  }

  // Get admin and stores users
  const adminUsers = await getUsersByRole('admin');
  const storesUsers = await getUsersByRole('stores');

  const recipients = [];
  
  for (const user of [...adminUsers, ...storesUsers]) {
    const email = user.employee?.email || user.email;
    if (email && !recipients.includes(email)) {
      recipients.push(email);
    }
  }

  if (recipients.length === 0) {
    console.log('⚠️ No recipients found for stock alerts');
    return;
  }

  // Build email content
  const allItems = [...criticalStockItems, ...lowStockItems];
  
  const criticalSection = criticalStockItems.length > 0 ? `
    <div style="background-color: #FEE2E2; border: 1px solid #DC2626; border-left: 4px solid #DC2626; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #991B1B; font-weight: 600;">🚨 CRITICAL - ${criticalStockItems.length} item(s) at critical levels</p>
      <p style="margin: 5px 0 0 0; color: #991B1B; font-size: 13px;">These items are at 30% or below minimum stock level and need immediate attention!</p>
    </div>
  ` : '';

  const lowSection = lowStockItems.length > 0 ? `
    <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #92400E; font-weight: 600;">⚠️ LOW STOCK - ${lowStockItems.length} item(s) below minimum</p>
      <p style="margin: 5px 0 0 0; color: #92400E; font-size: 13px;">These items require restocking soon.</p>
    </div>
  ` : '';

  const itemsTable = `
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #374151; color: white;">
          <th style="padding: 12px; text-align: left;">Item Name</th>
          <th style="padding: 12px; text-align: left;">Code</th>
          <th style="padding: 12px; text-align: center;">Current</th>
          <th style="padding: 12px; text-align: center;">Min Level</th>
          <th style="padding: 12px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${allItems.map(item => `
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 10px;">${item.name}</td>
            <td style="padding: 10px; color: #6B7280; font-family: monospace;">${item.itemCode || '-'}</td>
            <td style="padding: 10px; text-align: center; font-weight: 600; color: ${item.status === 'critical' ? '#DC2626' : '#F59E0B'};">${item.currentStock}</td>
            <td style="padding: 10px; text-align: center;">${item.minStockLevel}</td>
            <td style="padding: 10px; text-align: center;">
              <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; ${item.status === 'critical' ? 'background-color: #FEE2E2; color: #DC2626;' : 'background-color: #FEF3C7; color: #92400E;'}">
                ${item.status === 'critical' ? 'CRITICAL' : 'LOW'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const content = `
    <p style="color: #374151; line-height: 1.6;">
      This is your daily stock level report. The following PPE items require attention:
    </p>
    ${criticalSection}
    ${lowSection}
    ${itemsTable}
    <p style="color: #374151; line-height: 1.6;">
      <strong>Action Required:</strong> Please review and initiate procurement for items that are running low.
    </p>
  `;

  const actionButton = createActionButton(`${FRONTEND_URL}/stores/stock`, 'View Stock Inventory', '#DC2626');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipients.join(', '),
    subject: `🚨 Daily Stock Alert: ${criticalStockItems.length} Critical, ${lowStockItems.length} Low Stock Items`,
    html: getEmailTemplate('Stock Level Alert', content, actionButton)
  };

  await sendEmail(mailOptions, 'DAILY_STOCK_ALERT');
  console.log(`📧 Stock alert sent to ${recipients.length} recipient(s)`);
};

// ============================================================
// UPCOMING RENEWAL REMINDERS
// ============================================================

/**
 * Get allocations with upcoming renewals
 */
const getUpcomingRenewals = async () => {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + RENEWAL_WARNING_DAYS);

    // Get all active allocations with PPE item info
    const allocations = await Allocation.findAll({
      where: {
        status: 'active'
      },
      include: [
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency']
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'worksNumber', 'sectionId'],
          include: [
            {
              model: Section,
              as: 'section',
              attributes: ['id', 'name', 'departmentId'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ]
    });

    const upcomingRenewals = [];

    for (const alloc of allocations) {
      if (!alloc.issueDate || !alloc.ppeItem?.replacementFrequency) continue;

      // Calculate renewal date: issueDate + replacementFrequency months
      const issueDate = new Date(alloc.issueDate);
      const renewalDate = new Date(issueDate);
      renewalDate.setMonth(renewalDate.getMonth() + parseInt(alloc.ppeItem.replacementFrequency));

      // Check if renewal is due within the warning period
      if (renewalDate >= now && renewalDate <= futureDate) {
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        upcomingRenewals.push({
          allocationId: alloc.id,
          employee: alloc.employee,
          ppeItem: alloc.ppeItem,
          issueDate: alloc.issueDate,
          renewalDate,
          daysUntilRenewal,
          size: alloc.size,
          quantity: alloc.quantity
        });
      }
    }

    // Sort by days until renewal (most urgent first)
    upcomingRenewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

    return upcomingRenewals;
  } catch (error) {
    console.error('Error fetching upcoming renewals:', error.message);
    return [];
  }
};

/**
 * Send renewal reminder to an employee
 */
const sendEmployeeRenewalReminder = async (employee, renewals) => {
  if (!employee?.email) return;

  const itemsList = renewals.map(r => `
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 10px;">${r.ppeItem.name}</td>
      <td style="padding: 10px; text-align: center;">${r.size || 'N/A'}</td>
      <td style="padding: 10px; text-align: center;">${new Date(r.renewalDate).toLocaleDateString('en-GB')}</td>
      <td style="padding: 10px; text-align: center;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; ${r.daysUntilRenewal <= 3 ? 'background-color: #FEE2E2; color: #DC2626;' : 'background-color: #FEF3C7; color: #92400E;'}">
          ${r.daysUntilRenewal} day${r.daysUntilRenewal !== 1 ? 's' : ''}
        </span>
      </td>
    </tr>
  `).join('');

  const content = `
    <p style="color: #374151; line-height: 1.6;">
      Dear <strong>${employee.firstName} ${employee.lastName}</strong>,
    </p>
    <p style="color: #374151; line-height: 1.6;">
      This is a reminder that the following PPE items are due for renewal soon:
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: ${BRAND_COLOR}; color: white;">
          <th style="padding: 12px; text-align: left;">PPE Item</th>
          <th style="padding: 12px; text-align: center;">Size</th>
          <th style="padding: 12px; text-align: center;">Renewal Date</th>
          <th style="padding: 12px; text-align: center;">Days Left</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    <p style="color: #374151; line-height: 1.6;">
      Please contact your Section Representative or the Stores department to arrange for your PPE renewal.
    </p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: employee.email,
    subject: `🔔 PPE Renewal Reminder - ${renewals.length} Item(s) Due Soon`,
    html: getEmailTemplate('PPE Renewal Reminder', content)
  };

  await sendEmail(mailOptions, 'EMPLOYEE_RENEWAL_REMINDER');
};

/**
 * Send renewal summary to management (Section Rep, HOD, Admin, Stores)
 */
const sendManagementRenewalSummary = async (renewalsByDepartment, recipientType, recipients) => {
  if (recipients.length === 0) return;

  let summaryContent = '';
  let totalRenewals = 0;

  for (const [deptName, data] of Object.entries(renewalsByDepartment)) {
    totalRenewals += data.renewals.length;
    
    const itemsList = data.renewals.slice(0, 10).map(r => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 8px;">${r.employee.firstName} ${r.employee.lastName}</td>
        <td style="padding: 8px; color: #6B7280; font-size: 12px;">${r.employee.worksNumber || '-'}</td>
        <td style="padding: 8px;">${r.ppeItem.name}</td>
        <td style="padding: 8px; text-align: center;">${new Date(r.renewalDate).toLocaleDateString('en-GB')}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; ${r.daysUntilRenewal <= 3 ? 'background-color: #FEE2E2; color: #DC2626;' : 'background-color: #FEF3C7; color: #92400E;'}">
            ${r.daysUntilRenewal}d
          </span>
        </td>
      </tr>
    `).join('');

    summaryContent += `
      <div style="margin: 20px 0; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #F3F4F6; padding: 12px 15px; border-bottom: 1px solid #E5E7EB;">
          <strong style="color: #374151;">${deptName}</strong>
          <span style="float: right; color: #6B7280; font-size: 13px;">${data.renewals.length} renewal(s)</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #F9FAFB;">
              <th style="padding: 8px; text-align: left; color: #6B7280; font-weight: 600;">Employee</th>
              <th style="padding: 8px; text-align: left; color: #6B7280; font-weight: 600;">Works #</th>
              <th style="padding: 8px; text-align: left; color: #6B7280; font-weight: 600;">PPE Item</th>
              <th style="padding: 8px; text-align: center; color: #6B7280; font-weight: 600;">Due Date</th>
              <th style="padding: 8px; text-align: center; color: #6B7280; font-weight: 600;">Days</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
        ${data.renewals.length > 10 ? `
          <div style="padding: 10px; text-align: center; color: #6B7280; font-size: 12px; background-color: #F9FAFB;">
            ... and ${data.renewals.length - 10} more renewal(s)
          </div>
        ` : ''}
      </div>
    `;
  }

  const urgentCount = Object.values(renewalsByDepartment)
    .flatMap(d => d.renewals)
    .filter(r => r.daysUntilRenewal <= 3).length;

  const content = `
    <p style="color: #374151; line-height: 1.6;">
      This is your daily PPE renewal summary. The following employees have PPE items due for renewal within the next ${RENEWAL_WARNING_DAYS} days:
    </p>
    
    <div style="display: flex; gap: 15px; margin: 20px 0;">
      <div style="flex: 1; background-color: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: #1E40AF;">${totalRenewals}</div>
        <div style="font-size: 13px; color: #3B82F6;">Total Renewals</div>
      </div>
      <div style="flex: 1; background-color: #FEE2E2; border: 1px solid #DC2626; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: #DC2626;">${urgentCount}</div>
        <div style="font-size: 13px; color: #DC2626;">Urgent (≤3 days)</div>
      </div>
    </div>
    
    ${summaryContent}
    
    <p style="color: #374151; line-height: 1.6;">
      <strong>Action Required:</strong> Please ensure these employees are contacted and their PPE renewals are processed promptly.
    </p>
  `;

  const actionButton = createActionButton(`${FRONTEND_URL}/stores/allocations`, 'View Allocations', BRAND_COLOR);

  const emailList = recipients.map(r => r.employee?.email || r.email).filter(Boolean);
  
  if (emailList.length === 0) return;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: emailList.join(', '),
    subject: `📋 Daily PPE Renewal Summary - ${totalRenewals} Renewal(s) Due (${urgentCount} Urgent)`,
    html: getEmailTemplate('PPE Renewal Summary', content, actionButton)
  };

  await sendEmail(mailOptions, `${recipientType.toUpperCase()}_RENEWAL_SUMMARY`);
  console.log(`📧 Renewal summary sent to ${emailList.length} ${recipientType}(s)`);
};

/**
 * Process and send renewal reminders
 */
const sendRenewalReminders = async () => {
  console.log('\n🔔 Checking for upcoming PPE renewals...');
  
  const renewals = await getUpcomingRenewals();
  
  if (renewals.length === 0) {
    console.log('✅ No upcoming renewals in the next', RENEWAL_WARNING_DAYS, 'days');
    return;
  }

  console.log(`📋 Found ${renewals.length} upcoming renewal(s)`);

  // Group renewals by employee for individual emails
  const renewalsByEmployee = {};
  for (const renewal of renewals) {
    const empId = renewal.employee?.id;
    if (!empId) continue;
    
    if (!renewalsByEmployee[empId]) {
      renewalsByEmployee[empId] = {
        employee: renewal.employee,
        renewals: []
      };
    }
    renewalsByEmployee[empId].renewals.push(renewal);
  }

  // Group renewals by department for management summaries
  const renewalsByDepartment = {};
  for (const renewal of renewals) {
    const deptName = renewal.employee?.section?.department?.name || 'Unassigned';
    const deptId = renewal.employee?.section?.departmentId;
    
    if (!renewalsByDepartment[deptName]) {
      renewalsByDepartment[deptName] = {
        departmentId: deptId,
        renewals: []
      };
    }
    renewalsByDepartment[deptName].renewals.push(renewal);
  }

  // Group renewals by section for section rep summaries
  const renewalsBySection = {};
  for (const renewal of renewals) {
    const sectionId = renewal.employee?.sectionId;
    const sectionName = renewal.employee?.section?.name || 'Unassigned';
    
    if (!sectionId) continue;
    
    if (!renewalsBySection[sectionId]) {
      renewalsBySection[sectionId] = {
        sectionName,
        departmentId: renewal.employee?.section?.departmentId,
        renewals: []
      };
    }
    renewalsBySection[sectionId].renewals.push(renewal);
  }

  // 1. Send individual employee reminders
  console.log('\n👤 Sending employee reminders...');
  for (const data of Object.values(renewalsByEmployee)) {
    await sendEmployeeRenewalReminder(data.employee, data.renewals);
  }
  console.log(`✅ Sent reminders to ${Object.keys(renewalsByEmployee).length} employee(s)`);

  // 2. Send Section Rep summaries
  console.log('\n👥 Sending section rep summaries...');
  for (const [sectionId, data] of Object.entries(renewalsBySection)) {
    const sectionRep = await getSectionRep(sectionId);
    if (sectionRep) {
      const sectionSummary = { [data.sectionName]: data };
      await sendManagementRenewalSummary(sectionSummary, 'section-rep', [sectionRep]);
    }
  }

  // 3. Send HOD summaries (grouped by department)
  console.log('\n🏢 Sending HOD summaries...');
  for (const [deptName, data] of Object.entries(renewalsByDepartment)) {
    if (data.departmentId) {
      const hod = await getHOD(data.departmentId);
      if (hod) {
        const deptSummary = { [deptName]: data };
        await sendManagementRenewalSummary(deptSummary, 'hod', [hod]);
      }
    }
  }

  // 4. Send Admin summary (all departments)
  console.log('\n👔 Sending admin summary...');
  const adminUsers = await getUsersByRole('admin');
  if (adminUsers.length > 0) {
    await sendManagementRenewalSummary(renewalsByDepartment, 'admin', adminUsers);
  }

  // 5. Send Stores summary (all departments)
  console.log('\n📦 Sending stores summary...');
  const storesUsers = await getUsersByRole('stores');
  if (storesUsers.length > 0) {
    await sendManagementRenewalSummary(renewalsByDepartment, 'stores', storesUsers);
  }
};

// ============================================================
// MAIN EXECUTION
// ============================================================

const runScheduledNotifications = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🕐 PPE System - Scheduled Notifications');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Run low stock alerts
    await sendLowStockAlerts();

    // Run renewal reminders
    await sendRenewalReminders();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Scheduled notifications completed successfully');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ Error running scheduled notifications:', error.message);
    console.error('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runScheduledNotifications()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  runScheduledNotifications,
  sendLowStockAlerts,
  sendRenewalReminders,
  getLowStockItems,
  getUpcomingRenewals
};
