const transporter = require('./mailer_transport.js');
const emailLogger = require('./email_logger.js');

// Chengeto PPE System Branding
const BRAND_COLOR = '#2563EB'; // Blue theme
const BRAND_SECONDARY = '#1E40AF';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SYSTEM_NAME = 'Chengeto PPE System';

/**
 * Get base path based on user role
 * @param {string} role - User role
 * @returns {string} - Base path for the role
 */
const getBasePath = (role) => {
  const rolePaths = {
    admin: '/admin',
    hod: '/hod',
    'section-rep': '/section-rep',
    'department-rep': '/department-rep',
    sheq: '/sheq',
    stores: '/stores',
  };
  return rolePaths[role?.toLowerCase()] || '/dashboard';
};

/**
 * Generate URL for different record types based on user role
 */
const getRecordUrl = (recordType, recordId, role) => {
  const basePath = getBasePath(role);
  
  const urlPatterns = {
    request: `${basePath}/requests/${recordId}`,
    employee: `/admin/employees/${recordId}`,
    budget: `/admin/budgets`,
    stock: `/stores/inventory`,
    allocation: `${basePath}/allocations/${recordId}`,
    dashboard: basePath,
  };
  
  return `${FRONTEND_URL}${urlPatterns[recordType] || basePath}`;
};

/**
 * Base email template with Chengeto PPE branding
 */
