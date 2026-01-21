FROM ghcr.io/zammad/zammad:6.5.2-67

USER root

# 1. Install jq
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

# 2. Buat Struktur Folder Custom
RUN mkdir -p /opt/zammad/app/assets/javascripts/custom/templates \
    && mkdir -p /opt/zammad/app/assets/stylesheets/custom \
    && mkdir -p /opt/zammad/script/custom

# 3. Copy Semua Asset Custom (JS, CSS, Scripts)
COPY assets/javascripts/ /opt/zammad/app/assets/javascripts/custom/
COPY assets/stylesheets/ /opt/zammad/app/assets/stylesheets/custom/
COPY overrides/script/template_manager.sh /opt/zammad/script/custom/

# 4. Copy Entrypoint Custom (Logic systemd & compile ada di sini nanti)
COPY docker-entrypoint-custom.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-custom.sh

# 5. Inject Routes (Ruby Files)
COPY overrides/routes/ /tmp/custom_routes/
RUN cat /tmp/custom_routes/*.rb >> /opt/zammad/config/routes.rb \
    && rm -rf /tmp/custom_routes

# 6. Inject Application.js (JS Manifest)
# Menggunakan '>>' untuk append ke file asli
RUN echo "//= require custom/preupload-guard-merge.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/force_public_replies.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/tooltip.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/launcher_template.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/admin_builder.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/text_placeholder.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require_tree ./custom/templates" >> /opt/zammad/app/assets/javascripts/application.js

# 7. Inject CSS (CSS Manifest)
RUN echo "@import 'custom/internal-note.css';" >> /opt/zammad/app/assets/stylesheets/custom.css \
    && echo "@import 'custom/text_placeholder.css';" >> /opt/zammad/app/assets/stylesheets/custom.css

# 8. Fix Permissions
RUN chown -R zammad:zammad /opt/zammad/app/assets \
    && chown -R zammad:zammad /opt/zammad/script/custom \
    && chown zammad:zammad /opt/zammad/config/routes.rb

USER zammad

ENTRYPOINT ["/usr/local/bin/docker-entrypoint-custom.sh"]
CMD ["zammad-railsserver"]