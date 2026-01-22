// File: app/assets/javascripts/custom/templates/vpn_templates_v2.js
// VPN Templates - Updated with Spacing & Conditional Fields

(function() {
  'use strict';

  // ============================================
  // 1. VPN ACCESS REQUEST (SIMPLIFIED)
  // ============================================
  const VPNAccessTemplate = {
    name: 'VPN Access Request',
    icon: '🔓',
    description: 'Request new VPN access',
    
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
        name: 'vpn_region',
        label: 'VPN Region',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select VPN Region --' },
          { value: 'Thailand', label: 'Thailand' },
          { value: 'Manila', label: 'Manila' },
          { value: 'Tokyo', label: 'Tokyo' },
          { value: 'Dubai', label: 'Dubai' },
          { value: 'Bengaluru', label: 'Bengaluru' },
          { value: 'Mumbai', label: 'Mumbai' },
          { value: 'Myanmar', label: 'Myanmar' },
          { value: 'Seoul', label: 'Seoul' },
          { value: 'Singapore', label: 'Singapore' },
          { value: 'Vietnam', label: 'Vietnam' }
        ]
      },
      {
        name: 'manager_name',
        label: 'Manager Name',
        type: 'text',
        required: true,
        placeholder: 'Jane Smith'
      },
      {
        name: 'manager_email',
        label: 'Manager Email',
        type: 'email',
        required: true,
        placeholder: 'jane.smith@company.com'
      }
    ],

    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email' };
      }
      return { valid: true };
    },

    generateTicket: function(data) {
      const body = `VPN ACCESS REQUEST

EMPLOYEE INFORMATION
Name: ${data.employee_name}
Department: ${data.department}

VPN ACCESS DETAILS
Region: ${data.vpn_region}

APPROVAL DETAILS
Manager Name: ${data.manager_name}
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ Security team review
✅ VPN account setup for ${data.vpn_region} region
✅ Send credentials to user`;

      return {
        title: `VPN Access Request - ${data.employee_name} (${data.vpn_region})`,
        body: body,
        group: 'IT Security',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // 2. VPN ISSUE REPORT (WITH CONDITIONAL FIELD)
  // ============================================
  const VPNIssueTemplate = {
    name: 'VPN Issue Report',
    icon: '🔒',
    description: 'Report VPN connection problems',
    
    fields: [
      {
        name: 'issue_type',
        label: 'Issue Type',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Issue Type --' },
          { value: 'Cannot Connect', label: 'Cannot Connect to VPN' },
          { value: 'Disconnects Frequently', label: 'Disconnects Frequently' },
          { value: 'Connection Timeout', label: 'Connection Timeout' },
          { value: 'Other', label: 'Other VPN Issue' }
        ],
        onChange: function(selectElement) {
          const form = selectElement.closest('form');
          if (!form) return;
          
          const otherIssueGroup = form.querySelector('[data-field-name="other_issue_detail"]');
          if (!otherIssueGroup) return;
          
          const otherIssueInput = otherIssueGroup.querySelector('textarea');
          
          if (selectElement.value === 'Other') {
            otherIssueGroup.style.display = 'block';
            if (otherIssueInput) {
              otherIssueInput.required = true;
              const label = otherIssueGroup.querySelector('label');
              if (label && !label.textContent.includes('*')) {
                label.textContent = label.textContent + ' *';
              }
            }
          } else {
            otherIssueGroup.style.display = 'none';
            if (otherIssueInput) {
              otherIssueInput.required = false;
              otherIssueInput.value = '';
              otherIssueInput.style.borderColor = '#404040';
              const label = otherIssueGroup.querySelector('label');
              if (label) {
                label.textContent = label.textContent.replace(' *', '');
              }
            }
          }
        }
      },
      {
        name: 'other_issue_detail',
        label: 'Please Specify Other Issue',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'Please describe the VPN issue...',
        hidden: true
      },
      {
        name: 'vpn_region',
        label: 'VPN Region',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select VPN Region --' },
          { value: 'Thailand', label: 'Thailand' },
          { value: 'Manila', label: 'Manila' },
          { value: 'Tokyo', label: 'Tokyo' },
          { value: 'Dubai', label: 'Dubai' },
          { value: 'Bengaluru', label: 'Bengaluru' },
          { value: 'Mumbai', label: 'Mumbai' },
          { value: 'Myanmar', label: 'Myanmar' },
          { value: 'Seoul', label: 'Seoul' },
          { value: 'Singapore', label: 'Singapore' },
          { value: 'Vietnam', label: 'Vietnam' }
        ]
      },
      {
        name: 'network_type',
        label: 'Network Type',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Network Type --' },
          { value: 'Office WiFi', label: 'Office WiFi' },
          { value: 'Home', label: 'Home' },
          { value: 'Mobile Data', label: 'Mobile Data' }
        ]
      },
      {
        name: 'when_started',
        label: 'When Did This Start?',
        type: 'datetime-local',
        required: true
      },
      {
        name: 'description',
        label: 'Detailed Description',
        type: 'textarea',
        required: true,
        rows: 6,
        placeholder: 'Describe what happens, error messages, etc...'
      },
      {
        name: 'troubleshooting',
        label: 'Troubleshooting Steps Already Tried',
        type: 'textarea',
        required: false,
        rows: 3,
        placeholder: 'E.g., Restarted VPN client, rebooted computer...'
      },
      {
        name: 'reporter_name',
        label: 'Your Name',
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
        name: 'reporter_email',
        label: 'Your Email',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com'
      }
    ],

    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.reporter_email)) {
        return { valid: false, message: 'Please enter a valid email address' };
      }

      const issueTime = new Date(data.when_started);
      const now = new Date();
      
      if (issueTime > now) {
        return { valid: false, message: 'Issue start time cannot be in the future' };
      }

      // Validate "Other" issue detail
      if (data.issue_type === 'Other' && (!data.other_issue_detail || !data.other_issue_detail.trim())) {
        return { valid: false, message: 'Please specify the other VPN issue' };
      }

      return { valid: true };
    },

    generateTicket: function(data) {
      const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { 
          weekday: 'short',
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Determine issue type text
      let issueTypeText = data.issue_type;
      if (data.issue_type === 'Other' && data.other_issue_detail) {
        issueTypeText = `Other - ${data.other_issue_detail}`;
      }

      let body = `VPN ISSUE REPORT

ISSUE DETAILS
Issue Type: ${issueTypeText}
VPN Region: ${data.vpn_region}
Started: ${formatDateTime(data.when_started)}
Network Type: ${data.network_type}

REPORTER INFORMATION
Name: ${data.reporter_name}
Department: ${data.department}
Email: ${data.reporter_email}

DESCRIPTION
${data.description}`;

      if (data.troubleshooting && data.troubleshooting.trim()) {
        body += `

TROUBLESHOOTING ALREADY DONE
${data.troubleshooting}`;
      }

      body += `

ACTION REQUIRED
✅ Contact user and acknowledge ticket
✅ Review VPN logs for ${data.vpn_region} region
✅ Check user VPN account status
✅ Test VPN connection from support side
✅ Provide solution or escalate`;

      return {
        title: `VPN Issue: ${data.issue_type === 'Other' ? 'Other Issue' : data.issue_type} - ${data.vpn_region} - ${data.reporter_name}`,
        body: body,
        group: 'IT Security',
        priority: '2 normal'
      };
    }
  };

  // ============================================
  // 3. VPN REVOCATION (NEW TEMPLATE)
  // ============================================
  const VPNRevocationTemplate = {
    name: 'VPN Revocation',
    icon: '🚫',
    description: 'Revoke VPN access',
    
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
        name: 'vpn_region',
        label: 'VPN Region',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select VPN Region --' },
          { value: 'Thailand', label: 'Thailand' },
          { value: 'Manila', label: 'Manila' },
          { value: 'Tokyo', label: 'Tokyo' },
          { value: 'Dubai', label: 'Dubai' },
          { value: 'Bengaluru', label: 'Bengaluru' },
          { value: 'Mumbai', label: 'Mumbai' },
          { value: 'Myanmar', label: 'Myanmar' },
          { value: 'Seoul', label: 'Seoul' },
          { value: 'Singapore', label: 'Singapore' },
          { value: 'Vietnam', label: 'Vietnam' }
        ]
      },
      {
        name: 'revocation_reason',
        label: 'Reason for Revocation',
        type: 'select',
        required: true,
        options: [
          { value: '', label: '-- Select Reason --' },
          { value: 'Employee Termination', label: 'Employee Termination' },
          { value: 'Employee Resignation', label: 'Employee Resignation' },
          { value: 'Role Change', label: 'Role Change/Transfer' },
          { value: 'Security Breach', label: 'Security Breach/Compromised' },
          { value: 'No Longer Needed', label: 'No Longer Needed' },
          { value: 'Policy Violation', label: 'Policy Violation' },
          { value: 'Other', label: 'Other Reason' }
        ]
      },
      {
        name: 'manager_name',
        label: 'Manager Name',
        type: 'text',
        required: true,
        placeholder: 'Jane Smith'
      },
      {
        name: 'manager_email',
        label: 'Manager Email',
        type: 'email',
        required: true,
        placeholder: 'jane.smith@company.com',
        description: 'Manager approval required'
      }
    ],

    validate: function(data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.manager_email)) {
        return { valid: false, message: 'Please enter a valid manager email' };
      }
      return { valid: true };
    },

    generateTicket: function(data) {
      const body = `⚠️ VPN ACCESS REVOCATION

EMPLOYEE INFORMATION
Name: ${data.employee_name}
Department: ${data.department}

VPN ACCESS DETAILS
Region: ${data.vpn_region}
Reason for Revocation: ${data.revocation_reason}

APPROVAL DETAILS
Manager Name: ${data.manager_name}
Manager Email: ${data.manager_email}

ACTION REQUIRED
✅ Manager approval via email
✅ Disable VPN account for ${data.vpn_region} region
✅ Revoke all VPN certificates
✅ Remove from VPN access groups
✅ Log revocation in audit trail
✅ Notify security team
✅ Confirm completion to manager

⚠️ SECURITY NOTES
- VPN access will be immediately revoked
- User will be unable to connect to ${data.vpn_region} VPN
- All active VPN sessions will be terminated
- Manager and security team will be notified`;

      return {
        title: `🚫 VPN Revocation - ${data.employee_name} (${data.vpn_region})`,
        body: body,
        group: 'IT Security',
        priority: '1 high'
      };
    }
  };

  // ============================================
  // REGISTER TEMPLATES TO VPN CATEGORY
  // ============================================
  if (window.registerTicketTemplate) {
    window.registerTicketTemplate('vpn', 'vpn_access', VPNAccessTemplate);
    window.registerTicketTemplate('vpn', 'vpn_issue', VPNIssueTemplate);
    window.registerTicketTemplate('vpn', 'vpn_revocation', VPNRevocationTemplate);
    
    console.log('✅ All VPN Templates registered successfully!');
    console.log('   🔓 VPN Access Request');
    console.log('   🔒 VPN Issue Report');
    console.log('   🚫 VPN Revocation');
  } else {
    console.error('❌ Template registry not found!');
  }

})();