const getEmailTemplate = (title, content, actionButton = null, footer = null) => {
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
          ${footer || `
            <p style="margin: 0; font-size: 13px;">
              This is an automated message from ${SYSTEM_NAME}.<br>
              Please do not reply directly to this email.
            </p>
          `}
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
 * Create info box HTML
 */
const createInfoBox = (title, items, bgColor = '#EFF6FF', borderColor = '#3B82F6', titleColor = '#1E40AF') => {
  const itemsHtml = items.map(item => `<p style="margin: 8px 0;"><strong>${item.label}:</strong> ${item.value}</p>`).join('');
  return `
    <div style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${titleColor}; font-size: 16px;">${title}</h3>
      ${itemsHtml}
    </div>
  `;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Send email with error handling and logging
 */
const sendEmail = async (mailOptions, emailType) => {
  try {
    const result = await transporter.sendMail(mailOptions);
    emailLogger.logEmailSent(mailOptions.to, mailOptions.subject, emailType);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    emailLogger.logEmailError(mailOptions.to, mailOptions.subject, emailType, error);
    console.error(`Failed to send ${emailType} email:`, error.message);
    return { success: false, error: error.message };
  }
};

// ==================== EMPLOYEE ONBOARDING EMAILS ====================

/**
 * Send email when employee is added to the system (no credentials)
 */
const sendEmployeeOnboardedEmail = async (employee) => {
  const dashboardUrl = `${FRONTEND_URL}/login`;

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">Welcome to the ${SYSTEM_NAME}! You have been successfully onboarded into our Personal Protective Equipment management system.</p>
    
    ${createInfoBox('Your Information', [
      { label: 'Works Number', value: employee.worksNumber },
      { label: 'Department', value: employee.department || 'To be assigned' },
      { label: 'Section', value: employee.section || 'To be assigned' },
      { label: 'Job Title', value: employee.jobTitle || 'To be assigned' },
    ], '#ECFDF5', '#10B981', '#065F46')}
    
    <p style="color: #374151; line-height: 1.6;">As part of your employment, you will be allocated Personal Protective Equipment (PPE) based on your job role and safety requirements.</p>
    <p style="color: #374151; line-height: 1.6;">If you require system access, please contact your Section Representative or Administrator.</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: employee.email,
    subject: `Welcome to ${SYSTEM_NAME} - Employee Onboarding`,
    html: getEmailTemplate('Welcome to Chengeto PPE System', content),
  };

  return await sendEmail(mailOptions, 'EMPLOYEE_ONBOARDED');
};

/**
 * Send email when employee is promoted to system user with credentials
 */
const sendUserCredentialsEmail = async (user, temporaryPassword, roles) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  const rolesList = Array.isArray(roles) ? roles.join(', ') : roles;

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">You have been granted system access to the ${SYSTEM_NAME}. Below are your login credentials:</p>
    
    ${createInfoBox('Your Login Credentials', [
      { label: 'Username', value: `<code style="background: #E0F2FE; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${user.username}</code>` },
      { label: 'Temporary Password', value: `<code style="background: #FEF3C7; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code>` },
      { label: 'Assigned Role(s)', value: `<span style="color: ${BRAND_COLOR}; font-weight: 600;">${rolesList}</span>` },
    ], '#FEF3C7', '#F59E0B', '#92400E')}
    
    <div style="background-color: #FEE2E2; border: 1px solid #EF4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #991B1B; font-weight: 600;">⚠️ Important Security Notice</p>
      <p style="margin: 10px 0 0 0; color: #991B1B;">For security reasons, you will be required to change your password upon first login. Please choose a strong password.</p>
    </div>
    
    <p style="color: #374151; line-height: 1.6;">Click the button below to access the system:</p>
  `;

  const actionButton = createActionButton(loginUrl, 'Login to PPE System', '#10B981');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: user.email,
    subject: `${SYSTEM_NAME} - Your Login Credentials`,
    html: getEmailTemplate('System Access Granted', content, actionButton),
  };

  return await sendEmail(mailOptions, 'USER_CREDENTIALS');
};

/**
 * Send password reset request notification to Admin
 */
const sendPasswordResetRequestToAdmin = async (user, adminEmails) => {
  const adminUrl = `${FRONTEND_URL}/admin/users`;

  const content = `
    <p style="color: #374151; line-height: 1.6;">A password reset request has been received for a user account.</p>
    
    ${createInfoBox('Password Reset Request', [
      { label: 'User', value: `${user.firstName} ${user.lastName}` },
      { label: 'Email', value: user.email },
      { label: 'Works Number', value: user.worksNumber || 'N/A' },
      { label: 'Requested At', value: formatDate(new Date()) },
    ], '#FEF3C7', '#F59E0B', '#92400E')}
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please review this request and reset the user's password if appropriate.</p>
  `;

  const actionButton = createActionButton(adminUrl, 'Manage Users', '#F59E0B');

  const recipients = Array.isArray(adminEmails) ? adminEmails.join(', ') : adminEmails;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipients,
    subject: `Password Reset Request - ${user.firstName} ${user.lastName}`,
    html: getEmailTemplate('Password Reset Request', content, actionButton),
  };

  return await sendEmail(mailOptions, 'PASSWORD_RESET_REQUEST');
};

/**
 * Send new password to user (after Admin reset)
 */
const sendPasswordResetEmail = async (user, newPassword) => {
  const loginUrl = `${FRONTEND_URL}/login`;

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">Your password has been reset by an administrator. Below is your new temporary password:</p>
    
    ${createInfoBox('New Login Credentials', [
      { label: 'Username', value: `<code style="background: #E0F2FE; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${user.username}</code>` },
      { label: 'New Password', value: `<code style="background: #FEF3C7; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${newPassword}</code>` },
    ], '#ECFDF5', '#10B981', '#065F46')}
    
    <div style="background-color: #FEE2E2; border: 1px solid #EF4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #991B1B; font-weight: 600;">⚠️ Security Reminder</p>
      <p style="margin: 10px 0 0 0; color: #991B1B;">You will be required to change this password when you next log in.</p>
    </div>
  `;

  const actionButton = createActionButton(loginUrl, 'Login Now', '#10B981');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: user.email,
    subject: `${SYSTEM_NAME} - Password Reset Complete`,
    html: getEmailTemplate('Password Reset Complete', content, actionButton),
  };

  return await sendEmail(mailOptions, 'PASSWORD_RESET_COMPLETE');
};

// ==================== PPE REQUEST WORKFLOW EMAILS ====================

/**
 * Send notification to HOD when PPE request is submitted
 */
const sendRequestSubmittedToHOD = async (request, employee, hod) => {
  const requestUrl = getRecordUrl('request', request.id, 'hod');

  const itemsList = request.items?.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.ppeName || item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.size || 'N/A'}</td>
    </tr>`
  ).join('') || '<tr><td colspan="3" style="padding: 10px;">No items specified</td></tr>';

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${hod.firstName} ${hod.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">A new PPE request has been submitted and requires your approval.</p>
    
    ${createInfoBox('Request Details', [
      { label: 'Reference', value: `#${request.requestNumber || request.id}` },
      { label: 'Employee', value: `${employee.firstName} ${employee.lastName}` },
      { label: 'Works Number', value: employee.worksNumber },
      { label: 'Department', value: employee.department || 'N/A' },
      { label: 'Section', value: employee.section || 'N/A' },
      { label: 'Submitted', value: formatDate(request.createdAt) },
    ])}
    
    <h3 style="color: ${BRAND_COLOR}; margin-top: 25px;">Requested Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: ${BRAND_COLOR}; color: white;">
          <th style="padding: 12px; text-align: left;">PPE Item</th>
          <th style="padding: 12px; text-align: center;">Quantity</th>
          <th style="padding: 12px; text-align: left;">Size</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    ${request.reason ? `<p style="color: #374151;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please review and approve or reject this request.</p>
  `;

  const actionButton = createActionButton(requestUrl, 'Review Request');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: hod.email,
    subject: `PPE Request Pending Approval - ${employee.firstName} ${employee.lastName}`,
    html: getEmailTemplate('PPE Request Awaiting Approval', content, actionButton),
  };

  return await sendEmail(mailOptions, 'REQUEST_SUBMITTED_TO_HOD');
};

