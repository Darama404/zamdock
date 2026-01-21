// File: app/assets/javascripts/custom/launcher_template.js
// Template Launcher - V1.22
// Template System v3 - Fixed Auto-Loading from Admin Builder
// Updated: Now loads categories and templates from Admin Builder

(function() {
  'use strict';

  console.log('🚀 Template Launcher Loading...');

  // Template Registry with Categories
  window.TemplateRegistry = {
    categories: {},
    templates: {}
  };

  // Register category
  window.registerTemplateCategory = function(id, category) {
    window.TemplateRegistry.categories[id] = category;
    console.log('✅ Category registered:', id, category.name);
  };

  // Register template to category
  window.registerTicketTemplate = function(categoryId, templateId, template) {
    if (!window.TemplateRegistry.categories[categoryId]) {
      console.error('❌ Category not found:', categoryId);
      return;
    }

    const fullId = `${categoryId}:${templateId}`;
    window.TemplateRegistry.templates[fullId] = {
      ...template,
      categoryId: categoryId,
      templateId: templateId
    };
    console.log('✅ Template registered:', fullId, template.name);
  };

  // Get templates by category
  function getTemplatesByCategory(categoryId) {
    return Object.values(window.TemplateRegistry.templates)
      .filter(t => t.categoryId === categoryId);
  }

  // ============================================
  // 🔥 NEW: AUTO-LOAD CATEGORIES FROM ADMIN BUILDER
  // ============================================
  async function loadCategoriesFromAdminBuilder() {
    console.log('📦 Loading categories from Admin Builder...');
    try {
      const response = await fetch('/api/v1/template_admin/categories');
      
      if (!response.ok) {
        console.warn('⚠️ Could not load categories from Admin Builder (status:', response.status, ')');
        // If 403 Forbidden, user might not have permission (expected for some users)
        if (response.status === 403) {
          console.log('ℹ️ User does not have admin access - using default categories only');
        }
        return;
      }
      
      const data = await response.json();
      const categories = data.categories || [];
      
      console.log('📂 Found categories:', categories.length);
      
      for (const category of categories) {
        // Register category if not already registered
        if (!window.TemplateRegistry.categories[category.id]) {
          window.registerTemplateCategory(category.id, {
            id: category.id,
            name: category.name,
            icon: category.icon || '📋',
            description: category.description || ''
          });
          console.log('✅ Auto-registered category:', category.id);
        }
        
        // Load templates for this category
        await loadTemplatesForCategory(category.id);
      }
      
      console.log('✅ All categories and templates loaded!');
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
  }

  // ============================================
  // 🔥 NEW: AUTO-LOAD TEMPLATES FROM ADMIN BUILDER
  // ============================================
  async function loadTemplatesForCategory(categoryId) {
    console.log(`📄 Loading templates for category: ${categoryId}`);
    try {
      const response = await fetch(`/api/v1/template_admin/categories/${categoryId}/templates`);
      if (!response.ok) {
        console.warn(`⚠️ Could not load templates for ${categoryId}`);
        return;
      }
      
      const data = await response.json();
      const templateFiles = data.templates || [];
      
      console.log(`📄 Found ${templateFiles.length} template(s) for ${categoryId}`);
      
      // Load each template file
      for (const templateFile of templateFiles) {
        await loadTemplateFile(categoryId, templateFile);
      }
    } catch (error) {
      console.error(`❌ Error loading templates for ${categoryId}:`, error);
    }
  }

  // ============================================
  // 🔥 NEW: LOAD TEMPLATE FILE
  // ============================================
  async function loadTemplateFile(categoryId, templateFileName) {
    try {
      // Clean template name: remove .js extension and any timestamp prefix
      let cleanFileName = templateFileName.replace('.js', '');
      
      // Remove timestamp prefix if present (pattern: 1234567890_name -> name)
      if (cleanFileName.match(/^\d+_(.+)$/)) {
        cleanFileName = cleanFileName.replace(/^\d+_/, '');
      }
      
      console.log(`📥 Loading template file: ${cleanFileName} (from ${templateFileName})`);
      
      // Fetch the template file content
      const response = await fetch(`/api/v1/template_admin/categories/${categoryId}/templates/${cleanFileName}/content`);
      
      if (!response.ok) {
        console.warn(`⚠️ Could not load template file: ${cleanFileName} (status: ${response.status})`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success || !data.content) {
        console.warn(`⚠️ Invalid response for template: ${cleanFileName}`);
        return;
      }
      
      const templateCode = data.content;
      
      // Execute the template code to register it
      try {
        eval(templateCode);
        console.log(`✅ Template loaded and registered: ${cleanFileName}`);
      } catch (evalError) {
        console.error(`❌ Error executing template code for ${cleanFileName}:`, evalError);
      }
    } catch (error) {
      console.error(`❌ Error loading template file ${templateFileName}:`, error);
    }
  }

  class TicketTemplateManager {
    constructor() {
      console.log('🎯 Initializing Template Manager...');
      this.init();
    }

    init() {
      setTimeout(() => {
        this.interceptNewTicketButton();
      }, 1000);

      window.addEventListener('hashchange', () => {
        setTimeout(() => {
          this.interceptNewTicketButton();
        }, 500);
      });
    }

    interceptNewTicketButton() {
      const self = this;

      // ✅ SELECTOR SUPER SPESIFIK - HANYA TOMBOL NEW TICKET!
      const selectors = [
        // Customer portal
        'a[href="#customer_ticket_new"]',
        
        // Agent interface - tombol + New Ticket di tabs
        'li.settings.add a[href="#ticket/create"]',
        
        // Backup selector kalau struktur berubah
        'a.list-button[href="#ticket/create"][title="New"]'
      ];

      selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);

        buttons.forEach(button => {
          if (button && !button.dataset.templateIntercepted) {
            button.dataset.templateIntercepted = 'true';

            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', function(e) {
              console.log('🎉 New Ticket Button clicked!');
              e.preventDefault();
              e.stopPropagation();

              self.showCategorySelector();
              return false;
            }, true);
          }
        });
      });
    }

    // ============================================
    // CATEGORY SELECTOR (Step 1)
    // ============================================
    showCategorySelector() {
      const self = this;
      console.log('📋 Showing category selector...');

      const existingModal = document.getElementById('category-selector-modal');
      if (existingModal) existingModal.remove();

      const modal = document.createElement('div');
      modal.id = 'category-selector-modal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex;
        justify-content: center; align-items: center; z-index: 99999;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: #2b2b2b; border-radius: 8px; padding: 24px;
        max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      `;

      container.innerHTML = `
        <h2 style="margin: 0 0 8px 0; color: #e5e5e5; font-size: 24px;">
          📂 Select Category
        </h2>
        <p style="margin: 0 0 20px 0; color: #999; font-size: 14px;">
          Choose a category to see available templates
        </p>
      `;

      const optionsContainer = document.createElement('div');
      optionsContainer.style.cssText = `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px; margin-bottom: 16px;
      `;

      const categories = Object.values(window.TemplateRegistry.categories);

      categories.forEach(category => {
        const categoryCard = this.createCategoryCard(category, () => {
          console.log('🔵 Category clicked:', category.id);
          modal.remove();
          self.showTemplateSelector(category.id);
        });
        optionsContainer.appendChild(categoryCard);
      });

      // Blank ticket option
      const blankOption = this.createCategoryCard(
        { icon: '📄', name: 'Blank Ticket', description: 'Create from scratch' },
        () => {
          console.log('🔵 Blank ticket clicked');
          modal.remove();
          window.location.hash = '#customer_ticket_new';
        }
      );
      optionsContainer.appendChild(blankOption);

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        width: 100%; padding: 12px; background: #404040; border: none;
        border-radius: 4px; cursor: pointer; font-size: 14px;
        font-weight: 600; color: #e5e5e5;
      `;
      cancelBtn.onclick = () => modal.remove();

      container.appendChild(optionsContainer);
      container.appendChild(cancelBtn);
      modal.appendChild(container);

      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      document.body.appendChild(modal);
    }

    createCategoryCard(category, onClick) {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 20px; border: 2px solid #404040; border-radius: 6px;
        cursor: pointer; transition: all 0.2s; background: #333333;
        text-align: center;
      `;

      card.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">${category.icon || '📋'}</div>
        <div style="font-weight: 600; color: #e5e5e5; margin-bottom: 4px; font-size: 16px;">
          ${category.name}
        </div>
        <div style="font-size: 12px; color: #999;">
          ${category.description || ''}
        </div>
      `;

      card.onmouseenter = function() {
        this.style.borderColor = '#2b7cff';
        this.style.background = '#3d3d3d';
        this.style.transform = 'translateY(-4px)';
      };

      card.onmouseleave = function() {
        this.style.borderColor = '#404040';
        this.style.background = '#333333';
        this.style.transform = 'translateY(0)';
      };

      card.onclick = onClick;
      return card;
    }

    // ============================================
    // TEMPLATE SELECTOR (Step 2)
    // ============================================
    showTemplateSelector(categoryId) {
      const self = this;
      const category = window.TemplateRegistry.categories[categoryId];
      const templates = getTemplatesByCategory(categoryId);

      console.log('📋 Showing templates for category:', categoryId);

      const existingModal = document.getElementById('template-selector-modal');
      if (existingModal) existingModal.remove();

      const modal = document.createElement('div');
      modal.id = 'template-selector-modal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex;
        justify-content: center; align-items: center; z-index: 99999;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: #2b2b2b; border-radius: 8px; padding: 24px;
        max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      `;

      // Back button + Title
      container.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <button id="back-to-categories" style="
            background: #404040; border: none; padding: 8px 12px;
            border-radius: 4px; cursor: pointer; color: #e5e5e5;
            font-size: 14px; margin-right: 12px;
          ">← Back</button>
          <div>
            <h2 style="margin: 0; color: #e5e5e5; font-size: 24px;">
              ${category.icon} ${category.name}
            </h2>
            <p style="margin: 4px 0 0 0; color: #999; font-size: 14px;">
              Choose a template
            </p>
          </div>
        </div>
      `;

      const optionsContainer = document.createElement('div');
      optionsContainer.style.cssText = `
        display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px; margin-bottom: 16px;
      `;

      templates.forEach(template => {
        const templateCard = this.createTemplateCard(template, () => {
          console.log('🔵 Template clicked:', template.templateId);
          modal.remove();
          self.showTemplateForm(template);
        });
        optionsContainer.appendChild(templateCard);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        width: 100%; padding: 12px; background: #404040; border: none;
        border-radius: 4px; cursor: pointer; font-size: 14px;
        font-weight: 600; color: #e5e5e5;
      `;
      cancelBtn.onclick = () => modal.remove();

      container.appendChild(optionsContainer);
      container.appendChild(cancelBtn);
      modal.appendChild(container);

      // Back button handler
      container.querySelector('#back-to-categories').onclick = () => {
        modal.remove();
        self.showCategorySelector();
      };

      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      document.body.appendChild(modal);
    }

    createTemplateCard(template, onClick) {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 16px; border: 2px solid #404040; border-radius: 6px;
        cursor: pointer; transition: all 0.2s; background: #333333;
      `;

      card.innerHTML = `
        <div style="font-size: 36px; margin-bottom: 8px;">${template.icon || '📋'}</div>
        <div style="font-weight: 600; color: #e5e5e5; margin-bottom: 4px; font-size: 14px;">
          ${template.name}
        </div>
        <div style="font-size: 12px; color: #999;">
          ${template.description || ''}
        </div>
      `;

      card.onmouseenter = function() {
        this.style.borderColor = '#2b7cff';
        this.style.background = '#3d3d3d';
        this.style.transform = 'translateY(-2px)';
      };

      card.onmouseleave = function() {
        this.style.borderColor = '#404040';
        this.style.background = '#333333';
        this.style.transform = 'translateY(0)';
      };

      card.onclick = onClick;
      return card;
    }

    // ============================================
    // TEMPLATE FORM (Step 3)
    // ============================================
    showTemplateForm(template) {
      const self = this;
      console.log('📝 Form for:', template.templateId);

      const existingForm = document.getElementById('template-form-modal');
      if (existingForm) existingForm.remove();

      const modal = document.createElement('div');
      modal.id = 'template-form-modal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex;
        justify-content: center; align-items: center; z-index: 99999;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: #2b2b2b; border-radius: 8px; padding: 24px;
        max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;
      `;

      const header = document.createElement('div');
      header.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <div style="font-size: 40px; margin-right: 16px;">${template.icon || '📋'}</div>
          <div>
            <h2 style="margin: 0; color: #e5e5e5; font-size: 24px;">${template.name}</h2>
            <p style="margin: 4px 0 0 0; color: #999; font-size: 14px;">
              ${template.description || ''}
            </p>
          </div>
        </div>
      `;

      const form = document.createElement('form');
      form.id = 'template-form';
      form.setAttribute('novalidate', 'novalidate');

      template.fields.forEach(field => {
        form.appendChild(this.createFormField(field));
      });

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-top: 24px;';

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.textContent = 'Create Ticket';
      submitBtn.style.cssText = `
        flex: 1; padding: 12px; background: #2b7cff;
        color: white; border: none; border-radius: 4px; cursor: pointer;
        font-size: 14px; font-weight: 600;
      `;

      submitBtn.onclick = function() {
        handleFormSubmit();
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        flex: 1; padding: 12px; background: #404040; color: #e5e5e5;
        border: none; border-radius: 4px; cursor: pointer;
        font-size: 14px; font-weight: 600;
      `;

      cancelBtn.onclick = () => modal.remove();

      buttonContainer.appendChild(submitBtn);
      buttonContainer.appendChild(cancelBtn);

      container.appendChild(header);
      container.appendChild(form);
      container.appendChild(buttonContainer);
      modal.appendChild(container);

      const handleFormSubmit = function() {
        const formData = new FormData(form);
        const data = {};
        let hasEmptyRequired = false;

        for (let [key, value] of formData.entries()) {
          data[key] = value;

          const field = form.querySelector(`[name="${key}"]`);
          if (field && field.required && !value.trim()) {
            hasEmptyRequired = true;
            field.style.borderColor = '#f44336';
          } else if (field) {
            field.style.borderColor = '#404040';
          }
        }

        if (hasEmptyRequired) {
          alert('Please fill all required fields (marked with *)');
          return false;
        }

        if (template.validate) {
          const validation = template.validate(data);
          if (!validation.valid) {
            alert(validation.message || 'Invalid input');
            return false;
          }
        }

        const ticketData = template.generateTicket(data);
        modal.remove();
        self.openTicketWithData(ticketData);

        return true;
      };

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleFormSubmit();
        return false;
      }, false);

      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      document.body.appendChild(modal);
    }

    createFormField(field) {
      const group = document.createElement('div');
      group.style.marginBottom = '16px';
      group.setAttribute('data-field-name', field.name);
      
      // 🔥 CRITICAL: Hide field if marked as hidden
      if (field.hidden === true) {
        group.style.display = 'none';
        console.log('✅ Field initially hidden:', field.name);
      }

      const label = document.createElement('label');
      // Don't add asterisk initially for hidden fields
      const labelText = field.label + (field.required && !field.hidden ? ' *' : '');
      label.textContent = labelText;
      label.style.cssText = `
        display: block; margin-bottom: 6px; font-weight: 600;
        color: #e5e5e5; font-size: 14px;
      `;

      let input;

      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = field.rows || 4;
      } else if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value || opt;
          option.textContent = opt.label || opt;
          input.appendChild(option);
        });
        
        // 🔥 ATTACH onChange HANDLER from template
        if (field.onChange && typeof field.onChange === 'function') {
          input.addEventListener('change', (e) => {
            console.log('🔄 Select changed:', e.target.name, '→', e.target.value);
            field.onChange(e.target);
          });
        }
      } else {
        input = document.createElement('input');
        input.type = field.type || 'text';
      }

      input.name = field.name;
      input.required = field.required || false;
      input.placeholder = field.placeholder || '';
      input.style.cssText = `
        width: 100%; padding: 10px; border: 1px solid #404040;
        border-radius: 4px; font-size: 14px; box-sizing: border-box;
        background: #333333; color: #e5e5e5; font-family: inherit;
      `;

      group.appendChild(label);
      group.appendChild(input);

      if (field.description) {
        const desc = document.createElement('div');
        desc.textContent = field.description;
        desc.style.cssText = 'font-size: 12px; color: #999; margin-top: 4px;';
        group.appendChild(desc);
      }

      return group;
    }

    // ============================================
    // TICKET POPULATION
    // ============================================
    openTicketWithData(ticketData) {
      console.log('🚀 Opening ticket with data...');

      window.location.hash = '#customer_ticket_new';

      let attempts = 0;
      const maxAttempts = 100;

      const interval = setInterval(() => {
        attempts++;

        const titleField = this.findTitleField();
        const bodyField = this.findBodyField();

        if (titleField && bodyField) {
          clearInterval(interval);
          console.log('🎉 Form found!');

          setTimeout(() => {
            this.populateFields(titleField, bodyField, ticketData);
            this.showNotification('✅ Template loaded!', 'success');
          }, 500);

        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error('❌ Timeout waiting for form');
          this.showNotification('⚠️ Auto-fill failed', 'error');
        }
      }, 200);
    }

    findTitleField() {
      const selectors = [
        'input[name="title"]',
        'input[name="subject"]',
        'input[data-attribute-name="title"]'
      ];

      for (const sel of selectors) {
        const field = document.querySelector(sel);
        if (field && field.offsetParent !== null) {
          return field;
        }
      }
      return null;
    }

    findBodyField() {
      const selectors = [
        'div[data-name="body"][contenteditable="true"]',
        '[data-name="body"]',
        'textarea[name="body"]'
      ];

      for (const sel of selectors) {
        const field = document.querySelector(sel);
        if (field && field.offsetParent !== null) {
          return field;
        }
      }
      return null;
    }

    populateFields(titleField, bodyField, ticketData) {
      titleField.value = ticketData.title;
      this.triggerAllEvents(titleField);
      titleField.focus();
      setTimeout(() => titleField.blur(), 100);

      if (bodyField.contentEditable === 'true' || bodyField.isContentEditable) {
        const lines = ticketData.body.split('\n');
        const html = lines.map(line =>
          line.trim() === '' ? '<div><br></div>' : `<div>${this.escapeHtml(line)}</div>`
        ).join('');
        bodyField.innerHTML = html;
      } else {
        bodyField.value = ticketData.body;
      }

      this.triggerAllEvents(bodyField);
      bodyField.focus();
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    triggerAllEvents(el) {
      ['input', 'change', 'keyup', 'blur'].forEach(evt => {
        el.dispatchEvent(new Event(evt, { bubbles: true }));
      });

      if (window.$) {
        try { $(el).trigger('change'); } catch (e) {}
      }
    }

    showNotification(message, type = 'success') {
      const colors = { success: '#4caf50', warning: '#ff9800', error: '#f44336' };
      const notif = document.createElement('div');
      notif.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${colors[type]}; color: white;
        padding: 16px 24px; border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999; font-size: 14px; font-weight: 600;
      `;
      notif.textContent = message;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 4000);
    }
  }

  // ============================================
  // INITIALIZE
  // ============================================
  async function init() {
    console.log('🎬 Template Launcher Initializing...');

    // Register default categories (for backward compatibility)
    window.registerTemplateCategory('vpn', {
      id: 'vpn',
      name: 'VPN Services',
      icon: '🔒',
      description: 'VPN access and connectivity issues'
    });

    window.registerTemplateCategory('email', {
      id: 'email',
      name: 'Email Services',
      icon: '📧',
      description: 'Email accounts and configurations'
    });

    // 🔥 AUTO-LOAD categories and templates from Admin Builder
    await loadCategoriesFromAdminBuilder();

    window.TemplateManager = new TicketTemplateManager();
    console.log('✅ Template Launcher Ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();