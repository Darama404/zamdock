// File: /opt/zammad/app/assets/javascripts/custom/preupload-guard.js
// Preupload Guard for Attachments - V2.23

(function () {
  'use strict';

  // CONFIG
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const BLOCKED_EXT = ['exe','bat','cmd','msi','dll','sh','ps1','vbs','com','scr','apk'];

  if (window.__preupload_guard_initialized) {
    console.log('[Preupload Guard] Already initialized');
    return;
  }
  window.__preupload_guard_initialized = true;

  let pendingUpload = null;

  /* ============================================
     ERROR MODAL FOR INVALID FILES
     ============================================ */

  function showInvalidFilesError(filesArr) {
    const invalidFiles = filesArr.filter(f => !f.valid);
    
    if (invalidFiles.length === 0) return;

    const errorModal = document.createElement('div');
    errorModal.id = 'invalid-files-error-modal';
    errorModal.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      background: rgba(0,0,0,0.7);
    `;

    const errorDialog = document.createElement('div');
    errorDialog.style.cssText = `
      background: #2c2e35;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    `;

    let filesList = '';
    invalidFiles.forEach(f => {
      filesList += `
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #4a3f3f;
          border-left: 4px solid #e74c3c;
          border-radius: 4px;
          margin-bottom: 8px;
        ">
          <div style="font-size: 24px;">❌</div>
          <div style="flex: 1;">
            <div style="color: #fff; font-weight: 500; font-size: 13px;">${escapeHtml(f.file.name)}</div>
            <div style="color: #ff6b6b; font-size: 12px;">${f.error}</div>
          </div>
        </div>
      `;
    });

    errorDialog.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="font-size: 48px;">🚫</div>
        <div>
          <h2 style="margin: 0; color: #ff6b6b; font-size: 20px;">Upload Blocked</h2>
          <p style="margin: 4px 0 0 0; color: #999; font-size: 13px;">
            ${invalidFiles.length} file(s) cannot be uploaded
          </p>
        </div>
      </div>

      <div style="
        background: #353740;
        border: 1px solid #3f424e;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
      ">
        <strong style="color: #fff; font-size: 14px; display: block; margin-bottom: 8px;">
          Blocked Files:
        </strong>
        ${filesList}
      </div>

      <div style="
        background: #1e3a5f;
        border: 1px solid #2b7cff;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 12px;
        color: #a0c4e8;
      ">
        <strong style="color: #fff; display: block; margin-bottom: 4px;">💡 Upload Rules:</strong>
        • Maximum file size: 10 MB per file<br>
        • Blocked file types: exe, bat, cmd, msi, dll, sh, ps1, vbs, com, scr, apk
      </div>

      <button id="close-error-modal" style="
        width: 100%;
        padding: 12px;
        background: #2b7cff;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">
        OK, I Understand
      </button>
    `;

    errorModal.appendChild(errorDialog);

    errorDialog.querySelector('#close-error-modal').onclick = () => {
      errorModal.remove();
    };

    errorModal.onclick = (e) => {
      if (e.target === errorModal) {
        errorModal.remove();
      }
    };

    document.body.appendChild(errorModal);
  }

  /* ============================================
     UTILITY FUNCTIONS
     ============================================ */

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ============================================
     DRAFT FILE DETECTION & MANAGEMENT
     ============================================ */

  function getCurrentTicketId() {
    const urlMatch = window.location.pathname.match(/\/ticket\/zoom\/(\d+)/) ||
                    window.location.hash.match(/#ticket\/zoom\/(\d+)/);
    
    if (urlMatch) {
      return parseInt(urlMatch[1]);
    }
    
    const formInput = document.querySelector('input[name="ticket_id"]');
    if (formInput && formInput.value) {
      return parseInt(formInput.value);
    }
    
    const form = document.querySelector('.articleNew, .article-add');
    if (form && form.dataset.ticketId) {
      return parseInt(form.dataset.ticketId);
    }
    
    return null;
  }

  function getActiveComposer() {
    let composer = null;
    
    // Context 1: New ticket creation
    composer = document.querySelector('.ticket-create, .newTicket');
    if (composer) {
      console.log('[Preupload Guard] Context: New Ticket');
      return composer;
    }
    
    // Context 2: Existing ticket - find ACTIVE composer
    const allComposers = document.querySelectorAll('.article-new, .article-add');
    
    for (const c of allComposers) {
      const hasAttachments = c.querySelector('.attachments .attachment');
      const isVisible = c.offsetParent !== null;
      const hasContent = c.querySelector('textarea, [contenteditable]')?.textContent?.trim().length > 0;
      
      if (hasAttachments || (isVisible && hasContent) || isVisible) {
        composer = c;
        console.log('[Preupload Guard] Context: Active Composer');
        break;
      }
    }
    
    // Fallback
    if (!composer && allComposers.length > 0) {
      for (const c of allComposers) {
        if (c.offsetParent !== null) {
          composer = c;
          break;
        }
      }
    }
    
    if (!composer) {
      composer = document.querySelector('.articleNew, form[name="compose"]');
    }
    
    return composer;
  }

  function getDraftAttachments() {
    const composer = getActiveComposer();
    
    if (!composer) {
      console.log('[Preupload Guard] No composer found');
      return { count: 0, size: 0, files: [] };
    }
    
    const attachmentsContainer = composer.querySelector('.attachments');
    
    if (!attachmentsContainer) {
      console.log('[Preupload Guard] No .attachments container');
      return { count: 0, size: 0, files: [] };
    }
    
    const attachments = attachmentsContainer.querySelectorAll('.attachment');
    console.log(`[Preupload Guard] Found ${attachments.length} draft attachment(s)`);
    
    const draftFiles = [];
    let totalSize = 0;
    
    attachments.forEach((att, index) => {
      const nameEl = att.querySelector('.attachment-name');
      const filename = nameEl ? nameEl.textContent.trim() : 'unknown';
      
      const sizeEl = att.querySelector('.attachment-size');
      const sizeText = sizeEl ? sizeEl.textContent.trim() : '';
      
      let sizeInBytes = 0;
      if (sizeText) {
        const match = sizeText.match(/^([\d.]+)\s*(KB|MB|GB)$/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          
          if (unit === 'KB') {
            sizeInBytes = value * 1024;
          } else if (unit === 'MB') {
            sizeInBytes = value * 1024 * 1024;
          } else if (unit === 'GB') {
            sizeInBytes = value * 1024 * 1024 * 1024;
          }
        }
      }
      
      const deleteBtn = att.querySelector('.attachment-delete, .js-delete');
      const attachmentId = deleteBtn ? deleteBtn.dataset.id : null;
      
      if (sizeInBytes > 0 && attachmentId) {
        draftFiles.push({
          id: attachmentId,
          filename: filename,
          size: sizeInBytes,
          element: att,
          deleteButton: deleteBtn
        });
        totalSize += sizeInBytes;
        console.log(`[Preupload Guard] ✓ Draft #${index + 1}: "${filename}" (${formatBytes(sizeInBytes)}, ID: ${attachmentId})`);
      }
    });
    
    console.log(`[Preupload Guard] 📊 Total Draft: ${draftFiles.length} files, ${formatBytes(totalSize)}`);
    return { count: draftFiles.length, size: totalSize, files: draftFiles };
  }

  function deleteDraftFile(fileId) {
    console.log('[Preupload Guard] Attempting to delete draft file:', fileId);
    
    const drafts = getDraftAttachments();
    const fileToDelete = drafts.files.find(f => f.id === fileId);
    
    if (!fileToDelete) {
      console.error('[Preupload Guard] File not found:', fileId);
      return false;
    }
    
    // Click the delete button in Zammad's UI
    if (fileToDelete.deleteButton) {
      console.log('[Preupload Guard] Clicking delete button for:', fileToDelete.filename);
      fileToDelete.deleteButton.click();
      
      // Wait a bit for DOM to update, then refresh modal
      setTimeout(() => {
        updateModalContent();
      }, 300);
      
      return true;
    }
    
    console.error('[Preupload Guard] Delete button not found');
    return false;
  }

  function clearAllDrafts() {
    const drafts = getDraftAttachments();
    
    if (drafts.files.length === 0) {
      return;
    }
    
    console.log('[Preupload Guard] Clearing all drafts:', drafts.files.length);
    
    drafts.files.forEach(file => {
      if (file.deleteButton) {
        file.deleteButton.click();
      }
    });
    
    setTimeout(() => {
      updateModalContent();
    }, 500);
  }

  /* ============================================
     QUOTA FETCHING
     ============================================ */

  async function fetchQuota(ticketId) {
    let draftAttachments = getDraftAttachments();
    
    if (draftAttachments.count === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      draftAttachments = getDraftAttachments();
    }
    
    if (draftAttachments.count === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      draftAttachments = getDraftAttachments();
    }
    
    console.log('[Preupload Guard] ✓ Draft detection complete');

    if (!ticketId) {
      console.log('[Preupload Guard] No ticket ID. Quota based on draft only.');
      return {
        limits: { max_count: 5, max_size: MAX_FILE_SIZE }, 
        existing: draftAttachments,
        source: 'DRAFT_ONLY'
      };
    }
    
    try {
      console.log('[Preupload Guard] Fetching committed quota for ticket', ticketId);
      
      const response = await fetch(`/api/v1/tickets/${ticketId}/attachment_quota`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('[Preupload Guard] Quota fetch failed:', response.status);
        return {
          limits: { max_count: 5, max_size: MAX_FILE_SIZE }, 
          existing: draftAttachments,
          source: 'API_FAILED_DRAFT_ONLY'
        };
      }
      
      const quota = await response.json();
      
      const originalCount = quota.existing.count;
      const originalSize = quota.existing.size;
      
      quota.existing.count += draftAttachments.count;
      quota.existing.size += draftAttachments.size;
      
      console.log(`[Preupload Guard] 📊 Quota Summary:`);
      console.log(`  - Committed (from API): ${originalCount} files, ${formatBytes(originalSize)}`);
      console.log(`  - Draft (from DOM): ${draftAttachments.count} files, ${formatBytes(draftAttachments.size)}`);
      console.log(`  - TOTAL: ${quota.existing.count} files, ${formatBytes(quota.existing.size)}`);
      
      return quota;
    } catch (error) {
      console.error('[Preupload Guard] Error fetching quota:', error);
      return {
        limits: { max_count: 5, max_size: MAX_FILE_SIZE }, 
        existing: draftAttachments,
        source: 'NETWORK_ERROR_DRAFT_ONLY'
      };
    }
  }

  /* ============================================
     MODAL UI - CLEAN STRUCTURE
     ============================================ */

  const modalId = 'preuploadGuardModal_v11';

  function injectModal() {
    if (document.getElementById(modalId)) return;

    const style = document.createElement('style');
    style.innerHTML = `
      #${modalId} {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }

      #${modalId} .pg-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.55);
      }

      #${modalId} .pg-dialog {
        position: relative;
        width: min(650px, 95%);
        background: #2c2e35;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        max-height: 85vh;
        overflow-y: auto;
      }

      #${modalId} .pg-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #3f424e;
      }

      #${modalId} .pg-title {
        font-weight: 600;
        font-size: 17px;
        color: #ffffff;
      }

      #${modalId} .pg-close-btn {
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 22px;
        padding: 0;
        line-height: 1;
      }

      #${modalId} .pg-close-btn:hover {
        color: #fff;
      }

      #${modalId} .pg-rules {
        background: #353740;
        border: 1px solid #3f424e;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #d7d7d7;
      }

      #${modalId} .pg-rules strong {
        color: #ffffff;
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
      }

      #${modalId} .pg-rules > div {
        margin-top: 8px;
        line-height: 1.8;
      }

      #${modalId} .pg-rules > div > div {
        margin-bottom: 4px;
      }

      #${modalId} .pg-rules > div > div strong {
        display: inline;
        font-size: 13px;
        color: #ffffff;
        margin-bottom: 0;
      }

      /* ADDING SUPPORT Section */
      #${modalId} .pg-adding-support {
        background: #1e3a5f;
        border: 1px solid #2b5a8e;
        border-radius: 6px;
        padding: 14px;
        margin-bottom: 16px;
      }

      #${modalId} .pg-adding-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      #${modalId} .pg-adding-title {
        font-weight: 600;
        font-size: 14px;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      #${modalId} .pg-adding-stats {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #a0c4e8;
      }

      #${modalId} .pg-adding-stat {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      #${modalId} .pg-adding-files {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 250px;
        overflow-y: auto;
      }

      #${modalId} .pg-adding-file-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px;
        background: #2c3e50;
        border: 1px solid #34495e;
        border-radius: 6px;
      }

      #${modalId} .pg-adding-file-item.valid {
        border-left: 4px solid #27ae60;
      }

      #${modalId} .pg-adding-file-item.invalid {
        background: #4a3f3f;
        border-left: 4px solid #e74c3c;
      }

      #${modalId} .pg-adding-file-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }

      #${modalId} .pg-adding-filename {
        color: #ffffff;
        font-size: 13px;
        font-weight: 500;
        word-break: break-word;
      }

      #${modalId} .pg-adding-filesize {
        font-size: 12px;
        color: #95a5a6;
      }

      #${modalId} .pg-adding-file-item.invalid .pg-adding-filesize {
        color: #e74c3c;
      }

      #${modalId} .pg-adding-file-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 18px;
      }

      #${modalId} .pg-adding-empty {
        color: #7f8c8d;
        text-align: center;
        padding: 20px;
        font-size: 13px;
      }

      /* DRAFT FILES Section */
      #${modalId} .pg-draft-section {
        background: #353740;
        border: 1px solid #3f424e;
        border-radius: 6px;
        padding: 14px;
        margin-bottom: 16px;
      }

      #${modalId} .pg-draft-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      #${modalId} .pg-draft-title {
        font-weight: 600;
        font-size: 14px;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${modalId} .pg-draft-badge {
        background: #2b7cff;
        color: #fff;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      #${modalId} .pg-draft-empty {
        color: #7f8c8d;
        text-align: center;
        padding: 16px;
        font-size: 13px;
      }

      #${modalId} .pg-draft-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 220px;
        overflow-y: auto;
      }

      #${modalId} .pg-draft-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px;
        background: #2c2e35;
        border: 1px solid #3f424e;
        border-left: 3px solid #95a5a6;
        border-radius: 6px;
      }

      #${modalId} .pg-draft-item-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }

      #${modalId} .pg-draft-filename {
        color: #ffffff;
        font-size: 13px;
        font-weight: 500;
        word-break: break-word;
      }

      #${modalId} .pg-draft-size {
        font-size: 11px;
        color: #95a5a6;
      }

      #${modalId} .pg-delete-btn {
        background: #e74c3c;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background 200ms;
        white-space: nowrap;
      }

      #${modalId} .pg-delete-btn:hover {
        background: #c0392b;
      }

      #${modalId} .pg-delete-btn.deleting {
        opacity: 0.6;
        cursor: not-allowed;
      }

      #${modalId} .pg-clear-all-btn {
        background: #c0392b;
        color: #fff;
        border: none;
        padding: 7px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        width: 100%;
        margin-top: 10px;
        transition: background 200ms;
      }

      #${modalId} .pg-clear-all-btn:hover {
        background: #a93226;
      }

      /* Footer */
      #${modalId} .pg-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #3f424e;
      }

      #${modalId} .pg-btn {
        padding: 9px 16px;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        font-size: 14px;
        font-weight: 500;
        transition: all 200ms;
      }

      #${modalId} .pg-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      #${modalId} .pg-btn-primary {
        background: #2b7cff;
        color: #fff;
      }

      #${modalId} .pg-btn-primary:hover:not(.disabled) {
        background: #1e5bd8;
      }

      #${modalId} .pg-btn-cancel {
        background: #3b3e47;
        color: #ececec;
      }

      #${modalId} .pg-btn-cancel:hover {
        background: #4a4d56;
      }

      /* Scrollbar */
      #${modalId} .pg-adding-files::-webkit-scrollbar,
      #${modalId} .pg-draft-list::-webkit-scrollbar,
      #${modalId} .pg-dialog::-webkit-scrollbar {
        width: 6px;
      }

      #${modalId} .pg-adding-files::-webkit-scrollbar-track,
      #${modalId} .pg-draft-list::-webkit-scrollbar-track,
      #${modalId} .pg-dialog::-webkit-scrollbar-track {
        background: #2c2e35;
      }

      #${modalId} .pg-adding-files::-webkit-scrollbar-thumb,
      #${modalId} .pg-draft-list::-webkit-scrollbar-thumb,
      #${modalId} .pg-dialog::-webkit-scrollbar-thumb {
        background: #3f424e;
        border-radius: 3px;
      }

      #${modalId} .pg-adding-files::-webkit-scrollbar-thumb:hover,
      #${modalId} .pg-draft-list::-webkit-scrollbar-thumb:hover,
      #${modalId} .pg-dialog::-webkit-scrollbar-thumb:hover {
        background: #4a4d56;
      }

      /* Responsive */
      @media (max-width: 600px) {
        #${modalId} .pg-dialog {
          width: 95%;
          max-height: 90vh;
        }
        #${modalId} .pg-adding-file-item,
        #${modalId} .pg-draft-item {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.innerHTML = `
      <div class="pg-backdrop"></div>
      <div class="pg-dialog">
        <div class="pg-header">
          <div class="pg-title">📎 Attachment Guard</div>
          <button class="pg-close-btn" data-action="close">✕</button>
        </div>

        <div class="pg-rules">
          <strong>Upload Rules:</strong>
          <div style="margin-top: 8px; line-height: 1.8;">
            <div><strong>Maximum file size:</strong> 10 MB per file</div>
            <div><strong>Maximum files:</strong> 5 files</div>
            <div><strong>Restricted file types:</strong> exe, bat, cmd, msi, dll, sh, ps1, vbs, com, scr, apk</div>
          </div>
        </div>

        <!-- ADDING SUPPORT Section -->
        <div class="pg-adding-support">
          <div class="pg-adding-header">
            <div class="pg-adding-title">📤 Adding Support</div>
            <div class="pg-adding-stats">
              <div class="pg-adding-stat">
                <span>💾 Size:</span>
                <span id="pg-adding-size">0 MB / 10 MB</span>
              </div>
              <div class="pg-adding-stat">
                <span>📍 After:</span>
                <span id="pg-after-upload">0/5</span>
              </div>
            </div>
          </div>
          <div id="pg-adding-files-container" class="pg-adding-files"></div>
        </div>

        <!-- DRAFT FILES Section -->
        <div class="pg-draft-section">
          <div class="pg-draft-header">
            <div class="pg-draft-title">
              <span>📋 Draft Files</span>
              <span class="pg-draft-badge" id="pg-draft-count">0</span>
            </div>
          </div>
          <div id="pg-draft-container"></div>
        </div>

        <div class="pg-footer">
          <button class="pg-btn pg-btn-cancel" data-action="cancel">Cancel</button>
          <button class="pg-btn pg-btn-primary" id="pg-submit-btn" data-action="submit">Send to Helpdesk</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function showModal() {
    injectModal();
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    attachModalHandlers();
    updateModalContent();
  }

  function closeModal() {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
    pendingUpload = null;
  }

  function updateModalContent() {
    const drafts = getDraftAttachments();
    
    // Update draft count badge
    const draftBadge = document.getElementById('pg-draft-count');
    if (draftBadge) {
      draftBadge.textContent = drafts.count;
    }

    // Update draft list
    const draftContainer = document.getElementById('pg-draft-container');
    if (draftContainer) {
      if (drafts.files.length === 0) {
        draftContainer.innerHTML = '<div class="pg-draft-empty">No draft files in Zammad yet</div>';
      } else {
        let html = '<div class="pg-draft-list">';
        drafts.files.forEach(file => {
          html += `
            <div class="pg-draft-item">
              <div class="pg-draft-item-info">
                <div class="pg-draft-filename">${escapeHtml(file.filename)}</div>
                <div class="pg-draft-size">${formatBytes(file.size)}</div>
              </div>
              <button class="pg-delete-btn" data-draft-id="${file.id}">
                🗑️ Delete
              </button>
            </div>
          `;
        });
        
        if (drafts.files.length > 1) {
          html += '<button class="pg-clear-all-btn" data-action="clear-all">Clear All Draft Files</button>';
        }
        
        html += '</div>';
        draftContainer.innerHTML = html;
        
        // Attach delete handlers
        draftContainer.querySelectorAll('.pg-delete-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const fileId = this.getAttribute('data-draft-id');
            if (fileId) {
              this.classList.add('deleting');
              this.textContent = 'Deleting...';
              deleteDraftFile(fileId);
            }
          });
        });
        
        const clearAllBtn = draftContainer.querySelector('[data-action="clear-all"]');
        if (clearAllBtn) {
          clearAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL draft files? This cannot be undone.')) {
              clearAllDrafts();
            }
          });
        }
      }
    }

    // UPDATE: Bagian Real-time Calculation yang Anda minta
    if (pendingUpload && pendingUpload.validationResult) {
        const result = pendingUpload.validationResult;
    
        // REAL-TIME CALCULATION
        const currentDrafts = getDraftAttachments();
        const newFilesSize = result.stats.new.size;
        const totalSizeAfterUpload = currentDrafts.size + newFilesSize;
        const totalFilesAfterUpload = currentDrafts.count + result.stats.new.count;
    
        const maxSizeMB = (result.quota.limits.max_size / 1024 / 1024).toFixed(0);
        const maxFiles = result.quota.limits.max_count;
    
        const addingSize = document.getElementById('pg-adding-size');
        if (addingSize) {
        const totalSizeMB = (totalSizeAfterUpload / 1024 / 1024).toFixed(2);
        const sizeExceeded = totalSizeAfterUpload > result.quota.limits.max_size;
      
        addingSize.innerHTML = `<span style="color: ${sizeExceeded ? '#e74c3c' : '#27ae60'}">${totalSizeMB} MB</span> <span style="color: #7f8c8d">/ ${maxSizeMB} MB</span>`;
        }
    
        const afterUpload = document.getElementById('pg-after-upload');
        if (afterUpload) {
        const filesExceeded = totalFilesAfterUpload > maxFiles;
        const leftFiles = Math.max(maxFiles - totalFilesAfterUpload, 0);
      
        afterUpload.innerHTML = `<span style="color: ${filesExceeded ? '#e74c3c' : '#27ae60'}">${totalFilesAfterUpload}/${maxFiles}</span> <span style="color: #7f8c8d">(${leftFiles} left)</span>`;
        }
    
        const canUpload = totalSizeAfterUpload <= result.quota.limits.max_size && 
                          totalFilesAfterUpload <= maxFiles &&
                          result.files.some(f => f.valid);
        
        updateUploadBtnState(result.files, canUpload);
    }
  }

  function renderAddingFiles(filesArr) {
    const container = document.getElementById('pg-adding-files-container');
    if (!container) return;
    
    if (filesArr.length === 0) {
      container.innerHTML = '<div class="pg-adding-empty">No files selected</div>';
      return;
    }

    container.innerHTML = '';

    // Count valid and invalid
    const validCount = filesArr.filter(f => f.valid).length;
    const invalidCount = filesArr.filter(f => !f.valid).length;

    // Show warning if there are invalid files
    if (invalidCount > 0) {
      const warning = document.createElement('div');
      warning.style.cssText = `
        background: #4a3f3f; border: 1px solid #e74c3c;
        border-radius: 6px; padding: 12px; margin-bottom: 12px;
        color: #ff6b6b; font-size: 13px; font-weight: 500;
      `;
      warning.innerHTML = `
        ⚠️ <strong>${invalidCount} file(s) blocked</strong> - These files cannot be uploaded due to security restrictions.
      `;
      container.appendChild(warning);
    }

    filesArr.forEach((obj) => {
      const file = obj.file;
      const wrapper = document.createElement('div');
      wrapper.className = 'pg-adding-file-item ' + (obj.valid ? 'valid' : 'invalid');

      wrapper.innerHTML = `
        <div class="pg-adding-file-info">
          <div class="pg-adding-filename">${escapeHtml(file.name)}</div>
          <div class="pg-adding-filesize">${obj.valid ? formatBytes(file.size) : obj.error}</div>
        </div>
        <div class="pg-adding-file-status">
          ${obj.valid ? '✅' : '❌'}
        </div>
      `;

      container.appendChild(wrapper);
    });
  }

  function updateUploadBtnState(filesArr, canUpload) {
    const submitBtn = document.getElementById('pg-submit-btn');
    if (!submitBtn) return;
    
    const haveValid = filesArr.some(f => f.valid);
    
    if (haveValid && canUpload) {
      submitBtn.classList.remove('disabled');
    } else {
      submitBtn.classList.add('disabled');
    }
  }

  function attachModalHandlers() {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const backdrop = modal.querySelector('.pg-backdrop');
    const closeBtn = modal.querySelector('[data-action="close"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const submitBtn = modal.querySelector('[data-action="submit"]');
    
    const handleClose = () => {
      const rejectFunc = pendingUpload && pendingUpload.reject;
      closeModal();
      if (rejectFunc) rejectFunc();
    };
    
    if (backdrop) {
      backdrop.replaceWith(backdrop.cloneNode(true));
      modal.querySelector('.pg-backdrop').addEventListener('click', handleClose);
    }
    
    if (closeBtn) {
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      modal.querySelector('[data-action="close"]').addEventListener('click', handleClose);
    }
    
    if (cancelBtn) {
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      modal.querySelector('[data-action="cancel"]').addEventListener('click', handleClose);
    }
    
    if (submitBtn) {
      submitBtn.replaceWith(submitBtn.cloneNode(true));
      modal.querySelector('[data-action="submit"]').addEventListener('click', function() {
        if (!this.classList.contains('disabled')) {
          const approveFunc = pendingUpload && pendingUpload.approve;
          closeModal();
          if (approveFunc) approveFunc();
        }
      });
    }
  }

  /* ============================================
     FILE VALIDATION
     ============================================ */

  function fileExt(name) {
    const p = name.split('.');
    return p.length > 1 ? p[p.length-1].toLowerCase() : '';
  }

  function validateFile(file) {
    if (!file) return { valid: false, error: 'No file detected' };
    if (file.size === 0) return { valid: false, error: 'Empty file (0 bytes)' };
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `Too Big (${formatBytes(file.size)})` };
    }
    const ext = fileExt(file.name);
    if (BLOCKED_EXT.indexOf(ext) !== -1) {
      return { valid: false, error: `Blocked extension .${ext}` };
    }
    return { valid: true };
  }

  function validateWithQuota(files, quota) {
    const result = {
      files: [],
      quota: quota,
      errors: [],
      canProceed: true
    };
    
    const validatedFiles = files.map(f => {
      const v = validateFile(f);
      return { file: f, valid: v.valid, error: v.error };
    });
    
    result.files = validatedFiles;
    const validFiles = validatedFiles.filter(f => f.valid);
    
    if (!quota) {
      result.canProceed = validFiles.length > 0;
      return result;
    }
    
    if (validFiles.length === 0) {
      result.canProceed = false;
      return result;
    }
    
    const newCount = validFiles.length;
    const newSize = validFiles.reduce((sum, f) => sum + f.file.size, 0);
    const afterCount = quota.existing.count + newCount;
    const afterSize = quota.existing.size + newSize;
    
    if (afterCount > quota.limits.max_count) {
      result.canProceed = false;
      const excess = afterCount - quota.limits.max_count;
      result.errors.push({
        type: 'count',
        message: `Would exceed file limit`,
        details: `Currently ${quota.existing.count} files. Adding ${newCount} would total ${afterCount} (max ${quota.limits.max_count})`,
        suggestion: `Remove ${excess} file(s) to proceed`
      });
    }
    
    if (afterSize > quota.limits.max_size) {
      result.canProceed = false;
      const excessMB = ((afterSize - quota.limits.max_size) / 1024 / 1024).toFixed(2);
      result.errors.push({
        type: 'size',
        message: `Would exceed size limit`,
        details: `Currently ${formatBytes(quota.existing.size)}. Adding ${formatBytes(newSize)} would total ${formatBytes(afterSize)} (max ${formatBytes(quota.limits.max_size)})`,
        suggestion: `Remove ${excessMB} MB of files to proceed`
      });
    }
    
    result.stats = {
      existing: { count: quota.existing.count, size: quota.existing.size },
      new: { count: newCount, size: newSize },
      after: { count: afterCount, size: afterSize },
      remaining: {
        count: Math.max(quota.limits.max_count - afterCount, 0),
        size: Math.max(quota.limits.max_size - afterSize, 0)
      }
    };
    
    return result;
  }

  /* ============================================
     XHR INTERCEPTION
     ============================================ */

  function extractFilesFromFormData(formData) {
    const files = [];
    try {
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          files.push(value);
        }
      }
    } catch (e) {
      console.warn('[Preupload Guard] Could not iterate FormData:', e);
    }
    return files;
  }

  function interceptXHR() {
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalSend = OriginalXHR.prototype.send;
    const OriginalOpen = OriginalXHR.prototype.open;

    OriginalXHR.prototype.open = function(method, url) {
      this._method = method;
      this._url = url;
      return OriginalOpen.apply(this, arguments);
    };

    OriginalXHR.prototype.send = function(data) {
      const xhr = this;

      console.log('[Preupload Guard] XHR send:', xhr._method, xhr._url);

      if (data instanceof FormData) {
        console.log('[Preupload Guard] FormData detected in XHR');
        const files = extractFilesFromFormData(data);
        console.log('[Preupload Guard] Extracted', files.length, 'file(s)');

        if (files.length > 0) {
          console.log('[Preupload Guard] Intercepting upload');

          const uploadContext = {
            xhr: xhr,
            data: data,
            validated: null,
            validationResult: null,
            canUpload: true
          };

          uploadContext.approve = function() {
            console.log('[Preupload Guard] ✅ APPROVE CALLED');
            
            const validFiles = uploadContext.validationResult 
              ? uploadContext.validationResult.files.filter(v => v.valid).map(v => v.file)
              : files;

            if (validFiles.length === 0) {
              console.log('[Preupload Guard] No valid files, aborting');
              xhr.abort();
              return;
            }

            const newFormData = new FormData();
            let fileKey = null;

            try {
              for (const [key, value] of data.entries()) {
                if (!(value instanceof File)) {
                  newFormData.append(key, value);
                } else if (fileKey === null) { 
                  fileKey = key; 
                }
              }
              
              if (fileKey === null) {
                console.warn('[Preupload Guard] Could not detect file key. Using default "file".');
                fileKey = 'file';
              }

              validFiles.forEach(file => {
                newFormData.append(fileKey, file, file.name); 
              });

            } catch (e) {
              console.error('[Preupload Guard] Error rebuilding FormData:', e);
              xhr.abort();
              return;
            }

            console.log('[Preupload Guard] Proceeding with upload (Key: ' + fileKey + ', Valid files: ' + validFiles.length + ')');
            OriginalSend.call(xhr, newFormData);
          };

          uploadContext.reject = function() {
            console.log('[Preupload Guard] ❌ REJECT CALLED: User cancelled or invalid files');
            
            try {
              // 1. Abort XHR secara paksa
              xhr.abort();
              
              // 2. Kirim sinyal manual bahwa request telah selesai.
              // Ini penting agar Zammad membersihkan antrean internalnya.
              xhr.dispatchEvent(new Event('abort'));
              xhr.dispatchEvent(new Event('loadend'));
              
              // 3. Reset state global agar bisa digunakan kembali untuk upload berikutnya
              pendingUpload = null;

              console.log('[Preupload Guard] ✓ XHR Aborted and Queue Cleared');
              
            } catch (e) {
              console.warn('[Preupload Guard] Error during rejection:', e);
              
              // Fallback: Pastikan minimal abort terjadi
              try {
                xhr.abort();
              } catch (abortError) {
                console.error('[Preupload Guard] Could not abort XHR:', abortError);
              }
            }
          };

          (async function() {
            const ticketId = getCurrentTicketId();
            const quota = await fetchQuota(ticketId);
            const validationResult = validateWithQuota(files, quota);
              
            uploadContext.validationResult = validationResult;
            uploadContext.canUpload = validationResult.canProceed;
            
            console.log('[Preupload Guard] Validation complete, canUpload:', validationResult.canProceed);
            
            // Check if ALL files are invalid
            const hasAnyValidFile = validationResult.files.some(f => f.valid);
            
            if (!hasAnyValidFile) {
              console.log('[Preupload Guard] ⚠️ No valid files detected - showing warning');
              
              // Show error modal instead of upload modal
              showInvalidFilesError(validationResult.files);
              
              // Reject the upload
              uploadContext.reject();

              pendingUpload = null;
              return;
            }
            
            pendingUpload = uploadContext;
            showModal();
            renderAddingFiles(validationResult.files);
            updateUploadBtnState(validationResult.files, validationResult.canProceed);
            updateModalContent();
          })();

          return;
        }
      }

      OriginalSend.call(this, data);
    };

    console.log('[Preupload Guard] XHR interceptor installed');
  }

  /* ============================================
     DRAFT MONITOR
     ============================================ */

  function startDraftMonitor() {
    const targetNode = document.body;
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-id', 'data-size']
    };

    const callback = function(mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.dataset && node.dataset.id) {
              console.log('[Preupload Guard] 🔔 New attachment detected:', node.dataset.filename || node.dataset.id);
              
              // Update modal if it's open
              const modal = document.getElementById(modalId);
              if (modal && modal.style.display === 'flex') {
                setTimeout(() => updateModalContent(), 300);
              }
            }
          });
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log('[Preupload Guard] DOM monitor started');
  }

  /* ============================================
     GLOBAL API
     ============================================ */

  window.__preuploadGuard = {
    showModal: showModal,
    updateModalContent: updateModalContent,
    getDrafts: getDraftAttachments,
    deleteDraft: deleteDraftFile,
    clearAllDrafts: clearAllDrafts,
    formatBytes: formatBytes
  };

  /* ============================================
     INITIALIZATION
     ============================================ */

  function init() {
    console.log('[Preupload Guard] Initializing...');
    injectModal();
    interceptXHR();
    startDraftMonitor();
    console.log('[Preupload Guard] ✓ Ready - Clean Version with Draft Preview');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

//v2 done 