/**
 * Send notification to Stores when HOD approves request
 */
const sendRequestApprovedToStores = async (request, employee, approvedBy, storesEmails) => {
  const requestUrl = getRecordUrl('request', request.id, 'stores');

  const itemsList = request.items?.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.ppeName || item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.size || 'N/A'}</td>
    </tr>`
  ).join('') || '<tr><td colspan="3" style="padding: 10px;">No items specified</td></tr>';

  const content = `
    <p style="color: #374151; line-height: 1.6;">A PPE request has been approved by the HOD and is ready for processing.</p>
    
    ${createInfoBox('Approved Request', [
      { label: 'Reference', value: `#${request.requestNumber || request.id}` },
      { label: 'Employee', value: `${employee.firstName} ${employee.lastName}` },
      { label: 'Works Number', value: employee.worksNumber },
      { label: 'Department', value: employee.department || 'N/A' },
      { label: 'Section', value: employee.section || 'N/A' },
      { label: 'Approved By', value: `${approvedBy.firstName} ${approvedBy.lastName}` },
      { label: 'Approved At', value: formatDate(new Date()) },
    ], '#ECFDF5', '#10B981', '#065F46')}
    
    <h3 style="color: ${BRAND_COLOR}; margin-top: 25px;">Items to Issue</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #10B981; color: white;">
          <th style="padding: 12px; text-align: left;">PPE Item</th>
          <th style="padding: 12px; text-align: center;">Quantity</th>
          <th style="padding: 12px; text-align: left;">Size</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please process this request and issue the PPE items.</p>
  `;

  const actionButton = createActionButton(requestUrl, 'Process Request', '#10B981');

  const recipients = Array.isArray(storesEmails) ? storesEmails.join(', ') : storesEmails;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipients,
    subject: `PPE Request Approved - Ready for Processing #${request.requestNumber || request.id}`,
    html: getEmailTemplate('Request Approved - Action Required', content, actionButton),
  };

  return await sendEmail(mailOptions, 'REQUEST_APPROVED_TO_STORES');
};

