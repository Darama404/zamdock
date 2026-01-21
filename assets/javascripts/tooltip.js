// File: /opt/zammad/app/assets/javascripts/custom/tooltip.js
// Attachment Rules Tooltip - V1.18

(function () {
  'use strict';

  if (window.__attachment_rules_tooltip_initialized) {
    console.log('[Attachment Rules] Already initialized');
    return;
  }
  window.__attachment_rules_tooltip_initialized = true;

  // CONFIG - Match preupload guard rules
  const RULES = {
    maxSize: '10 MB',
    maxFiles: 5,
    blockedExtensions: ['exe', 'bat', 'cmd', 'msi', 'dll', 'sh', 'ps1', 'vbs', 'com', 'scr', 'apk']
  };

  /* ------------------------------
     Inject Styles
     ------------------------------ */
  function injectStyles() {
    if (document.getElementById('attachment-rules-styles')) return;

    const style = document.createElement('style');
    style.id = 'attachment-rules-styles';
    style.innerHTML = `
/* Attachment Rules Tooltip - ZAMMAD THEMED */

/* Add spacing before "select attachment" */
.attachmentPlaceholder-label::before {
  content: '';
  display: inline-block;
  width: 1px;
}

.attachment-rules-wrapper {
  position: relative;
  display: inline-block;
  margin-left: 7px;
  vertical-align: middle;
  white-space: nowrap; /* Prevent wrapping */
}

/* Icon - Match Zammad's blue accent */
.attachment-rules-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b96d5;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0; /* Don't shrink icon */
}

.attachment-rules-icon:hover {
  background: #2d7ab3;
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(59, 150, 213, 0.4);
}

/* Tooltip Container - Match Zammad's dark modal style */
.attachment-rules-tooltip {
  min-width: 340px;
  max-width: 380px;
  background: #2b2d31;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border: 1px solid #3f4246;
}

/* Header - Match "Attachment Guard" header style */
.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #35373c;
  border-bottom: 1px solid #3f4246;
}

.tooltip-icon {
  font-size: 16px;
}

.tooltip-title {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.2px;
}

/* Content Area - Dark background like modal */
.tooltip-content {
  padding: 14px 16px;
  background: #2b2d31;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 9px 0;
  gap: 12px;
}

.rule-item:not(:last-child) {
  border-bottom: 1px solid #3f4246;
}

.rule-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
  flex-shrink: 0;
}

.rule-value {
  font-size: 13px;
  color: #e5e7eb;
  font-weight: 500;
  text-align: right;
}

/* Blocked Section - Match red/warning style */
.tooltip-blocked {
  padding: 12px 16px;
  background: #2b2d31;
  border-top: 1px solid #3f4246;
}

.blocked-label {
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.blocked-list {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.6;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  background: rgba(239, 68, 68, 0.1);
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Arrow - Will be positioned dynamically */
.attachment-rules-tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
}

/* Arrow pointing up (tooltip below icon) */
.attachment-rules-tooltip.arrow-top::after {
  bottom: 100%;
  border-bottom-color: #3f4246;
}

/* Arrow pointing down (tooltip above icon) */
.attachment-rules-tooltip.arrow-bottom::after {
  top: 100%;
  border-top-color: #3f4246;
}

/* Ensure parent containers don't clip */
.article-attachment {
  overflow: visible !important;
}

.attachmentPlaceholder {
  overflow: visible !important;
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* Prevent wrapping to new line */
  gap: 4px;
}

/* Responsive: Ensure icon stays inline on small screens */
@media (max-width: 768px) {
  .attachment-rules-wrapper {
    margin-left: 8px;
  }
  
  .attachment-rules-tooltip {
    min-width: 280px;
    max-width: calc(100vw - 20px);
  }
}
    `;
    document.head.appendChild(style);
    console.log('[Attachment Rules] ✓ Styles injected');
  }

  /* ------------------------------
     Create Tooltip HTML
     ------------------------------ */
  function createTooltipHTML() {
    return `
      <div class="attachment-rules-wrapper">
        <div class="attachment-rules-icon" title="Click to see upload rules">?</div>
        <div class="attachment-rules-tooltip" style="display: none;">
          <div class="tooltip-header">
            <span class="tooltip-icon">📎</span>
            <span class="tooltip-title">Upload Rules</span>
          </div>
          <div class="tooltip-content">
            <div class="rule-item">
              <div class="rule-label">Maximum file size</div>
              <div class="rule-value">${RULES.maxSize} per file</div>
            </div>
            <div class="rule-item">
              <div class="rule-label">Maximum files</div>
              <div class="rule-value">${RULES.maxFiles} attachments total</div>
            </div>
            <div class="rule-item">
              <div class="rule-label">Validation</div>
              <div class="rule-value">Files checked before upload</div>
            </div>
          </div>
          <div class="tooltip-blocked">
            <div class="blocked-label">🚫 Blocked Extensions</div>
            <div class="blocked-list">${RULES.blockedExtensions.join(', ')}</div>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------
     Show/Hide Functions
     ------------------------------ */
  function showTooltip(tooltip, icon) {
    console.log('[Attachment Rules] 🔵 ========== SHOWING TOOLTIP ==========');

    // Close all other tooltips
    document.querySelectorAll('.attachment-rules-tooltip').forEach(function(t) {
      if (t !== tooltip) {
        t.style.cssText = 'display: none !important;';
      }
    });

    // CRITICAL: Move tooltip to body to escape any parent positioning context
    if (tooltip.parentElement !== document.body) {
      document.body.appendChild(tooltip);
      console.log('[Attachment Rules] 📦 Moved tooltip to body');
    }

    // Get fresh icon position
    const iconRect = icon.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    console.log('[Attachment Rules] 📊 === VIEWPORT & ICON INFO ===');
    console.log('  Viewport:', viewportWidth, 'x', viewportHeight);
    console.log('  Icon position:', {
      top: Math.round(iconRect.top),
      bottom: Math.round(iconRect.bottom),
      left: Math.round(iconRect.left)
    });
    
    // Calculate available space
    const spaceBelow = viewportHeight - iconRect.bottom;
    const spaceAbove = iconRect.top;
    const minSpaceNeeded = 350; // Tooltip + buffer
    
    console.log('[Attachment Rules] 📏 === SPACE CALCULATION ===');
    console.log('  Space below icon:', Math.round(spaceBelow), 'px');
    console.log('  Space above icon:', Math.round(spaceAbove), 'px');
    console.log('  Min space needed:', minSpaceNeeded, 'px');
    console.log('  Icon near bottom?', iconRect.bottom > viewportHeight - 50);
    
    // Decide position: below or above
    let tooltipTop;
    let arrowClass;
    let positionReason;
    
    // CRITICAL: Multiple checks for best positioning
    if (iconRect.bottom > viewportHeight - 50) {
      // Icon very close to/below viewport bottom - FORCE ABOVE
      tooltipTop = iconRect.top - 300 - 10; // Estimate 300px height
      arrowClass = 'arrow-bottom';
      positionReason = '🔴 FORCED ABOVE - Icon near/below viewport bottom';
      console.log('[Attachment Rules] ⬆️ DECISION:', positionReason);
    } else if (spaceBelow < minSpaceNeeded) {
      // Not enough space below - show above
      tooltipTop = iconRect.top - 300 - 10;
      arrowClass = 'arrow-bottom';
      positionReason = '🟡 ABOVE - Insufficient space below (' + Math.round(spaceBelow) + 'px < ' + minSpaceNeeded + 'px)';
      console.log('[Attachment Rules] ⬆️ DECISION:', positionReason);
    } else {
      // Enough space below - show below
      tooltipTop = iconRect.bottom + 10;
      arrowClass = 'arrow-top';
      positionReason = '🟢 BELOW - Sufficient space (' + Math.round(spaceBelow) + 'px >= ' + minSpaceNeeded + 'px)';
      console.log('[Attachment Rules] ⬇️ DECISION:', positionReason);
    }
    
    // Calculate left position (centered on icon)
    let tooltipLeft = iconRect.left + (iconRect.width / 2);
    
    // Boundary checks
    const tooltipWidth = 340;
    const halfWidth = tooltipWidth / 2;
    
    if (tooltipLeft - halfWidth < 10) {
      tooltipLeft = halfWidth + 10;
    } else if (tooltipLeft + halfWidth > viewportWidth - 10) {
      tooltipLeft = viewportWidth - halfWidth - 10;
    }
    
    // Vertical boundary check
    if (tooltipTop < 10) {
      tooltipTop = 10;
      console.log('[Attachment Rules] 🔧 Adjusted: Too high, clamped to 10px');
    }

    console.log('[Attachment Rules] 🎯 === FINAL CALCULATED POSITION ===');
    console.log('  Top:', Math.round(tooltipTop), 'px');
    console.log('  Left:', Math.round(tooltipLeft), 'px');
    console.log('  Arrow:', arrowClass);

    // Set position with cssText
    tooltip.style.cssText = `
      display: block !important;
      position: fixed !important;
      top: ${tooltipTop}px !important;
      left: ${tooltipLeft}px !important;
      transform: translateX(-50%) !important;
      z-index: 999999 !important;
      opacity: 1 !important;
      visibility: visible !important;
      margin: 0 !important;
    `;
    
    // Set arrow class
    tooltip.classList.remove('arrow-top', 'arrow-bottom');
    tooltip.classList.add(arrowClass);
    
    console.log('[Attachment Rules] ✅ Styles applied, waiting for render...');

    // Verify and auto-correct after render
    setTimeout(function() {
      const rect = tooltip.getBoundingClientRect();
      const actualHeight = rect.height;
      const actualBottom = rect.bottom;
      
      console.log('[Attachment Rules] 🔍 === POST-RENDER VERIFICATION ===');
      console.log('  Actual rect:', {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(actualHeight)
      });
      console.log('  Is clipped at bottom?', rect.bottom > viewportHeight);
      console.log('  Is clipped at top?', rect.top < 0);

      // EMERGENCY FIX: If tooltip is clipped at bottom, reposition above
      if (rect.bottom > viewportHeight && tooltip.classList.contains('arrow-top')) {
        console.error('[Attachment Rules] 🚨 EMERGENCY: Tooltip clipped! Repositioning ABOVE...');
        
        const newTop = iconRect.top - actualHeight - 10;
        tooltip.style.top = newTop + 'px';
        tooltip.classList.remove('arrow-top');
        tooltip.classList.add('arrow-bottom');
        
        console.log('[Attachment Rules] 🔧 Repositioned to:', Math.round(newTop), 'px');
        
        // Final check
        setTimeout(function() {
          const finalRect = tooltip.getBoundingClientRect();
          console.log('[Attachment Rules] ✅ Final position:', {
            top: Math.round(finalRect.top),
            bottom: Math.round(finalRect.bottom),
            clipped: finalRect.bottom > viewportHeight || finalRect.top < 0
          });
        }, 10);
      } else {
        console.log('[Attachment Rules] ✅ Position OK, no adjustment needed');
      }
      
      console.log('[Attachment Rules] 🏁 ========== DONE ==========');
    }, 50);
  }

  function hideTooltip(tooltip) {
    console.log('[Attachment Rules] ❌ Hiding tooltip');
    tooltip.style.cssText = 'display: none !important;';
  }

  function toggleTooltip(tooltip, icon) {
    const isVisible = tooltip.style.display === 'block';

    if (isVisible) {
      hideTooltip(tooltip);
    } else {
      showTooltip(tooltip, icon);
    }
  }

  /* ------------------------------
     Inject Tooltip into DOM
     ------------------------------ */
  function injectTooltip() {
    const placeholders = document.querySelectorAll('.attachmentPlaceholder');

    placeholders.forEach(function(placeholder, index) {
      if (placeholder.querySelector('.attachment-rules-wrapper')) {
        return;
      }

      const label = placeholder.querySelector('.attachmentPlaceholder-label, label');
      if (!label) return;

      label.insertAdjacentHTML('afterend', createTooltipHTML());
      console.log(`[Attachment Rules] Tooltip injected #${index + 1}`);

      const wrapper = placeholder.querySelector('.attachment-rules-wrapper');
      const icon = wrapper.querySelector('.attachment-rules-icon');
      const tooltip = wrapper.querySelector('.attachment-rules-tooltip');

      if (!icon || !tooltip) return;

      let isToggling = false;

      icon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isToggling) return;

        isToggling = true;
        toggleTooltip(tooltip, icon);

        setTimeout(function() {
          isToggling = false;
        }, 300);
      }, true);

      // Close when clicking outside (check both wrapper AND tooltip)
      setTimeout(function() {
        document.addEventListener('click', function(e) {
          if (!wrapper.contains(e.target) && !tooltip.contains(e.target)) {
            if (tooltip.style.display === 'block') {
              hideTooltip(tooltip);
              console.log('[Attachment Rules] 🔄 Closed due to outside click');
            }
          }
        });
      }, 200);

      // Close on scroll
      window.addEventListener('scroll', function() {
        if (tooltip.style.display === 'block') {
          hideTooltip(tooltip);
          console.log('[Attachment Rules] 🔄 Closed due to scroll');
        }
      }, true);

      // Close on resize
      window.addEventListener('resize', function() {
        if (tooltip.style.display === 'block') {
          hideTooltip(tooltip);
          console.log('[Attachment Rules] 🔄 Closed due to resize');
        }
      });

      // Watch for article changes
      const articleContainer = wrapper.closest('.article-content, .textBubble, [class*="article"]');
      if (articleContainer) {
        const articleObserver = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
              if (tooltip.style.display === 'block') {
                hideTooltip(tooltip);
                console.log('[Attachment Rules] 🔄 Closed due to article change');
              }
            }
          });
        });

        articleObserver.observe(articleContainer, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }

      console.log(`[Attachment Rules] ✅ Tooltip #${index + 1} configured`);
    });
  }

  /* ------------------------------
     Watch for new forms
     ------------------------------ */
  function watchForNewForms() {
    const observer = new MutationObserver(function(mutations) {
      let shouldReinject = false;

      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.matches && (
              node.matches('.attachmentPlaceholder') ||
              node.querySelector('.attachmentPlaceholder')
            )) {
              shouldReinject = true;
            }
          }
        });
      });

      if (shouldReinject) {
        console.log('[Attachment Rules] New form detected, re-injecting...');
        setTimeout(injectTooltip, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Attachment Rules] ✓ DOM observer started');
  }

  /* ------------------------------
     Initialize
     ------------------------------ */
  function init() {
    console.log('[Attachment Rules] 🚀 Initializing...');

    injectStyles();
    injectTooltip();

    setTimeout(injectTooltip, 1000);
    setTimeout(injectTooltip, 3000);

    watchForNewForms();

    console.log('[Attachment Rules] ✅ Ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('hashchange', function() {
    console.log('[Attachment Rules] Route changed, re-injecting...');
    setTimeout(injectTooltip, 500);
  });

})();