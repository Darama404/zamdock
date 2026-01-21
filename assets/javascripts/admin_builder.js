// File: app/assets/javascripts/custom/admin_builder.js
// Template Admin Builder - V3.60 (All Issues Fixed)

(function() {
  'use strict';
  console.log('🛠️ Admin Builder Module Loading...');

  const PROFESSIONAL_ICONS = [
    '📋', '📂', '📧', '💻', '🖥️',
    '🛠️', '🔍', '🚨', '✅', '⚙️',
    '📊', '🔨', '🔧'
  ];

  function renderIconOptions(selected) {
    return PROFESSIONAL_ICONS.map(icon => (
      `<option value="${icon}" ${icon === selected ? 'selected' : ''}>${icon}</option>`
    )).join('');
  }

  class TemplateAdminBuilder {
    constructor() {
      console.log('👑 Initializing Admin Builder...');
      this.pendingCount = 0;
      this.categories = [];
      this.templates = {};
      this.formFields = [];
      
      this.formBuilderState = {
        templateName: '',
        categoryId: '',
        icon: '📋',
        fields: []
      };
      
      this.navigationContext = {
        returnTo: null,
        selectedCategory: null
      };

      this.sidebarObserver = null;
      this.init();
    }

    init() {
      this.waitForSession();
    }

    getCsrfToken() {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.content : '';
    }

    waitForSession(attempt = 1, maxAttempts = 50) {
      if (window.App && window.App.Session && window.App.Session.get) {
        const roles = window.App.Session.get('roles');
        if (roles && roles.length > 0) {
          if (!this.isAdminOrAgent()) {
            console.log('👤 User is not admin/agent');
            return;
          }
          console.log('👑 Admin/Agent detected');
          this.initSidebarIntegration();
          this.addGlobalStyles();
          this.startPendingCountPolling();
          return;
        }
      }
      if (attempt < maxAttempts) {
        setTimeout(() => this.waitForSession(attempt + 1, maxAttempts), 100);
      } else {
        console.warn('⚠️ Session timeout, retrying with fallback...');
        this.waitForSessionWithFallback();
      }
    }

    waitForSessionWithFallback(attempt = 1, maxAttempts = 30) {
      console.log('🔄 Trying fallback detection...', attempt);
      
      // Cek sidebar "Manage" menu (hanya admin/agent yang punya)
      const manageMenu = document.querySelector('a[href="#manage"]');
      
      if (manageMenu && manageMenu.offsetParent !== null) {
        console.log('👑 Admin/Agent detected (via fallback)');
        this.initSidebarIntegration();
        this.addGlobalStyles();
        this.startPendingCountPolling();
        return;
      }
      
      if (attempt < maxAttempts) {
        setTimeout(() => this.waitForSessionWithFallback(attempt + 1, maxAttempts), 200);
      } else {
        console.error('❌ Could not detect admin/agent role');
      }
    }

    isAdminOrAgent() {
      try {
        // 1) Coba roles kalau ada (fallback, tidak wajib)
        if (window.App && window.App.Session && window.App.Session.get) {
          const roles = window.App.Session.get('roles');
          if (roles && Array.isArray(roles)) {
            const hasAdminRole = roles.some(role => {
              const roleName = role.name || role;
              return roleName === 'Admin' || roleName === 'Agent';
            });
            if (hasAdminRole) return true;
          }
        }

        // 2) Fallback ke UI: kalau bisa lihat menu Manage, anggap admin
        const adminMenu = document.querySelector('a[href="#manage"]');
        if (adminMenu && adminMenu.offsetParent !== null) {
          return true;
        }

        return false;
      } catch (e) {
        console.error('❌ Error checking user role:', e);
        return true; // fallback: jangan block
      }
    }


    async startPendingCountPolling() {
      await this.updatePendingCount();
      setInterval(async () => {
        await this.updatePendingCount();
      }, 10000);
    }

    async updatePendingCount() {
      try {
        const response = await fetch('/api/v1/template_admin/pending/count');
        if (response.ok) {
          const data = await response.json();
          this.pendingCount = data.count || 0;
          this.updateSidebarBadge();
        }
      } catch (error) {
        console.error('❌ Error polling pending count:', error);
      }
    }

    initSidebarIntegration() {
      this.injectSidebarMenu();
      this.sidebarObserver = new MutationObserver(() => {
        const sidebar = document.querySelector('.sidebar.NavBarAdmin');
        if (sidebar && !document.getElementById('nav-template-builder')) {
          this.injectSidebarMenu();
        }
      });
      this.sidebarObserver.observe(document.body, { childList: true, subtree: true });
    }

    injectSidebarMenu() {
      const sidebar = document.querySelector('.sidebar.NavBarAdmin');
      if (!sidebar) return;

      const headings = Array.from(sidebar.querySelectorAll('h2'));
      const manageHeader = headings.find(h => h.textContent.trim() === 'Manage');
      if (!manageHeader) return;

      const manageList = manageHeader.nextElementSibling;
      if (!manageList || !manageList.classList.contains('nav')) return;
      if (manageList.querySelector('#nav-template-builder')) return;

      const li = document.createElement('li');
      li.id = 'nav-template-builder';
      
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'admin-builder-trigger';
      
      // ✅ FIX #1: Remove inline onclick (CSP violation)
      a.addEventListener('click', (e) => {
        e.preventDefault();
        sidebar.querySelectorAll('li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        this.showMainMenu();
      });

      li.appendChild(a);
      manageList.appendChild(li);
      this.updateSidebarBadge();
    }

    updateSidebarBadge() {
      const menuItem = document.getElementById('nav-template-builder');
      if (!menuItem) return;

      const link = menuItem.querySelector('a');
      if (!link) return;
      
      const badgeHtml = this.pendingCount > 0 
        ? `<span style="
            background: #ff9800;
            color: #fff;
            border-radius: 20px;
            padding: 1px 6px;
            font-size: 9px;
            margin-left: 6px;
            font-weight: 600;
            display: inline-block;
            min-width: 16px;
            height: 16px;
            line-height: 14px;
            text-align: center;
            vertical-align: middle;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">${this.pendingCount}</span>` 
        : '';
      
      link.innerHTML = `Template Builder${badgeHtml}`;
    }

    addGlobalStyles() {
      if (document.getElementById('admin-builder-styles')) return;
      const style = document.createElement('style');
      style.id = 'admin-builder-styles';
      style.textContent = `
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-gear { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

        .gear-spinner {
          font-size: 72px !important;
          display: inline-block !important;
          animation: spin-gear 3s linear infinite, pulse-glow 2s ease-in-out infinite !important;
          filter: drop-shadow(0 4px 12px rgba(43, 124, 255, 0.4));
        }

        .admin-modal {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 99999;
        }
        .admin-container {
          background: #2b2b2b; border-radius: 8px; padding: 24px; max-width: 800px; width: 95%;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); color: #e5e5e5;
        }
        .admin-title { font-size: 24px; font-weight: bold; margin-bottom: 24px; color: #fff; }
        .admin-menu-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px;
        }
        .admin-menu-card {
          padding: 20px; background: #333333; border: 2px solid #404040; border-radius: 6px;
          cursor: pointer; transition: all 0.2s; text-align: center;
        }
        .admin-menu-card:hover {
          background: #3d3d3d; border-color: #2b7cff; transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(43, 124, 255, 0.2);
        }
        .admin-menu-icon { font-size: 32px; margin-bottom: 8px; }
        .admin-menu-label { font-size: 14px; font-weight: 600; }
        .admin-form-group { margin-bottom: 16px; }
        .admin-form-label {
          display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #e5e5e5;
        }
        .admin-form-input, .admin-form-select, .admin-form-textarea {
          width: 100%; padding: 10px 12px; background: #1a1a1a; border: 1px solid #404040;
          border-radius: 4px; color: #e5e5e5; font-size: 14px; box-sizing: border-box; font-family: inherit;
        }
        .admin-form-input:focus, .admin-form-select:focus, .admin-form-textarea:focus {
          outline: none; border-color: #2b7cff; box-shadow: 0 0 0 3px rgba(43, 124, 255, 0.2);
        }
        .admin-form-textarea { resize: vertical; min-height: 80px; }
        .admin-button-group { display: flex; gap: 8px; margin-top: 20px; }
        .admin-btn {
          flex: 1; padding: 10px 16px; border: none; border-radius: 4px;
          cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;
        }
        .admin-btn-primary { background: #2b7cff; color: white; }
        .admin-btn-primary:hover { background: #1f5cd9; }
        .admin-btn-secondary { background: #404040; color: #e5e5e5; }
        .admin-btn-secondary:hover { background: #4a4a4a; }
        .admin-btn-success { background: #22c55e; color: white; }
        .admin-btn-success:hover { background: #16a34a; }
        .admin-btn-danger { background: #ff4444; color: white; }
        .admin-btn-danger:hover { background: #dd2222; }
        .admin-btn-small { padding: 6px 12px; font-size: 12px; flex: none; }
        .admin-alert {
          padding: 12px 16px; border-radius: 4px; margin-bottom: 16px; font-size: 14px;
        }
        .admin-alert-success {
          background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #86efac;
        }
        .admin-alert-error {
          background: rgba(255, 68, 68, 0.15); border: 1px solid #ff4444; color: #ff8888;
        }
        .admin-alert-info {
          background: rgba(43, 124, 255, 0.15); border: 1px solid #2b7cff; color: #5fa3ff;
        }
        .admin-alert-warning {
          background: rgba(255, 193, 7, 0.15); border: 1px solid #ffc107; color: #ffe082;
        }

        .progress-bar-container {
          width: 100%; 
          height: 40px; 
          background: #1a1a1a; 
          border: 2px solid #404040;
          border-radius: 20px; 
          overflow: hidden; 
          position: relative;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
        }

        .progress-bar {
          height: 100%; 
          background: linear-gradient(90deg, #2b7cff 0%, #667eea 50%, #22c55e 100%);
          background-size: 200% 100%;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          width: 0%; 
          display: flex; 
          align-items: center;
          justify-content: center; 
          color: white; 
          font-size: 14px; 
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          animation: gradient-shift 2s ease infinite;
        }

        .deploy-spinner {
          display: inline-block; width: 20px; height: 20px; border: 3px solid #404040;
          border-top-color: #2b7cff; border-radius: 50%; animation: spin 1s linear infinite;
        }
        .field-builder-item {
          padding: 16px; background: #333333; border: 1px solid #404040;
          border-radius: 4px; margin-bottom: 12px;
        }
        .field-builder-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        }
        .field-number {
          background: #2b7cff; color: white; border-radius: 50%; width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;
        }
        .divider { border-top: 1px solid #404040; margin: 20px 0; }
        .create-category-link {
          display: flex; align-items: center; gap: 8px; padding: 12px; background: #1a1a1a;
          border: 2px dashed #404040; border-radius: 4px; cursor: pointer; transition: all 0.2s; margin-top: 8px;
        }
        .create-category-link:hover { border-color: #2b7cff; background: #252525; }
        .deploy-status-icon {
          width: 60px; height: 60px; margin: 0 auto 16px; display: flex;
          align-items: center; justify-content: center; font-size: 40px;
        }
      `;
      document.head.appendChild(style);
    }

    createModal() {
      this.removeModal();
      const modal = document.createElement('div');
      modal.className = 'admin-modal';
      modal.id = 'admin-builder-modal';
      const container = document.createElement('div');
      container.className = 'admin-container';
      modal.appendChild(container);
      modal.onclick = (e) => {
        if (e.target === modal) this.removeModal();
      };
      document.body.appendChild(modal);
      return modal;
    }

    removeModal() {
      const existing = document.getElementById('admin-builder-modal');
      if (existing) existing.remove();
    }

    showModalWithAlert(title, message, type = 'info') {
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');
      container.innerHTML = `
        <h2 class="admin-title">${title}</h2>
        <div class="admin-alert admin-alert-${type}">${message}</div>
        <button class="admin-btn admin-btn-primary" id="btn-ok" style="width:100%;">OK</button>
      `;
      // ✅ FIX #1: Event listener instead of inline onclick
      container.querySelector('#btn-ok').addEventListener('click', () => this.removeModal());
    }

    // ============================================
    // MAIN MENU
    // ============================================

    showMainMenu() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      let pendingNote = '';
      let applyButton = '';
      
      if (this.pendingCount > 0) {
        pendingNote = `
          <div class="admin-alert admin-alert-warning">
            ⚠️ You have <strong>${this.pendingCount}</strong> pending change(s).<br>
            Click "Apply Changes" to deploy them automatically.
          </div>
        `;
        applyButton = `
          <button class="admin-btn admin-btn-success" data-action="apply-changes" style="width:100%;margin-bottom:12px;">
            🚀 Apply Changes (${this.pendingCount})
          </button>
        `;
      } else {
        pendingNote = `
          <div class="admin-alert admin-alert-info">
            ℹ️ No pending changes. All templates are deployed.
          </div>
        `;
      }

      container.innerHTML = `
        <h2 class="admin-title">🛠️ Template Admin Builder</h2>
        ${pendingNote}
        <div class="admin-menu-grid">
          <div class="admin-menu-card" data-action="create-category">
            <div class="admin-menu-icon">📂</div>
            <div class="admin-menu-label">Create Category</div>
          </div>
          <div class="admin-menu-card" data-action="create-template">
            <div class="admin-menu-icon">📋</div>
            <div class="admin-menu-label">Create Template</div>
          </div>
          <div class="admin-menu-card" data-action="manage">
            <div class="admin-menu-icon">⚙️</div>
            <div class="admin-menu-label">Manage</div>
          </div>
        </div>
        <div class="divider"></div>
        ${applyButton}
        <button class="admin-btn admin-btn-secondary" data-action="close-modal" style="width:100%;">Close</button>
      `;

      this.attachMainMenuListeners(container);
    }

    attachMainMenuListeners(container) {
      container.querySelector('[data-action="create-category"]').addEventListener('click', () => {
        this.showCreateCategoryForm();
      });
      container.querySelector('[data-action="create-template"]').addEventListener('click', () => {
        this.showTemplateMethodSelector();
      });
      container.querySelector('[data-action="manage"]').addEventListener('click', () => {
        this.showManageView();
      });
      container.querySelector('[data-action="close-modal"]').addEventListener('click', () => {
        this.removeModal();
      });
      
      const applyBtn = container.querySelector('[data-action="apply-changes"]');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          this.showApplyChangesConfirmation();
        });
      }
    }

    // ============================================
    // 🔥 APPLY CHANGES (IMPROVED UI - FIX #3)
    // ============================================

    showApplyChangesConfirmation() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">🚀 Apply Changes</h2>
        <div class="admin-alert admin-alert-warning">
          <strong>⚠️ Important:</strong><br>
          This will compile assets and restart Zammad service.<br><br>
          <strong>What will happen:</strong><br>
          • Assets will be precompiled (~1-2 minutes)<br>
          • Zammad service will be restarted (~30 seconds)<br>
          • Brief downtime may occur during restart<br><br>
          <strong>Pending changes: ${this.pendingCount}</strong>
        </div>
        <p style="color:#e5e5e5;margin:20px 0;">
          Are you sure you want to proceed?
        </p>
        <div class="admin-button-group">
          <button class="admin-btn admin-btn-success" id="btn-confirm-apply">
            ✅ Yes, Apply Now
          </button>
          <button class="admin-btn admin-btn-secondary" id="btn-cancel-apply">
            Cancel
          </button>
        </div>
      `;

      container.querySelector('#btn-confirm-apply').addEventListener('click', () => {
        this.executeApplyChanges();
      });
      container.querySelector('#btn-cancel-apply').addEventListener('click', () => {
        this.showMainMenu();
      });
    }

    async executeApplyChanges() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      // ✅ Make sure we use the gear-spinner class
      container.innerHTML = `
        <h2 class="admin-title">🚀 Deploying Changes</h2>
        <div class="deploy-status-icon">
          <span class="gear-spinner">⚙️</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" id="deploy-progress">0%</div>
        </div>
        <div style="text-align:center;margin-top:16px;color:#e5e5e5;font-size:16px;font-weight:500;" id="deploy-status">
          Starting deployment...
        </div>
        <div style="text-align:center;margin-top:8px;color:#999;font-size:13px;" id="deploy-substatus">
          Please wait, this may take 1-3 minutes
        </div>
      `;

      try {
        const response = await fetch('/api/v1/template_admin/apply_changes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.getCsrfToken(),
          },
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          this.updateDeployProgress(20, 'Deployment initiated', 'Connecting to server...');
          
          setTimeout(() => {
            this.pollDeploymentStatus();
          }, 2000);
        } else {
          this.showDeployError(data.error || 'Failed to start deployment');
        }
      } catch (error) {
        console.error('Error starting deployment:', error);
        this.showDeployError('Network error: ' + error.message);
      }
    }

    // 3️⃣ REPLACE updateDeployProgress() function - around line ~465
    updateDeployProgress(percent, statusText, subStatus = '') {
      const progressBar = document.getElementById('deploy-progress');
      const statusEl = document.getElementById('deploy-status');
      const subStatusEl = document.getElementById('deploy-substatus');
      
      if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.textContent = Math.round(percent) + '%';
      }
      if (statusEl) {
        statusEl.textContent = statusText;
      }
      if (subStatusEl && subStatus) {
        subStatusEl.textContent = subStatus;
      }
    }

    async pollDeploymentStatus() {
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes
      let lastCount = this.pendingCount;
      
      const poll = async () => {
        attempts++;
        
        try {
          // ✅ FIX #4: Check pending count to detect completion
          const countResponse = await fetch('/api/v1/template_admin/pending/count');
          const countData = await countResponse.json();
          const currentCount = countData.count || 0;
          
          // ✅ FIX #4: Deployment complete when pending count drops to 0
          if (currentCount === 0 && lastCount > 0) {
            this.updateDeployProgress(100, '✅ Deployment completed!', 'All changes are now live');
            
            // Show completion UI
            setTimeout(async () => {
              await this.updatePendingCount();
              this.showDeploySuccess();
            }, 1500);
            return; // ✅ STOP polling
          }
          
          lastCount = currentCount;
          
          // Update progress based on time elapsed
          if (attempts < 10) {
            this.updateDeployProgress(30 + attempts * 3, 'Compiling assets...', `Step ${attempts}/10`);
          } else if (attempts < 30) {
            this.updateDeployProgress(65, 'Still compiling...', 'This may take a moment');
          } else if (attempts < 45) {
            this.updateDeployProgress(85, 'Restarting Zammad...', 'Almost done');
          } else {
            this.updateDeployProgress(95, 'Finalizing...', 'Just a few more seconds');
          }
          
          if (attempts >= maxAttempts) {
            this.showDeployError('Deployment timeout. Please check server logs at /opt/zammad/log/template_deploy.log');
            return; // ✅ STOP polling
          }
          
          // ✅ Continue polling every 3 seconds
          setTimeout(poll, 3000);
          
        } catch (error) {
          console.error('Error polling deployment:', error);
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            this.showDeployError('Failed to check deployment status');
          }
        }
      };
      
      poll();
    }

    showDeploySuccess() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">🎉 Deployment Successful!</h2>
        <div class="deploy-status-icon">✅</div>
        <div class="admin-alert admin-alert-success">
          <strong>All changes have been applied!</strong><br><br>
          Your templates are now live and ready to use.<br>
          Zammad has been successfully restarted.
        </div>
        <button class="admin-btn admin-btn-primary" id="btn-back-menu" style="width:100%;">
          Back to Menu
        </button>
      `;

      container.querySelector('#btn-back-menu').addEventListener('click', () => {
        this.showMainMenu();
      });
    }

    showDeploySuccess() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">🎉 Deployment Successful!</h2>
        
        <div class="deploy-status-icon" style="font-size: 80px;">
          <span style="animation: pulse-glow 1s ease-in-out 3;">✅</span>
        </div>
        
        <div class="admin-alert admin-alert-success">
          <strong>All changes have been applied!</strong><br><br>
          Your templates are now live and ready to use.<br>
          Zammad has been successfully restarted.
        </div>
        
        <button class="admin-btn admin-btn-primary" id="btn-back-menu" style="width:100%;">
          Back to Menu
        </button>
      `;

      container.querySelector('#btn-back-menu').addEventListener('click', () => {
        this.showMainMenu();
      });
    }

    // ============================================
    // CREATE CATEGORY
    // ============================================

    showCreateCategoryForm(fromContext = null) {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">📂 Create New Category</h2>
        <div class="admin-form-group">
          <label class="admin-form-label">Category ID *</label>
          <input type="text" class="admin-form-input" id="category-id"
            placeholder="e.g., email, vpn, device" pattern="[a-z0-9_-]+">
          <small style="color:#999;">Lowercase letters, numbers, hyphen or underscore only</small>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Category Name *</label>
          <input type="text" class="admin-form-input" id="category-name"
            placeholder="e.g., Device Troubleshooting">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Icon (Emoji)</label>
          <select class="admin-form-input" id="category-icon">
            ${renderIconOptions('📂')}
          </select>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Description</label>
          <textarea class="admin-form-textarea" id="category-description"
            placeholder="What is this category for?"></textarea>
        </div>
        <div class="admin-button-group">
          <button class="admin-btn admin-btn-primary" id="btn-create-category">Create</button>
          <button class="admin-btn admin-btn-secondary" id="btn-cancel">Back</button>
        </div>
      `;

      container.querySelector('#btn-create-category').addEventListener('click', () => this.submitCreateCategory(fromContext));
      container.querySelector('#btn-cancel').addEventListener('click', () => {
        if (fromContext === 'template-creation') {
          this.showTemplateMethodSelector();
        } else {
          this.showMainMenu();
        }
      });
    }

    async submitCreateCategory(fromContext = null) {
      const id = document.getElementById('category-id').value.trim();
      const name = document.getElementById('category-name').value.trim();
      const icon = document.getElementById('category-icon').value.trim() || '📂';
      const description = document.getElementById('category-description').value.trim();

      if (!id || !name) {
        this.showModalWithAlert('❌ Error', 'Category ID and Name are required', 'error');
        return;
      }

      try {
        const response = await fetch('/api/v1/template_admin/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.getCsrfToken(),
          },
          body: JSON.stringify({ id, name, icon, description }),
        });

        const data = await response.json();
        if (response.ok) {
          this.showCategoryCreatedDialog(id, name, icon);
        } else {
          this.showModalWithAlert('❌ Error', data.error || 'Failed to create category', 'error');
        }
      } catch (error) {
        console.error('Error creating category:', error);
        this.showModalWithAlert('❌ Error', 'Network error: ' + error.message, 'error');
      }
    }

    showCategoryCreatedDialog(categoryId, categoryName, categoryIcon) {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">✅ Category Created!</h2>
        <div class="admin-alert admin-alert-success">
          Category "<strong>${categoryIcon} ${categoryName}</strong>" has been created successfully!<br><br>
          <small>⚠️ This change will be live after you run "Apply Changes".</small>
        </div>
        <p style="color:#e5e5e5;margin-bottom:16px;">
          Would you like to create a template for this category now?
        </p>
        <div class="admin-button-group">
          <button class="admin-btn admin-btn-success" id="btn-create-template">
            ✅ Yes, Create Template
          </button>
          <button class="admin-btn admin-btn-secondary" id="btn-back-menu">
            Later
          </button>
        </div>
      `;

      container.querySelector('#btn-create-template').addEventListener('click', () => {
        this.navigationContext.selectedCategory = categoryId;
        this.showTemplateMethodSelector();
      });

      container.querySelector('#btn-back-menu').addEventListener('click', () => {
        this.showMainMenu();
      });
    }

    // ============================================
    // TEMPLATE METHOD SELECTOR
    // ============================================

    showTemplateMethodSelector() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `
        <h2 class="admin-title">📋 Choose Template Creation Method</h2>
        <p style="color:#999;margin-bottom:20px;">Select how you want to create your template</p>
        <div class="admin-menu-grid">
          <div class="admin-menu-card" data-action="form-builder">
            <div class="admin-menu-icon">📋</div>
            <div class="admin-menu-label">Form Builder</div>
            <small style="color:#999;margin-top:8px;display:block;">Visual form creation</small>
          </div>
          <div class="admin-menu-card" data-action="code-editor">
            <div class="admin-menu-icon">💻</div>
            <div class="admin-menu-label">Code Editor</div>
            <small style="color:#999;margin-top:8px;display:block;">Write JavaScript template code</small>
          </div>
        </div>
        <div class="divider"></div>
        <button class="admin-btn admin-btn-secondary" style="width:100%;" data-action="back">Back to Menu</button>
      `;

      container.querySelector('[data-action="form-builder"]').addEventListener('click', () => {
        this.showFormBuilderTemplate();
      });
      container.querySelector('[data-action="code-editor"]').addEventListener('click', () => {
        this.showCreateTemplateForm();
      });
      container.querySelector('[data-action="back"]').addEventListener('click', () => {
        this.showMainMenu();
      });
    }

    // ============================================
    // FORM BUILDER (✅ FIX #2: Support dropdown options)
    // ============================================

    async showFormBuilderTemplate() {
      this.removeModal();
      try {
        const response = await fetch('/api/v1/template_admin/categories');
        const data = await response.json();
        this.categories = data.categories || [];

        if (this.categories.length === 0) {
          this.showModalWithAlert('❌ No Categories', 'Please create a category first before creating templates', 'error');
          setTimeout(() => this.showMainMenu(), 2000);
          return;
        }

        if (!this.formBuilderState.categoryId && this.navigationContext.selectedCategory) {
          this.formBuilderState.categoryId = this.navigationContext.selectedCategory;
        }

        if (this.formBuilderState.fields.length === 0) {
          this.formBuilderState.fields = [
            { name: 'user_name', label: 'Your Name', type: 'text', required: true, placeholder: 'Enter your name' },
            {
              name: 'department',
              label: 'Department',
              type: 'select',
              required: true,
              options: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'],
            },
          ];
        }

        this.renderFormBuilder();
      } catch (error) {
        console.error('Error fetching categories:', error);
        this.showModalWithAlert('❌ Error', 'Error fetching categories: ' + error.message, 'error');
        setTimeout(() => this.showMainMenu(), 2000);
      }
    }

    renderFormBuilder() {
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      const categoryOptions = this.categories
        .map(cat => `<option value="${cat.id}" ${cat.id === this.navigationContext.selectedCategory || cat.id === this.formBuilderState.categoryId ? 'selected' : ''}>${cat.icon || '📋'} ${cat.name}</option>`)
        .join('');

      const fieldsHTML = this.formBuilderState.fields
        .map((field, idx) => {
          const fieldNum = idx + 1;
          
          // ✅ FIX #2: Show options input for select/dropdown fields
          const optionsHTML = field.type === 'select' ? `
            <div class="admin-form-group">
              <label class="admin-form-label">Dropdown Options (one per line)</label>
              <textarea class="admin-form-textarea field-options" data-index="${idx}" rows="4" placeholder="Option 1
Option 2
Option 3">${Array.isArray(field.options) ? field.options.join('\n') : ''}</textarea>
              <small style="color:#999;">Each line will be one option in the dropdown</small>
            </div>
          ` : '';

          return `
            <div class="field-builder-item">
              <div class="field-builder-header">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div class="field-number">${fieldNum}</div>
                  <span style="font-weight:600;color:#e5e5e5;">${field.label}</span>
                  ${field.required ? '<span style="color:#ff8888;">*</span>' : ''}
                </div>
                <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-field" data-index="${idx}">
                  Delete
                </button>
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label">Field Name (ID)</label>
                <input type="text" class="admin-form-input field-name" value="${field.name}" data-index="${idx}" placeholder="field_name">
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label">Field Label</label>
                <input type="text" class="admin-form-input field-label" value="${field.label}" data-index="${idx}" placeholder="Display label">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="admin-form-group">
                  <label class="admin-form-label">Field Type</label>
                  <select class="admin-form-input field-type" data-index="${idx}">
                    <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text Input</option>
                    <option value="email" ${field.type === 'email' ? 'selected' : ''}>Email</option>
                    <option value="select" ${field.type === 'select' ? 'selected' : ''}>Dropdown</option>
                    <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Text Area</option>
                  </select>
                </div>
                <div class="admin-form-group">
                  <label class="admin-form-label">Required</label>
                  <select class="admin-form-input field-required" data-index="${idx}">
                    <option value="false" ${!field.required ? 'selected' : ''}>No</option>
                    <option value="true" ${field.required ? 'selected' : ''}>Yes</option>
                  </select>
                </div>
              </div>
              ${optionsHTML}
            </div>
          `;
        })
        .join('');

      container.innerHTML = `
        <h2 class="admin-title">📋 Form Builder</h2>
        <div class="admin-form-group">
          <label class="admin-form-label">Template Name *</label>
          <input type="text" class="admin-form-input" id="template-name" 
            placeholder="e.g., VPN Access Request"
            value="${this.formBuilderState.templateName || ''}">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Category *</label>
          <select class="admin-form-input" id="template-category">
            <option value="">-- Select Category --</option>
            ${categoryOptions}
          </select>
          <div class="create-category-link" id="create-category-link">
            <span style="font-size:20px;">➕</span>
            <span style="color:#2b7cff;font-weight:600;font-size:14px;">Create New Category</span>
          </div>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Template Icon</label>
          <select class="admin-form-input" id="template-icon">
            ${renderIconOptions(this.formBuilderState.icon || '📋')}
          </select>
        </div>
        <h3 style="color:#e5e5e5;margin-top:24px;margin-bottom:16px;">Form Fields</h3>
        ${fieldsHTML}
        <button class="admin-btn admin-btn-primary" style="width:100%;margin-top:16px;" id="btn-add-field">
          + Add Field
        </button>
        <div class="divider"></div>
        <div class="admin-button-group">
          <button class="admin-btn admin-btn-primary" id="btn-save-form">Save Template</button>
          <button class="admin-btn admin-btn-secondary" id="btn-back">Back</button>
        </div>
      `;

      container.querySelector('#create-category-link').addEventListener('click', () => {
        this.saveFormBuilderState();
        this.navigationContext.returnTo = 'form-builder';
        this.showCreateCategoryForm('template-creation');
      });

      this.attachFormBuilderListeners(container);
    }

    saveFormBuilderState() {
      const nameInput = document.getElementById('template-name');
      const categorySelect = document.getElementById('template-category');
      const iconSelect = document.getElementById('template-icon');

      if (nameInput) this.formBuilderState.templateName = nameInput.value;
      if (categorySelect) this.formBuilderState.categoryId = categorySelect.value;
      if (iconSelect) this.formBuilderState.icon = iconSelect.value;
    }

    attachFormBuilderListeners(container) {
      const nameInput = container.querySelector('#template-name');
      const categorySelect = container.querySelector('#template-category');
      const iconSelect = container.querySelector('#template-icon');

      nameInput.oninput = () => {
        this.formBuilderState.templateName = nameInput.value;
      };
      categorySelect.onchange = () => {
        this.formBuilderState.categoryId = categorySelect.value;
        this.navigationContext.selectedCategory = null;
      };
      iconSelect.onchange = () => {
        this.formBuilderState.icon = iconSelect.value;
      };

      container.querySelector('#btn-add-field').addEventListener('click', () => {
        this.saveFormBuilderState();
        this.formBuilderState.fields.push({
          name: `field_${Date.now()}`,
          label: 'New Field',
          type: 'text',
          required: false,
          placeholder: '',
          options: [],
        });
        this.renderFormBuilder();
      });

      container.querySelectorAll('[data-action="delete-field"]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.saveFormBuilderState();
          const idx = parseInt(btn.dataset.index, 10);
          this.formBuilderState.fields.splice(idx, 1);
          this.renderFormBuilder();
        });
      });

      container.querySelectorAll('.field-name').forEach(input => {
        input.onchange = () => {
          const idx = parseInt(input.dataset.index, 10);
          this.formBuilderState.fields[idx].name = input.value;
        };
      });

      container.querySelectorAll('.field-label').forEach(input => {
        input.onchange = () => {
          const idx = parseInt(input.dataset.index, 10);
          this.formBuilderState.fields[idx].label = input.value;
        };
      });

      container.querySelectorAll('.field-type').forEach(select => {
        select.onchange = () => {
          this.saveFormBuilderState();
          const idx = parseInt(select.dataset.index, 10);
          this.formBuilderState.fields[idx].type = select.value;
          this.renderFormBuilder();
        };
      });

      container.querySelectorAll('.field-required').forEach(select => {
        select.onchange = () => {
          const idx = parseInt(select.dataset.index, 10);
          this.formBuilderState.fields[idx].required = select.value === 'true';
        };
      });

      // ✅ FIX #2: Handle options textarea for dropdown fields
      container.querySelectorAll('.field-options').forEach(textarea => {
        textarea.onchange = () => {
          const idx = parseInt(textarea.dataset.index, 10);
          this.formBuilderState.fields[idx].options = textarea.value
            .split('\n')
            .map(o => o.trim())
            .filter(o => o);
        };
      });

      container.querySelector('#btn-save-form').addEventListener('click', () => {
        this.submitFormBuilderTemplate();
      });
      container.querySelector('#btn-back').addEventListener('click', () => {
        this.showTemplateMethodSelector();
      });
    }

    async submitFormBuilderTemplate() {
      const templateName = this.formBuilderState.templateName.trim();
      const categoryId = (this.formBuilderState.categoryId || this.navigationContext.selectedCategory || '').trim();
      const icon = this.formBuilderState.icon.trim() || '📋';

      if (!templateName || !categoryId) {
        this.showModalWithAlert('❌ Error', 'Template name and category are required', 'error');
        return;
      }

      if (this.formBuilderState.fields.length === 0) {
        this.showModalWithAlert('❌ Error', 'Add at least one form field', 'error');
        return;
      }

      const templateId = templateName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .substring(0, 50);

      const jsVarName = (templateId.replace(/_/g, '') || 'templateForm') + 'Template';

      // ✅ FIX #5: Generate proper template format with all required functions
      const fieldsCode = JSON.stringify(this.formBuilderState.fields.map(field => {
        const fieldObj = {
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required
        };
        if (field.type === 'select' && field.options) {
          fieldObj.options = field.options;
        }
        if (field.placeholder) {
          fieldObj.placeholder = field.placeholder;
        }
        return fieldObj;
      }), null, 2);

      const templateCode = `
(function() {
  'use strict';

  const ${jsVarName} = {
    name: '${templateName}',
    icon: '${icon}',
    description: 'Form-based template created via Form Builder',
    
    fields: ${fieldsCode},

    validate: function(data) {
      for (let field of this.fields) {
        if (field.required && (!data[field.name] || data[field.name].toString().trim() === '')) {
          return { valid: false, message: field.label + ' is required' };
        }
        if (field.type === 'email' && data[field.name]) {
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(data[field.name])) {
            return { valid: false, message: 'Invalid email format for ' + field.label };
          }
        }
      }
      return { valid: true };
    },

    generateTicket: function(data) {
      let body = '${templateName.toUpperCase()}\\n\\n';
      for (let field of this.fields) {
        body += field.label + ': ' + (data[field.name] || 'N/A') + '\\n';
      }
      return {
        title: '${templateName} - ' + (data.user_name || data[this.fields[0].name] || 'User Request'),
        body: body,
        group: 'Support',
        priority: '2 normal'
      };
    }
  };

  if (window.registerTicketTemplate) {
    window.registerTicketTemplate('${categoryId}', '${templateId}', ${jsVarName});
    console.log('✅ Template registered: ${templateId}');
  }
})();
      `.trim();

      try {
        const response = await fetch(`/api/v1/template_admin/categories/${categoryId}/templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.getCsrfToken(),
          },
          body: JSON.stringify({
            template_id: templateId,
            content: templateCode,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          this.formBuilderState = {
            templateName: '',
            categoryId: '',
            icon: '📋',
            fields: []
          };
          this.navigationContext.selectedCategory = null;

          this.showModalWithAlert(
            '✅ Success',
            `Template "${templateName}" created successfully!<br><br>It has been added to the pending queue. Use "Apply Changes" to deploy it.`,
            'success'
          );
          setTimeout(() => this.showMainMenu(), 2000);
        } else {
          this.showModalWithAlert('❌ Error', data.error || 'Failed to create template', 'error');
        }
      } catch (error) {
        console.error('Error creating template:', error);
        this.showModalWithAlert('❌ Error', 'Network error: ' + error.message, 'error');
      }
    }

    // ============================================
    // CODE EDITOR TEMPLATE
    // ============================================

    showCreateTemplateForm() {
      this.removeModal();
      try {
        const response = fetch('/api/v1/template_admin/categories');
        response.then(res => res.json()).then(data => {
          this.categories = data.categories || [];
          if (this.categories.length === 0) {
            this.showModalWithAlert('❌ No Categories', 'Please create a category first before creating templates', 'error');
            setTimeout(() => this.showMainMenu(), 2000);
            return;
          }
          this.renderCodeEditor();
        });
      } catch (error) {
        console.error('Error fetching categories:', error);
        this.showModalWithAlert('❌ Error', 'Error fetching categories: ' + error.message, 'error');
        setTimeout(() => this.showMainMenu(), 2000);
      }
    }

    renderCodeEditor() {
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      const categoryOptions = this.categories
        .map(cat => `<option value="${cat.id}">${cat.icon || '📋'} ${cat.name}</option>`)
        .join('');

      container.innerHTML = `
        <h2 class="admin-title">💻 Code Editor Template</h2>
        <div class="admin-form-group">
          <label class="admin-form-label">Template ID *</label>
          <input type="text" class="admin-form-input" id="template-id"
            placeholder="e.g., vpn_request" pattern="[a-z0-9_-]+">
          <small style="color:#999;">Lowercase letters, numbers, hyphen or underscore only</small>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Category *</label>
          <select class="admin-form-input" id="template-category">
            <option value="">-- Select Category --</option>
            ${categoryOptions}
          </select>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">JavaScript Code *</label>
          <textarea class="admin-form-textarea" id="template-code" style="min-height:200px;font-family:monospace;"
            placeholder="(function() { 'use strict'; const myTemplate = { name: 'My Template', icon: '📋', fields: [...], validate: function(data) {...}, generateTicket: function(data) {...} }; if (window.registerTicketTemplate) { window.registerTicketTemplate('category', 'template_id', myTemplate); } })();"></textarea>
        </div>
        <div class="admin-button-group">
          <button class="admin-btn admin-btn-primary" id="btn-save-code">Save Template</button>
          <button class="admin-btn admin-btn-secondary" id="btn-back">Back</button>
        </div>
      `;

      container.querySelector('#btn-save-code').addEventListener('click', () => {
        this.submitCodeEditorTemplate();
      });
      container.querySelector('#btn-back').addEventListener('click', () => {
        this.showTemplateMethodSelector();
      });
    }

    async submitCodeEditorTemplate() {
      const templateId = document.getElementById('template-id').value.trim();
      const categoryId = document.getElementById('template-category').value.trim();
      const code = document.getElementById('template-code').value.trim();

      if (!templateId || !categoryId || !code) {
        this.showModalWithAlert('❌ Error', 'All fields are required', 'error');
        return;
      }

      try {
        const response = await fetch(`/api/v1/template_admin/categories/${categoryId}/templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.getCsrfToken(),
          },
          body: JSON.stringify({
            template_id: templateId,
            content: code,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          this.showModalWithAlert(
            '✅ Success',
            `Template "${templateId}" created successfully!<br><br>It has been added to the pending queue. Use "Apply Changes" to deploy it.`,
            'success'
          );
          setTimeout(() => this.showMainMenu(), 2000);
        } else {
          this.showModalWithAlert('❌ Error', data.error || 'Failed to create template', 'error');
        }
      } catch (error) {
        console.error('Error creating template:', error);
        this.showModalWithAlert('❌ Error', 'Network error: ' + error.message, 'error');
      }
    }

    // ============================================
    // MANAGE VIEW
    // ============================================

    showManageView() {
      this.removeModal();
      const modal = this.createModal();
      const container = modal.querySelector('.admin-container');

      container.innerHTML = `<h2 class="admin-title">⚙️ Manage Templates</h2><p style="color:#999;">Loading categories...</p>`;

      fetch('/api/v1/template_admin/categories')
        .then(res => res.json())
        .then(data => {
          this.categories = data.categories || [];

          if (this.categories.length === 0) {
            container.innerHTML = `
              <h2 class="admin-title">⚙️ Manage Templates</h2>
              <div class="admin-alert admin-alert-info">No categories found. Create one first!</div>
              <button class="admin-btn admin-btn-secondary" style="width:100%;" id="btn-back">Back</button>
            `;
            container.querySelector('#btn-back').addEventListener('click', () => this.showMainMenu());
            return;
          }

          // Load templates for each category
          Promise.all(
            this.categories.map(cat => 
              fetch(`/api/v1/template_admin/categories/${cat.id}/templates`)
                .then(res => res.json())
                .then(data => ({ categoryId: cat.id, templates: data.templates || [] }))
            )
          ).then(results => {
            results.forEach(r => {
              this.templates[r.categoryId] = r.templates;
            });

            const manageHTML = this.categories.map(category => {
              const templates = this.templates[category.id] || [];
              return `
                <div style="padding:16px;background:#333333;border:1px solid #404040;border-radius:4px;margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <span style="font-size:16px;font-weight:600;color:#e5e5e5;">${category.icon || '📋'} ${category.name}</span>
                    <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-category" data-category="${category.id}">
                      Delete Category
                    </button>
                  </div>
                  <div style="font-size:12px;color:#999;margin-top:4px;">${category.description || ''}</div>
                  ${templates.length > 0 ? `<div style="margin-top:12px;">${templates.map(tpl => `
                    <div style="padding:12px;background:#2a2a2a;border:1px solid #383838;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                      <span>${tpl}</span>
                      <button class="admin-btn admin-btn-danger admin-btn-small" data-action="delete-template" data-category="${category.id}" data-template="${tpl}">
                        Delete
                      </button>
                    </div>
                  `).join('')}</div>` : '<div style="padding:12px;background:#2a2a2a;border:1px solid #383838;border-radius:4px;margin-bottom:8px;"><span style="color:#999;">No templates in this category</span></div>'}
                </div>
              `;
            }).join('');

            container.innerHTML = `
              <h2 class="admin-title">⚙️ Manage Templates</h2>
              <div>${manageHTML}</div>
              <button class="admin-btn admin-btn-secondary" style="width:100%;margin-top:16px;" id="btn-back">Back</button>
            `;

            container.querySelectorAll('[data-action="delete-category"]').forEach(btn => {
              btn.addEventListener('click', async () => {
                const categoryId = btn.dataset.category;
                if (confirm(`Delete category "${categoryId}"? This cannot be undone.`)) {
                  await this.deleteCategory(categoryId);
                }
              });
            });

            container.querySelectorAll('[data-action="delete-template"]').forEach(btn => {
              btn.addEventListener('click', async () => {
                const categoryId = btn.dataset.category;
                const templateId = btn.dataset.template;
                if (confirm(`Delete template "${templateId}"? A backup will be created.`)) {
                  await this.deleteTemplate(categoryId, templateId);
                }
              });
            });

            container.querySelector('#btn-back').addEventListener('click', () => this.showMainMenu());
          });
        });
    }

    async deleteCategory(categoryId) {
      try {
        const response = await fetch(`/api/v1/template_admin/categories/${categoryId}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': this.getCsrfToken() },
        });

        const data = await response.json();
        if (response.ok) {
          this.showModalWithAlert('✅ Success', `Category "${categoryId}" deleted!`, 'success');
          setTimeout(() => this.showManageView(), 1500);
        } else {
          this.showModalWithAlert('❌ Error', data.error || 'Failed to delete category', 'error');
        }
      } catch (error) {
        this.showModalWithAlert('❌ Error', 'Network error: ' + error.message, 'error');
      }
    }

    async deleteTemplate(categoryId, templateId) {
      try {
        const response = await fetch(
          `/api/v1/template_admin/categories/${categoryId}/templates/${templateId}`,
          { method: 'DELETE', headers: { 'X-CSRF-Token': this.getCsrfToken() } }
        );

        const data = await response.json();
        if (response.ok) {
          this.showModalWithAlert('✅ Success', `Template "${templateId}" deleted!`, 'success');
          setTimeout(() => this.showManageView(), 1500);
        } else {
          this.showModalWithAlert('❌ Error', data.error || 'Failed to delete template', 'error');
        }
      } catch (error) {
        this.showModalWithAlert('❌ Error', 'Network error: ' + error.message, 'error');
      }
    }
  }

  // Initialize
  window.TemplateAdminBuilder = TemplateAdminBuilder;
  new TemplateAdminBuilder();
})();