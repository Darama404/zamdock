// File: app/assets/javascripts/custom/text_placeholder.js
// Text Placeholder for New Ticket - V1.01

(function() {
    'use strict';
    
    function addPlaceholders() {
        // Deteksi apakah ini New Ticket modal/page
        var isNewTicket = document.querySelector('.newTicket') || 
                         document.querySelector('[data-type="new"]') ||
                         document.querySelector('.content.active .newTicket') ||
                         window.location.hash.includes('#ticket/create');
        
        // Atau cek dari URL/modal title
        var modalTitle = document.querySelector('.modal-title, .page-header-title');
        if (modalTitle && modalTitle.textContent.includes('New Ticket')) {
            isNewTicket = true;
        }
        
        // HANYA inject placeholder kalau ini New Ticket
        if (isNewTicket) {
            // TITLE input
            var titleInput = document.querySelector('input[name="title"]');
            if (titleInput && !titleInput.getAttribute('placeholder')) {
                titleInput.setAttribute('placeholder', 'Enter ticket title (required)');
            }
            
            // TEXT richtext contenteditable (cek parent untuk memastikan ini new ticket)
            var richtextContent = document.querySelector('.newTicket .richtext-content[contenteditable="true"]');
            if (!richtextContent) {
                // Fallback selector
                richtextContent = document.querySelector('.content.active .richtext-content[contenteditable="true"]');
            }
            
            if (richtextContent) {
                // Cek apakah ini benar-benar new ticket (bukan reply/note di existing ticket)
                var isReplyBox = richtextContent.closest('.article-add');
                
                if (!isReplyBox) {
                    // Ini new ticket, set placeholder
                    richtextContent.setAttribute('data-placeholder', 'Describe your issue or request in detail (required)');
                    
                    // Bersihkan konten default jika ada
                    if (richtextContent.textContent.trim() === '') {
                        richtextContent.innerHTML = '';
                    }
                }
            }
        }
    }
    
    // Jalankan saat DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addPlaceholders);
    } else {
        addPlaceholders();
    }
    
    // Observer untuk dynamic content (modal baru, navigation)
    var observer = new MutationObserver(function(mutations) {
        addPlaceholders();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Jalankan saat hash/URL berubah (navigasi ke New Ticket)
    window.addEventListener('hashchange', function() {
        setTimeout(addPlaceholders, 300);
    });
})();