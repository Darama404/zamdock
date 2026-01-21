#!/bin/bash
set -e

# --- 1. Generate Config Database (Runtime) ---
# Kita buat config database manual berdasarkan ENV dari docker-compose
# Ini penting supaya rake assets:precompile bisa jalan
echo "🔧 Generating database.yml..."
echo "production:" > /opt/zammad/config/database.yml
echo "  adapter: postgresql" >> /opt/zammad/config/database.yml
echo "  database: ${POSTGRES_DB:-zammad_production}" >> /opt/zammad/config/database.yml
echo "  username: ${POSTGRES_USER:-zammad}" >> /opt/zammad/config/database.yml
echo "  password: ${POSTGRES_PASS:-zammad}" >> /opt/zammad/config/database.yml
echo "  host: ${POSTGRES_HOST:-zammad-postgresql}" >> /opt/zammad/config/database.yml
echo "  port: ${POSTGRES_PORT:-5432}" >> /opt/zammad/config/database.yml

# --- 2. Runtime Asset Precompile ---
# Jalan cuma kalau container ini adalah 'zammad-railsserver'
if [[ "$1" == "zammad-railsserver" ]]; then
    echo "🚀 Precompiling assets (This may take 2-3 minutes)..."
    # Kita paksa precompile. Karena Redis & DB sudah ada di network docker, ini AKAN BERHASIL.
    bundle exec rake assets:precompile
    echo "✅ Assets compiled!"
fi

# --- 3. Logic Systemd Replacement (Cleanup Queue) ---
cleanup_queue() {
    echo "🛑 Stopping Container... Cleaning up template_pending_queue.json"
    if [ -f /opt/zammad/tmp/template_pending_queue.json ]; then
        echo "{\"pending\":[],\"last_compiled\":\"$(date -Iseconds)\",\"scheduled_compile\":null}" > /opt/zammad/tmp/template_pending_queue.json
        chown zammad:zammad /opt/zammad/tmp/template_pending_queue.json || true
    fi
}
trap 'cleanup_queue' SIGTERM SIGINT

# --- 4. Jalankan Entrypoint Asli Zammad ---
# Jalankan command asli di background agar trap bisa jalan
/docker-entrypoint.sh "$@" &

child=$!
wait "$child"