/**
 * Send notification to employee when PPE is ready for collection
 */
const sendPPEReadyForCollection = async (request, employee, allocations) => {
  const itemsList = allocations?.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.ppeName || item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.size || 'Standard'}</td>
    </tr>`
  ).join('') || '<tr><td colspan="3" style="padding: 10px;">See stores for details</td></tr>';

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">Great news! Your PPE request has been processed and your items are ready for collection from Stores.</p>
    
    ${createInfoBox('Collection Details', [
      { label: 'Reference', value: `#${request.requestNumber || request.id}` },
      { label: 'Collection Point', value: 'Main Stores' },
      { label: 'Status', value: '<span style="color: #10B981; font-weight: 600;">Ready for Collection</span>' },
    ], '#ECFDF5', '#10B981', '#065F46')}
    
    <h3 style="color: ${BRAND_COLOR}; margin-top: 25px;">Items Allocated</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #10B981; color: white;">
          <th style="padding: 12px; text-align: left;">PPE Item</th>
          <th style="padding: 12px; text-align: center;">Quantity</th>
          <th style="padding: 12px; text-align: left;">Size</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #1E40AF; font-weight: 600;">📋 Collection Instructions</p>
      <ul style="margin: 10px 0 0 0; color: #1E40AF; padding-left: 20px;">
        <li>Please bring your employee ID card</li>
        <li>Sign the PPE acknowledgement form upon collection</li>
        <li>Inspect items before leaving</li>
      </ul>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: employee.email,
    subject: `Your PPE is Ready for Collection - #${request.requestNumber || request.id}`,
    html: getEmailTemplate('PPE Ready for Collection', content),
  };

  return await sendEmail(mailOptions, 'PPE_READY_FOR_COLLECTION');
};

/**
 * Send notification when request is rejected
 */
const sendRequestRejectedEmail = async (request, employee, rejectedBy, reason) => {
  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">We regret to inform you that your PPE request has been rejected.</p>
    
    ${createInfoBox('Request Details', [
      { label: 'Reference', value: `#${request.requestNumber || request.id}` },
      { label: 'Status', value: '<span style="color: #EF4444; font-weight: 600;">Rejected</span>' },
      { label: 'Rejected By', value: `${rejectedBy.firstName} ${rejectedBy.lastName}` },
      { label: 'Date', value: formatDate(new Date()) },
    ], '#FEE2E2', '#EF4444', '#991B1B')}
    
    ${reason ? `
      <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #92400E; font-weight: 600;">Reason for Rejection:</p>
        <p style="margin: 10px 0 0 0; color: #92400E;">${reason}</p>
      </div>
    ` : ''}
    
    <p style="color: #374151; line-height: 1.6;">If you believe this was an error or have questions, please contact your Section Representative or HOD.</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: employee.email,
    subject: `PPE Request Rejected - #${request.requestNumber || request.id}`,
    html: getEmailTemplate('PPE Request Rejected', content),
  };

  return await sendEmail(mailOptions, 'REQUEST_REJECTED');
};

// ==================== STOCK & SYSTEM ALERTS ====================

/**
 * Send low stock alert to Admin and Stores
 */
