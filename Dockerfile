# UPDATE: Menggunakan versi 6.5.2-67 sesuai .env kamu
FROM zammad/zammad-docker-compose:zammad-6.5.2-67

USER root

# 1. Install jq
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

# 2. Buat Struktur Folder Custom
RUN mkdir -p /opt/zammad/app/assets/javascripts/custom/templates \
    && mkdir -p /opt/zammad/app/assets/stylesheets/custom \
    && mkdir -p /opt/zammad/script/custom

# 3. Copy Assets & Scripts (Sama seperti sebelumnya)
COPY assets/javascripts/custom/ /opt/zammad/app/assets/javascripts/custom/
COPY assets/stylesheets/custom/ /opt/zammad/app/assets/stylesheets/custom/
COPY overrides/scripts/template_manager.sh /opt/zammad/script/custom/
COPY docker-entrypoint-custom.sh /usr/local/bin/

# 4. Inject Routes (Sama seperti sebelumnya)
COPY overrides/routes/ /tmp/custom_routes/
RUN cat /tmp/custom_routes/*.rb >> /opt/zammad/config/routes.rb \
    && rm -rf /tmp/custom_routes

# 5. Inject Application.js (Sama seperti sebelumnya)
RUN echo "//= require custom/preupload-guard-merge.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/force_public_replies.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/tooltip.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/launcher_template.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/admin_builder.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require custom/text_placeholder.js" >> /opt/zammad/app/assets/javascripts/application.js \
    && echo "//= require_tree ./custom/templates" >> /opt/zammad/app/assets/javascripts/application.js

# 6. Inject CSS (Sama seperti sebelumnya)
RUN echo "@import 'custom/internal-note.css';" >> /opt/zammad/app/assets/stylesheets/custom.css \
    && echo "@import 'custom/text_placeholder.css';" >> /opt/zammad/app/assets/stylesheets/custom.css

# 7. Fix Permissions & Precompile
RUN chown -R zammad:zammad /opt/zammad/app/assets \
    && chown -R zammad:zammad /opt/zammad/script/custom \
    && chown zammad:zammad /opt/zammad/config/routes.rb \
    && chmod +x /opt/zammad/script/custom/template_manager.sh \
    && chmod +x /usr/local/bin/docker-entrypoint-custom.sh

USER zammad
RUN cd /opt/zammad && bundle exec rake assets:precompile

ENTRYPOINT ["/usr/local/bin/docker-entrypoint-custom.sh"]
CMD ["zammad-railsserver"]