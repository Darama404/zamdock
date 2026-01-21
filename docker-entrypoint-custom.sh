#!/bin/bash
set -e

# Fungsi cleanup: Ini yang menggantikan ExecStopPost di systemd
# Jalan saat container menerima sinyal mati (SIGTERM/SIGINT)
cleanup_queue() {
    echo "🛑 Stopping Container... Cleaning up template_pending_queue.json"
    
    # Cek apakah file queue ada
    if [ -f /opt/zammad/tmp/template_pending_queue.json ]; then
        # Tulis ulang file json dengan status kosong
        echo "{\"pending\":[],\"last_compiled\":\"$(date -Iseconds)\",\"scheduled_compile\":null}" > /opt/zammad/tmp/template_pending_queue.json
        
        # Pastikan permission tetap milik zammad
        chown zammad:zammad /opt/zammad/tmp/template_pending_queue.json
        echo "✅ Queue cleaned successfully."
    else
        echo "ℹ️  Queue file not found, skipping cleanup."
    fi
}

# Trap Signal: Mencegat perintah STOP dari Docker
trap 'cleanup_queue' SIGTERM SIGINT

# Jalankan Entrypoint Asli Zammad di background (&)
# Kita pakai background process supaya script ini tetap hidup buat nunggu sinyal trap
/docker-entrypoint.sh "$@" &

# Ambil Process ID (PID) dari Zammad
child=$!

# Tunggu sampai proses Zammad mati
wait "$child"