const sendLowStockAlert = async (items, recipients) => {
  const stockUrl = `${FRONTEND_URL}/stores/inventory`;

  const itemsList = items.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${item.itemCode}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #EF4444; font-weight: 600;">${item.currentStock}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.minStockLevel}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="color: #374151; line-height: 1.6;">The following PPE items have fallen below their minimum stock levels and require immediate attention:</p>
    
    <div style="background-color: #FEE2E2; border: 1px solid #EF4444; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #991B1B; font-weight: 600;">⚠️ Low Stock Alert</p>
      <p style="margin: 5px 0 0 0; color: #991B1B;">${items.length} item(s) require restocking</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #EF4444; color: white;">
          <th style="padding: 12px; text-align: left;">Item Name</th>
          <th style="padding: 12px; text-align: left;">Item Code</th>
          <th style="padding: 12px; text-align: center;">Current Stock</th>
          <th style="padding: 12px; text-align: center;">Min Level</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList}
      </tbody>
    </table>
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please initiate procurement for these items to avoid stockouts.</p>
  `;

  const actionButton = createActionButton(stockUrl, 'View Inventory', '#EF4444');

  const recipientList = Array.isArray(recipients) ? recipients.join(', ') : recipients;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipientList,
    subject: `🚨 Low Stock Alert - ${items.length} Item(s) Below Minimum Level`,
    html: getEmailTemplate('Low Stock Alert', content, actionButton),
  };

  return await sendEmail(mailOptions, 'LOW_STOCK_ALERT');
};

/**
 * Send pending requests reminder
 */
const sendPendingRequestsReminder = async (requests, recipient) => {
  const requestsUrl = getRecordUrl('dashboard', null, recipient.role);

  const requestsList = requests.slice(0, 10).map(req => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">#${req.requestNumber || req.id}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${req.employeeName || 'N/A'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB;">${formatDate(req.createdAt)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #F59E0B; font-weight: 600;">${req.status}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${recipient.firstName} ${recipient.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">You have <strong>${requests.length}</strong> pending PPE request(s) awaiting your action.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #F59E0B; color: white;">
          <th style="padding: 12px; text-align: left;">Reference</th>
          <th style="padding: 12px; text-align: left;">Employee</th>
          <th style="padding: 12px; text-align: left;">Submitted</th>
          <th style="padding: 12px; text-align: left;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${requestsList}
      </tbody>
    </table>
    
    ${requests.length > 10 ? `<p style="color: #6B7280; font-size: 14px;">... and ${requests.length - 10} more requests</p>` : ''}
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please review and process these requests at your earliest convenience.</p>
  `;

  const actionButton = createActionButton(requestsUrl, 'View Pending Requests', '#F59E0B');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipient.email,
    subject: `${requests.length} Pending PPE Request(s) Require Your Attention`,
    html: getEmailTemplate('Pending Requests Reminder', content, actionButton),
  };

  return await sendEmail(mailOptions, 'PENDING_REQUESTS_REMINDER');
};

// ==================== BUDGET NOTIFICATIONS ====================

/**
 * Send budget allocation notification to HOD
 */
