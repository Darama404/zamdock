FROM ghcr.io/zammad/zammad:6.5.2-67

USER root

# 1. Install Dependencies (JQ, Node.js 20, pnpm, dos2unix)
RUN apt-get update && \
    apt-get install -y curl gnupg2 lsb-release apt-transport-https && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends jq dos2unix gosu nodejs && \
    npm install -g npm@latest && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Buat Struktur Folder Custom
RUN mkdir -p /opt/zammad/app/assets/javascripts/custom/templates \
    && mkdir -p /opt/zammad/app/assets/stylesheets/custom

# 3. Copy Semua Asset Custom
COPY assets/javascripts/ /opt/zammad/app/assets/javascripts/custom/
COPY assets/templates/ /opt/zammad/app/assets/javascripts/custom/templates/
COPY assets/stylesheets/ /opt/zammad/app/assets/stylesheets/custom/
COPY overrides/controllers/ /opt/zammad/app/controllers/
COPY overrides/routes/ /opt/zammad/config/routes/
COPY overrides/script/template_manager.sh /opt/zammad/script/

# 4. Copy Entrypoint Custom
COPY docker-entrypoint-custom.sh /usr/local/bin/

# 5. Inject Routes
COPY overrides/routes/ /tmp/custom_routes/
RUN cat /tmp/custom_routes/*.rb >> /opt/zammad/config/routes.rb \
    && rm -rf /tmp/custom_routes

# 6. Inject Application.js (Smart Injection via SED) ⚡
# Ini akan menghapus require lama (jika ada) dan menyisipkan yang baru di posisi yang aman
RUN sed -i '#^//= require custom/#d' /opt/zammad/app/assets/javascripts/application.js && \
    sed -i '#^//= require_tree ./custom/templates#d' /opt/zammad/app/assets/javascripts/application.js && \
    LINE_NUM=$(grep -n "bootstrap-datepicker.js" /opt/zammad/app/assets/javascripts/application.js | cut -d: -f1) && \
    if [ ! -z "$LINE_NUM" ]; then \
        sed -i "${LINE_NUM}a\\\\n// CUSTOM ASSETS - Jawakuli\n//= require custom/preupload-guard-v2.js\n//= require custom/force-public-replies.js\n//= require custom/tooltip.js\n//= require custom/launcher_template.js\n//= require custom/admin_builder.js\n//= require custom/text_placeholder.js\n//= require_tree ./custom/templates" /opt/zammad/app/assets/javascripts/application.js; \
    else \
        echo "ERROR: Could not find insertion point in application.js" && exit 1; \
    fi && \
    chown zammad:zammad /opt/zammad/app/assets/javascripts/application.js

# 7. Inject CSS
RUN echo "@import 'custom/internal-note.css';" >> /opt/zammad/app/assets/stylesheets/custom.css \
    && echo "@import 'custom/text_placeholder.css';" >> /opt/zammad/app/assets/stylesheets/custom.css

# 8. Fix Permissions & Line Endings (PENTING!)
# Kita jalankan dos2unix ke script .sh supaya tidak error "not found" karena format Windows
RUN dos2unix /usr/local/bin/docker-entrypoint-custom.sh \
    && dos2unix /opt/zammad/script/template_manager.sh \
    && chmod +x /usr/local/bin/docker-entrypoint-custom.sh \
    && chmod +x /opt/zammad/script/template_manager.sh \
    && chown -R zammad:zammad /opt/zammad/app/assets \
    && chown -R zammad:zammad /opt/zammad/script \
    && chown zammad:zammad /opt/zammad/config/routes.rb

USER zammad

ENTRYPOINT ["/usr/local/bin/docker-entrypoint-custom.sh"]
CMD ["zammad-railsserver"]