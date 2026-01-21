// File: app/assets/javascripts/custom/force-public-replies.js
// Force Public Replies - V1.34

(function () {
  'use strict';

  if (window.__force_public_initialized) {
    console.log('[Force Public] Already initialized');
    return;
  }
  window.__force_public_initialized = true;

  console.log('[Force Public] Initializing...');

  /* ------------------------------
     Force article type to PUBLIC
     ------------------------------ */
  function forcePublicArticleType() {
    // Find all article type selectors - expanded selectors
    const selectors = document.querySelectorAll(
      'select[name="article_type"], select[name="articleType"], ' +
      '.js-articleTypes, [name="formSenderType"]'
    );

    selectors.forEach(select => {
      if (select.dataset.forcedPublic) return;
      select.dataset.forcedPublic = 'true';

      // Remove "note" option (internal notes)
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        const val = (option.value || '').toLowerCase();
        const text = (option.textContent || '').toLowerCase();

        if (val === 'note' || text.includes('note') || text.includes('internal')) {
          option.remove();
          console.log('[Force Public] Removed note/internal option:', option.textContent);
        }
      });

      // Force select to email/phone (public types)
      if (select.value === 'note' || select.value === '' || !select.value) {
        const publicOption = select.querySelector(
          'option[value="email"], option[value="phone"], ' +
          'option[value="web"], option:not([value="note"])'
        );
        if (publicOption) {
          select.value = publicOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[Force Public] Forced article type to:', publicOption.value);
        }
      }
    });
  }

  /* ------------------------------
     Force visibility to PUBLIC
     ------------------------------ */
  function forcePublicVisibility() {
    // Expanded selectors for visibility controls
    const visibilityElements = document.querySelectorAll(
      '[name="internal"], [data-attribute-name="internal"], ' +
      '.js-internal, [name="visibility"], ' +
      'input[type="checkbox"][class*="internal"]'
    );

    visibilityElements.forEach(el => {
      if (el.dataset.forcedPublic) return;
      el.dataset.forcedPublic = 'true';

      if (el.type === 'checkbox') {
        // Uncheck "internal" checkbox
        if (el.checked) {
          el.checked = false;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[Force Public] Unchecked internal checkbox');
        }
        // Disable to prevent re-checking
        el.disabled = true;
        el.style.display = 'none';
      } else if (el.tagName === 'SELECT') {
        // Force to public value
        const publicOption = Array.from(el.options).find(opt =>
          opt.value === 'public' || opt.textContent.toLowerCase().includes('public')
        );
        if (publicOption) {
          el.value = publicOption.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[Force Public] Set visibility to public');
        }
      }
    });

    // Also hide visibility containers
    const containers = document.querySelectorAll(
      '.articleNew-visibility, .js-selectableTypes, ' +
      '[data-attribute-name="internal"]'
    );
    containers.forEach(c => {
      c.style.display = 'none';
    });
  }

  /* ------------------------------
     Intercept form submission
     ------------------------------ */
  function interceptFormSubmit() {
    document.addEventListener('submit', function(e) {
      const form = e.target;

      // Check if this is article form
      if (form.classList.contains('articleNew') ||
          form.querySelector('[name="article_type"]') ||
          form.querySelector('[name="articleType"]')) {

        console.log('[Force Public] Intercepting form submission');

        // Force article type to non-note
        const typeInputs = form.querySelectorAll('[name="article_type"], [name="articleType"], [name="formSenderType"]');
        typeInputs.forEach(input => {
          if (input.value === 'note') {
            input.value = 'email';
            console.log('[Force Public] Changed article type from note to email');
          }
        });

        // Force internal flag to false
        const internalInputs = form.querySelectorAll('[name="internal"]');
        internalInputs.forEach(input => {
          if (input.type === 'checkbox') {
            input.checked = false;
          } else {
            input.value = 'false';
          }
          console.log('[Force Public] Set internal to false');
        });
      }
    }, true);
  }

  /* ------------------------------
     Intercept AJAX data (IMPROVED)
     ------------------------------ */
  function interceptAjaxData() {
    // Intercept jQuery AJAX if available
    if (window.jQuery && window.jQuery.ajax) {
      const originalAjax = window.jQuery.ajax;
      window.jQuery.ajax = function(settings) {
        if (settings.data) {
          let modified = false;
          let data = settings.data;

          // Parse if string
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
              modified = true;
            } catch (e) {
              // Try URL params
              if (data.includes('article')) {
                const params = new URLSearchParams(data);
                if (params.get('article_type') === 'note') {
                  params.set('article_type', 'email');
                  console.log('[Force Public] Changed article_type in URL params');
                }
                if (params.get('internal') === 'true') {
                  params.set('internal', 'false');
                  console.log('[Force Public] Changed internal in URL params');
                }
                settings.data = params.toString();
              }
            }
          }

          // Force public if article data present
          if (data && typeof data === 'object') {
            if (data.article && typeof data.article === 'object') {
              if (data.article.type === 'note') {
                console.log('[Force Public] Intercepted AJAX: changed article.type note to email');
                data.article.type = 'email';
                modified = true;
              }
              if (data.article.internal === true) {
                console.log('[Force Public] Intercepted AJAX: set article.internal to false');
                data.article.internal = false;
                modified = true;
              }
            }

            if (data.article_type === 'note') {
              console.log('[Force Public] Intercepted AJAX: changed article_type to email');
              data.article_type = 'email';
              modified = true;
            }
            if (data.internal === true || data.internal === 'true') {
              console.log('[Force Public] Intercepted AJAX: set internal to false');
              data.internal = false;
              modified = true;
            }

            // Update settings if modified
            if (modified) {
              settings.data = typeof settings.data === 'string' ?
                JSON.stringify(data) : data;
            }
          }
        }

        return originalAjax.call(this, settings);
      };
      console.log('[Force Public] jQuery AJAX interceptor installed');
    }

    // Intercept native fetch (IMPROVED)
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (options && options.body) {
        try {
          let body = options.body;
          let modified = false;

          // Handle JSON
          if (typeof body === 'string' && body.startsWith('{')) {
            const parsed = JSON.parse(body);

            if (parsed.article && typeof parsed.article === 'object') {
              if (parsed.article.type === 'note') {
                console.log('[Force Public] Intercepted Fetch: changed article.type to email');
                parsed.article.type = 'email';
                modified = true;
              }
              if (parsed.article.internal === true) {
                console.log('[Force Public] Intercepted Fetch: set article.internal to false');
                parsed.article.internal = false;
                modified = true;
              }
            }

            if (parsed.article_type === 'note') {
              console.log('[Force Public] Intercepted Fetch: changed article_type to email');
              parsed.article_type = 'email';
              modified = true;
            }
            if (parsed.internal === true) {
              console.log('[Force Public] Intercepted Fetch: set internal to false');
              parsed.internal = false;
              modified = true;
            }

            if (modified) {
              options.body = JSON.stringify(parsed);
            }
          }
        } catch (e) {
          // Not JSON, skip
        }
      }

      return originalFetch.apply(this, arguments);
    };
    console.log('[Force Public] Fetch interceptor installed');
  }

  /* ------------------------------
     Override Zammad methods (IMPROVED)
     ------------------------------ */
  function overrideZammadMethods() {
    let attempts = 0;
    const maxAttempts = 50;

    const tryOverride = () => {
      attempts++;

      if (!window.App) {
        if (attempts < maxAttempts) {
          setTimeout(tryOverride, 200);
        }
        return;
      }

      console.log('[Force Public] App object found, attempting overrides...');

      // Override TicketZoom
      if (window.App.TicketZoom && window.App.TicketZoom.prototype) {
        if (window.App.TicketZoom.prototype.articleNew && !window.App.TicketZoom.prototype.articleNew._forcePublicPatched) {
          const original = window.App.TicketZoom.prototype.articleNew;
          window.App.TicketZoom.prototype.articleNew = function(e) {
            console.log('[Force Public] Intercepting articleNew');
            const result = original.apply(this, arguments);
            setTimeout(() => {
              forcePublicArticleType();
              forcePublicVisibility();
            }, 100);
            return result;
          };
          window.App.TicketZoom.prototype.articleNew._forcePublicPatched = true;
          console.log('[Force Public] Overridden App.TicketZoom.articleNew');
        }
      }

      // Continue checking for other methods
      if (attempts < maxAttempts) {
        setTimeout(tryOverride, 500);
      }
    };

    tryOverride();
  }

  /* ------------------------------
     Monitor DOM for new article forms
     ------------------------------ */
  function monitorArticleForms() {
    const observer = new MutationObserver((mutations) => {
      let needsCheck = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if ((node.classList && node.classList.contains('articleNew')) ||
                (node.querySelector && node.querySelector('.articleNew')) ||
                (node.querySelector && node.querySelector('[name="article_type"]')) ||
                (node.classList && node.classList.contains('article-add'))) {
              needsCheck = true;
            }
          }
        });
      });

      if (needsCheck) {
        console.log('[Force Public] New article form detected');
        setTimeout(() => {
          forcePublicArticleType();
          forcePublicVisibility();
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Force Public] DOM monitor active');
  }

  /* ------------------------------
     Run periodic checks
     ------------------------------ */
  function periodicCheck() {
    forcePublicArticleType();
    forcePublicVisibility();
  }

  /* ------------------------------
     Initialize everything
     ------------------------------ */
  function init() {
    console.log('[Force Public] Starting initialization');

    // Initial enforcement
    setTimeout(() => {
      forcePublicArticleType();
      forcePublicVisibility();
    }, 500);

    // Intercept submissions
    interceptFormSubmit();

    // Monitor DOM
    monitorArticleForms();

    // Intercept AJAX/Fetch
    interceptAjaxData();

    // Override Zammad methods
    overrideZammadMethods();

    // Periodic check every 3 seconds
    setInterval(periodicCheck, 3000);

    console.log('[Force Public] Initialization complete - All replies forced to PUBLIC');
  }

  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();