const sendBudgetAllocatedEmail = async (budget, department, hod) => {
  const budgetUrl = `${FRONTEND_URL}/hod/budgets`;

  const content = `
    <p style="color: #374151; line-height: 1.6;">Hello <strong>${hod.firstName} ${hod.lastName}</strong>,</p>
    <p style="color: #374151; line-height: 1.6;">A PPE budget has been allocated for your department. Please review the details below:</p>
    
    ${createInfoBox('Budget Allocation Details', [
      { label: 'Department', value: department.name },
      { label: 'Fiscal Year', value: budget.fiscalYear || new Date().getFullYear() },
      { label: 'Allocated Amount', value: `<span style="color: #10B981; font-weight: 700; font-size: 18px;">$${parseFloat(budget.allocatedAmount || budget.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` },
      { label: 'Effective Date', value: formatDate(budget.startDate || budget.createdAt) },
    ], '#ECFDF5', '#10B981', '#065F46')}
    
    <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #1E40AF; font-weight: 600;">📊 Budget Guidelines</p>
      <ul style="margin: 10px 0 0 0; color: #1E40AF; padding-left: 20px;">
        <li>Monitor PPE requests against this budget allocation</li>
        <li>Ensure critical safety items are prioritized</li>
        <li>Report any budget concerns to Admin promptly</li>
      </ul>
    </div>
  `;

  const actionButton = createActionButton(budgetUrl, 'View Budget Details');

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: hod.email,
    subject: `PPE Budget Allocated - ${department.name} - FY${budget.fiscalYear || new Date().getFullYear()}`,
    html: getEmailTemplate('Budget Allocation Notification', content, actionButton),
  };

  return await sendEmail(mailOptions, 'BUDGET_ALLOCATED');
};

/**
 * Send budget threshold warning
 */
const sendBudgetThresholdWarning = async (budget, department, recipients, percentUsed) => {
  const budgetUrl = `${FRONTEND_URL}/admin/budgets`;

  const warningColor = percentUsed >= 90 ? '#EF4444' : '#F59E0B';
  const warningBg = percentUsed >= 90 ? '#FEE2E2' : '#FEF3C7';

  const content = `
    <p style="color: #374151; line-height: 1.6;">The PPE budget for <strong>${department.name}</strong> has reached a critical threshold.</p>
    
    <div style="background-color: ${warningBg}; border: 1px solid ${warningColor}; border-left: 4px solid ${warningColor}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${warningColor}; font-weight: 700; font-size: 24px;">${percentUsed.toFixed(1)}% Used</p>
      <p style="margin: 10px 0 0 0; color: #374151;">
        <strong>Allocated:</strong> $${parseFloat(budget.allocatedAmount).toLocaleString()}<br>
        <strong>Spent:</strong> $${parseFloat(budget.spentAmount || 0).toLocaleString()}<br>
        <strong>Remaining:</strong> $${parseFloat(budget.allocatedAmount - (budget.spentAmount || 0)).toLocaleString()}
      </p>
    </div>
    
    <p style="color: #374151; line-height: 1.6;"><strong>Action Required:</strong> Please review spending and consider budget adjustments if necessary.</p>
  `;

  const actionButton = createActionButton(budgetUrl, 'Manage Budgets', warningColor);

  const recipientList = Array.isArray(recipients) ? recipients.join(', ') : recipients;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to: recipientList,
    subject: `⚠️ Budget Alert: ${department.name} at ${percentUsed.toFixed(0)}% - FY${budget.fiscalYear || new Date().getFullYear()}`,
    html: getEmailTemplate('Budget Threshold Warning', content, actionButton),
  };

  return await sendEmail(mailOptions, 'BUDGET_THRESHOLD_WARNING');
};

// ==================== GENERIC EMAIL FUNCTION ====================

/**
 * Send generic email
 */
const sendGenericEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to,
    subject,
    html: htmlContent,
  };

  return await sendEmail(mailOptions, 'GENERIC');
};

/**
 * Send email using template
 */
const sendTemplatedEmail = async (to, subject, title, content, actionUrl = null, actionText = null) => {
  const actionButton = actionUrl ? createActionButton(actionUrl, actionText || 'View Details') : null;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${SYSTEM_NAME}" <noreply@chengeto.com>`,
    to,
    subject,
    html: getEmailTemplate(title, content, actionButton),
  };

  return await sendEmail(mailOptions, 'TEMPLATED');
};

module.exports = {
  // Employee Onboarding
  sendEmployeeOnboardedEmail,
  sendUserCredentialsEmail,
  sendPasswordResetRequestToAdmin,
  sendPasswordResetEmail,
  
  // PPE Request Workflow
  sendRequestSubmittedToHOD,
  sendRequestApprovedToStores,
  sendPPEReadyForCollection,
  sendRequestRejectedEmail,
  
  // Stock & System Alerts
  sendLowStockAlert,
  sendPendingRequestsReminder,
  
  // Budget Notifications
  sendBudgetAllocatedEmail,
  sendBudgetThresholdWarning,
  
  // Generic
  sendGenericEmail,
  sendTemplatedEmail,
  
  // Utilities
  getEmailTemplate,
  createActionButton,
  createInfoBox,
  formatDate,
};
