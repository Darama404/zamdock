// File: app/assets/javascripts/custom/templates/email_templates_v2.js
// Email Templates - Complete Version (Simplified & Optimized)

(function() {
  'use strict';

  // ============================================
  // 1. NEW EMAIL ACCOUNT REQUEST (SIMPLIFIED)
  // ============================================
  const EmailRequestTemplate = {
    name: 'New Email Account',
    icon: '📧',
    description: 'Request new email account',
    
    fields: [
      {
        name: 'employee_name',
        label: 'Employee Name',
        type: 'text',
        required: true,
        placeholder: 'John Doe'
      },
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Department --' },
          { value: 'IT', label: 'Information Technology' },
          { value: 'HR', label: 'Human Resources' },
          { value: 'Finance', label: 'Finance' },
          { value: 'Marketing', label: 'Marketing' },
          { value: 'Sales', label: 'Sales' },
          { value: 'Operations', label: 'Operations' }
        ]
      },
      {
        name: 'email_address',
        label: 'Desired Email Address',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com',
        description: 'Follow company naming convention'
      },
      {
        name: 'email_platform',
        label: 'Email Platform',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Email Platform --' },
          { value: 'Zimbra', label: '📬 Zimbra Email' },
          { value: 'Gmail', label: '📮 Gmail (Google Workspace)' }
        ]
      },
      {
        name: 'manager_email',
        label: 'Manager Email',
        type: 'email',
        required: true,
        placeholder: 'manager@company.com',
        description: 'Manager approval will be requested'
      }
    ],
    
    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(data.email_address)) {
        return { valid: false, message: 'Please enter a valid email address' };
      }
      
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email' };
      }
      
      return { valid: true };
    },
    
    generateTicket: function(data) {
      const body = `NEW EMAIL ACCOUNT REQUEST

EMPLOYEE INFORMATION
Name: ${data.employee_name}
Department: ${data.department}

EMAIL ACCOUNT DETAILS
Platform: ${data.email_platform}
Email Address: ${data.email_address}

APPROVAL DETAILS
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ IT Security team review
✅ Create email account in ${data.email_platform}
✅ Configure email client settings
✅ Send welcome email with account details
✅ Update user directory`;
      
      return {
        title: `New Email Account - ${data.employee_name} (${data.email_platform})`,
        body: body,
        group: 'IT Service',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // 2. PASSWORD RESET REQUEST (SIMPLIFIED)
  // ============================================
  const PasswordResetTemplate = {
    name: 'Password Reset',
    icon: '🔑',
    description: 'Reset email password',
    
    fields: [
      {
        name: 'user_fullname',
        label: 'User Full Name',
        type: 'text',
        required: true,
        placeholder: 'John Doe'
      },
      {
        name: 'user_email',
        label: 'User Email Address',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com',
        description: 'The email account that needs password reset'
      },
      {
        name: 'email_platform',
        label: 'Email Platform',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Email Platform --' },
          { value: 'Zimbra', label: '📬 Zimbra Email' },
          { value: 'Gmail', label: '📮 Gmail (Google Workspace)' }
        ]
      },
      {
        name: 'reason',
        label: 'Reason for Reset',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Reason --' },
          { value: 'forgotten', label: 'User Forgot Password' },
          { value: 'compromised', label: 'Account Compromised/Security Risk' },
          { value: 'locked', label: 'Account Locked' },
          { value: 'expired', label: 'Password Expired' },
          { value: 'onboarding', label: 'New User Onboarding' },
          { value: 'other', label: 'Other Reason' }
        ]
      },
      {
        name: 'urgency',
        label: 'Urgency Level',
        type: 'select',
        required: true,
        options: [
          { value: '1 high', label: '🔴 High - User Cannot Work' },
          { value: '2 normal', label: '🟡 Normal - Standard Request' },
          { value: '3 low', label: '🟢 Low - Non-Critical' }
        ]
      },
      {
        name: 'manager_email',
        label: 'Manager Email',
        type: 'email',
        required: true,
        placeholder: 'manager@company.com',
        description: 'Manager approval required'
      }
    ],
    
    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(data.user_email)) {
        return { valid: false, message: 'Please enter a valid user email address' };
      }
      
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email address' };
      }
      
      return { valid: true };
    },
    
    generateTicket: function(data) {
      const body = `PASSWORD RESET REQUEST

USER INFORMATION
Full Name: ${data.user_fullname}
Email: ${data.user_email}
Platform: ${data.email_platform}

RESET DETAILS
Reason: ${data.reason}
Urgency: ${data.urgency}

APPROVAL
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ Verify user identity
✅ Reset password in ${data.email_platform} system
✅ Generate temporary password securely
✅ Send reset link/instructions to ${data.user_email}
✅ Request user to change password on first login
✅ Confirm completion via email to manager
✅ Log security event in audit trail`;
      
      return {
        title: `Password Reset - ${data.user_fullname} (${data.email_platform})`,
        body: body,
        group: 'IT Security',
        priority: data.urgency
      };
    }
  };

  // ============================================
  // 3. EMAIL MIGRATION (SIMPLIFIED)
  // ============================================
  const EmailMigrationTemplate = {
    name: 'Email Migration',
    icon: '🔄',
    description: 'Migrate email between platforms',
    
    fields: [
      {
        name: 'user_fullname',
        label: 'User Full Name',
        type: 'text',
        required: true,
        placeholder: 'John Doe'
      },
      {
        name: 'user_email',
        label: 'Email Address to Migrate',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com'
      },
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Department --' },
          { value: 'IT', label: 'Information Technology' },
          { value: 'HR', label: 'Human Resources' },
          { value: 'Finance', label: 'Finance' },
          { value: 'Marketing', label: 'Marketing' },
          { value: 'Sales', label: 'Sales' },
          { value: 'Operations', label: 'Operations' }
        ]
      },
      {
        name: 'source_platform',
        label: 'Source Platform (From)',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Source --' },
          { value: 'Zimbra', label: '📬 Zimbra' },
          { value: 'Gmail', label: '📮 Gmail' }
        ]
      },
      {
        name: 'target_platform',
        label: 'Target Platform (To)',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Target --' },
          { value: 'Zimbra', label: '📬 Zimbra' },
          { value: 'Gmail', label: '📮 Gmail' }
        ]
      },
      {
        name: 'migration_scope',
        label: 'What to Migrate',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Scope --' },
          { value: 'all', label: 'All Data (Emails, Contacts, Calendar)' },
          { value: 'emails_only', label: 'Emails Only' },
          { value: 'emails_contacts', label: 'Emails & Contacts' },
          { value: 'custom', label: 'Custom Selection' }
        ]
      },
      {
        name: 'migration_date',
        label: 'Preferred Migration Date',
        type: 'date',
        required: true,
        description: 'When should the migration happen?'
      },
      {
        name: 'backup_required',
        label: 'Backup Before Migration?',
        type: 'select',
        required: true,
        options: [
          { value: 'yes', label: 'Yes - Create full backup' },
          { value: 'no', label: 'No - Proceed without backup' }
        ]
      },
      {
        name: 'additional_notes',
        label: 'Additional Notes',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'Any special folders, rules, or requirements...'
      },
      {
        name: 'manager_email',
        label: 'Manager Email for Approval',
        type: 'email',
        required: true,
        placeholder: 'manager@company.com'
      }
    ],
    
    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(data.user_email)) {
        return { valid: false, message: 'Please enter a valid email address' };
      }
      
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email' };
      }
      
      if (data.source_platform === data.target_platform) {
        return { valid: false, message: 'Source and target platforms must be different' };
      }
      
      const selectedDate = new Date(data.migration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return { valid: false, message: 'Migration date cannot be in the past' };
      }
      
      return { valid: true };
    },
    
    generateTicket: function(data) {
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });
      };

      let body = `EMAIL MIGRATION REQUEST

USER INFORMATION
Full Name: ${data.user_fullname}
Email: ${data.user_email}
Department: ${data.department}

MIGRATION DETAILS
Source Platform: ${data.source_platform}
Target Platform: ${data.target_platform}
Migration Scope: ${data.migration_scope}

SCHEDULE & BACKUP
Preferred Date: ${formatDate(data.migration_date)}
Backup Required: ${data.backup_required}`;

      if (data.additional_notes && data.additional_notes.trim()) {
        body += `

ADDITIONAL NOTES
${data.additional_notes}`;
      }

      body += `

APPROVAL
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ Schedule migration during maintenance window
✅ Create backup if requested
✅ Set up target account in ${data.target_platform}
✅ Migrate data from ${data.source_platform} to ${data.target_platform}
✅ Verify data integrity after migration
✅ Test email send/receive functionality
✅ Update DNS/MX records if needed
✅ Notify user of completion
✅ Deactivate old account after confirmation

IMPORTANT NOTES
- User should backup important data before migration
- Migration may take several hours depending on data size
- User will be notified 24 hours before migration
- Old account will remain active for 7 days post-migration`;
      
      return {
        title: `Email Migration - ${data.user_fullname} (${data.source_platform} → ${data.target_platform})`,
        body: body,
        group: 'IT Service',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // 4. EMAIL DELETION (WITH CONDITIONAL FIELD)
  // ============================================
  const EmailDeletionTemplate = {
    name: 'Delete Email Account',
    icon: '🗑️',
    description: 'Request email account deletion',
    
    fields: [
      {
        name: 'user_fullname',
        label: 'User Full Name',
        type: 'text',
        required: true,
        placeholder: 'John Doe'
      },
      {
        name: 'email_to_delete',
        label: 'Email Address to Delete',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com'
      },
      {
        name: 'email_platform',
        label: 'Email Platform',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Platform --' },
          { value: 'Zimbra', label: '📬 Zimbra' },
          { value: 'Gmail', label: '📮 Gmail' }
        ]
      },
      {
        name: 'deletion_reason',
        label: 'Reason for Deletion',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Reason --' },
          { value: 'employee_exit', label: 'Employee Termination/Resignation' },
          { value: 'role_change', label: 'Role Change/Transfer' },
          { value: 'duplicate_account', label: 'Duplicate Account' },
          { value: 'unused_account', label: 'Unused/Inactive Account' },
          { value: 'security_breach', label: 'Security Breach/Compromised' },
          { value: 'other', label: 'Other Reason' }
        ],
        onChange: function(selectElement) {
          // Find the other_reason field using data-field-name attribute
          const form = selectElement.closest('form');
          if (!form) return;
          
          const otherReasonGroup = form.querySelector('[data-field-name="other_reason_detail"]');
          if (!otherReasonGroup) return;
          
          const otherReasonInput = otherReasonGroup.querySelector('textarea');
          
          if (selectElement.value === 'other') {
            // Show the other reason field with smooth transition
            otherReasonGroup.style.display = 'block';
            if (otherReasonInput) {
              otherReasonInput.required = true;
              // Add red asterisk to label if not already there
              const label = otherReasonGroup.querySelector('label');
              if (label && !label.textContent.includes('*')) {
                label.textContent = label.textContent + ' *';
              }
            }
          } else {
            // Hide the other reason field
            otherReasonGroup.style.display = 'none';
            if (otherReasonInput) {
              otherReasonInput.required = false;
              otherReasonInput.value = '';
              otherReasonInput.style.borderColor = '#404040';
              // Remove red asterisk from label
              const label = otherReasonGroup.querySelector('label');
              if (label) {
                label.textContent = label.textContent.replace(' *', '');
              }
            }
          }
        }
      },
      {
        name: 'other_reason_detail',
        label: 'Please Specify Other Reason',
        type: 'textarea',
        required: false, // Will be dynamically set to true when visible
        rows: 3,
        placeholder: 'Please explain the reason for deletion...',
        hidden: true // Start hidden - will show when "Other" is selected
      },
      {
        name: 'last_working_day',
        label: 'Last Working Day (if applicable)',
        type: 'date',
        required: false,
        description: 'For employee termination/resignation'
      },
      {
        name: 'backup_required',
        label: 'Backup Email Data?',
        type: 'select',
        required: true,
        options: [
          { value: 'yes', label: 'Yes - Create full backup archive' },
          { value: 'no', label: 'No - Delete without backup' }
        ]
      },
      {
        name: 'email_forward',
        label: 'Forward Emails To (Optional)',
        type: 'email',
        required: false,
        placeholder: 'replacement@company.com',
        description: 'Forward incoming emails to another address'
      },
      {
        name: 'requester_name',
        label: 'Requested By',
        type: 'text',
        required: true,
        placeholder: 'Jane Smith'
      },
      {
        name: 'requester_role',
        label: 'Your Role',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Role --' },
          { value: 'manager', label: 'Direct Manager' },
          { value: 'hr', label: 'HR Department' },
          { value: 'it_admin', label: 'IT Administrator' },
          { value: 'security', label: 'Security Team' }
        ]
      },
      {
        name: 'requester_email',
        label: 'Your Email',
        type: 'email',
        required: true,
        placeholder: 'jane.smith@company.com'
      },
      {
        name: 'hr_approval_email',
        label: 'HR Approval Email',
        type: 'email',
        required: true,
        placeholder: 'hr@company.com',
        description: 'HR must approve all deletions'
      }
    ],
    
    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(data.email_to_delete)) {
        return { valid: false, message: 'Please enter a valid email address to delete' };
      }
      
      if (!emailRegex.test(data.requester_email)) {
        return { valid: false, message: 'Please enter a valid requester email' };
      }
      
      if (!emailRegex.test(data.hr_approval_email)) {
        return { valid: false, message: 'Please enter a valid HR approval email' };
      }
      
      if (data.email_forward && !emailRegex.test(data.email_forward)) {
        return { valid: false, message: 'Please enter a valid forwarding email address' };
      }
      
      // Validate "Other Reason" - must provide detail if selected
      if (data.deletion_reason === 'other' && (!data.other_reason_detail || !data.other_reason_detail.trim())) {
        return { valid: false, message: 'Please specify the other reason for deletion' };
      }
      
      return { valid: true };
    },
    
    generateTicket: function(data) {
      const formatDate = (dateStr) => {
        if (!dateStr) return 'Not specified';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });
      };

      // Determine the reason text
      let reasonText = data.deletion_reason;
      if (data.deletion_reason === 'other' && data.other_reason_detail) {
        reasonText = `Other - ${data.other_reason_detail}`;
      }

      let body = `⚠️ EMAIL ACCOUNT DELETION REQUEST

USER INFORMATION
Full Name: ${data.user_fullname}
Email to Delete: ${data.email_to_delete}
Platform: ${data.email_platform}

DELETION DETAILS
Reason: ${reasonText}
Last Working Day: ${formatDate(data.last_working_day)}
Backup Required: ${data.backup_required}`;

      if (data.email_forward) {
        body += `

FORWARDING
Forward Emails To: ${data.email_forward}`;
      }

      body += `

REQUESTER INFORMATION
Name: ${data.requester_name}
Role: ${data.requester_role}
Email: ${data.requester_email}

APPROVAL REQUIRED
HR Approval: ${data.hr_approval_email}

ACTION REQUIRED
✅ HR approval confirmation required
✅ Create backup archive if requested
✅ Set up email forwarding if specified
✅ Disable login access
✅ Remove from distribution lists
✅ Archive data appropriately
✅ Update user directory
✅ Notify relevant parties

⚠️ IMPORTANT SECURITY NOTES
- This action is PERMANENT
- Backup must be created before deletion
- HR approval is MANDATORY
- Security team will be notified`;
      
      return {
        title: `🗑️ Email Deletion - ${data.user_fullname} (${data.deletion_reason === 'other' ? 'Other Reason' : data.deletion_reason})`,
        body: body,
        group: 'IT Security',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // 5. EMAIL RENAMING (SIMPLIFIED)
  // ============================================
  const EmailRenamingTemplate = {
    name: 'Rename Email Address',
    icon: '✏️',
    description: 'Change email address',
    
    fields: [
      {
        name: 'user_fullname',
        label: 'User Full Name',
        type: 'text',
        required: true,
        placeholder: 'Jane Smith'
      },
      {
        name: 'current_email',
        label: 'Current Email Address',
        type: 'email',
        required: true,
        placeholder: 'jane.smith@company.com'
      },
      {
        name: 'new_email',
        label: 'New Email Address',
        type: 'email',
        required: true,
        placeholder: 'jane.doe@company.com'
      },
      {
        name: 'email_platform',
        label: 'Email Platform',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Platform --' },
          { value: 'Zimbra', label: '📬 Zimbra' },
          { value: 'Gmail', label: '📮 Gmail' }
        ]
      },
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Department --' },
          { value: 'IT', label: 'Information Technology' },
          { value: 'HR', label: 'Human Resources' },
          { value: 'Finance', label: 'Finance' },
          { value: 'Marketing', label: 'Marketing' },
          { value: 'Sales', label: 'Sales' },
          { value: 'Operations', label: 'Operations' }
        ]
      },
      {
        name: 'rename_reason',
        label: 'Reason for Renaming',
        type: 'text',
        required: true,
        placeholder: 'e.g., Marriage, Role change, Name correction...'
      },
      {
        name: 'manager_email',
        label: 'Manager Email for Approval',
        type: 'email',
        required: true,
        placeholder: 'manager@company.com'
      }
    ],
    
    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(data.current_email)) {
        return { valid: false, message: 'Please enter a valid current email address' };
      }
      
      if (!emailRegex.test(data.new_email)) {
        return { valid: false, message: 'Please enter a valid new email address' };
      }
      
      if (data.current_email === data.new_email) {
        return { valid: false, message: 'New email must be different from current email' };
      }
      
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email' };
      }
      
      return { valid: true };
    },
    
    generateTicket: function(data) {
      const body = `EMAIL ADDRESS RENAMING REQUEST

USER INFORMATION
Full Name: ${data.user_fullname}
Department: ${data.department}
Platform: ${data.email_platform}

EMAIL CHANGE DETAILS
Current Email: ${data.current_email}
New Email: ${data.new_email}
Reason: ${data.rename_reason}

APPROVAL
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ Check new email availability in ${data.email_platform}
✅ Create backup of current mailbox
✅ Rename primary email address
✅ Configure old email as temporary alias (90 days)
✅ Update all distribution lists
✅ Update Active Directory/LDAP
✅ Update email signatures
✅ Notify user of completion
✅ Send notification to internal contacts

COMMUNICATION PLAN
- User will be notified 48 hours before change
- Old email will remain active as alias for 90 days
- Email clients will need to be reconfigured
- Business cards may need updating`;
      
      return {
        title: `✏️ Email Rename - ${data.user_fullname} (${data.current_email} → ${data.new_email})`,
        body: body,
        group: 'IT Service',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // REGISTER ALL TEMPLATES TO EMAIL CATEGORY
  // ============================================
  if (window.registerTicketTemplate) {
    window.registerTicketTemplate('email', 'new_account', EmailRequestTemplate);
    window.registerTicketTemplate('email', 'password_reset', PasswordResetTemplate);
    window.registerTicketTemplate('email', 'migration', EmailMigrationTemplate);
    window.registerTicketTemplate('email', 'deletion', EmailDeletionTemplate);
    window.registerTicketTemplate('email', 'renaming', EmailRenamingTemplate);
    
    console.log('✅ All Email Templates registered successfully!');
    console.log('   📧 New Email Account');
    console.log('   🔑 Password Reset');
    console.log('   🔄 Email Migration');
    console.log('   🗑️ Email Deletion');
    console.log('   ✏️ Email Renaming');
  } else {
    console.error('❌ Template registry not found! Make sure launcher_template.js is loaded first.');
  }

})();