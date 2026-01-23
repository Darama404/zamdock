#!/bin/bash
# File: /opt/zammad/script/template_manager.sh
# Version 2.2 - Added Apply Changes Feature

set -e

TEMPLATES_BASE_PATH="/opt/zammad/app/assets/javascripts/custom/templates"
ZAMMAD_USER="zammad"
ZAMMAD_GROUP="zammad"
LOG_FILE="/opt/zammad/log/template_manager.log"
QUEUE_FILE="/opt/zammad/tmp/template_pending_queue.json"
LOCK_FILE="/opt/zammad/tmp/template_queue.lock"
LOCK_TIMEOUT=10
DEPLOY_LOG="/opt/zammad/log/template_deploy.log"

# Track if current process holds lock
LOCK_HELD=0

log() {
  local level="$1"; shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

deploy_log() {
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $message" | tee -a "$DEPLOY_LOG"
}

if [ "$(whoami)" != "$ZAMMAD_USER" ]; then
  echo "ERROR: This script must run as $ZAMMAD_USER user"
  exit 1
fi

# ============================================
# LOCKING MECHANISM
# ============================================

acquire_lock() {
  if [ "$LOCK_HELD" -eq 1 ]; then
    log "DEBUG" "Lock already held by this process (PID $$), skipping acquire"
    return 0
  fi

  local waited=0
  while [ -f "$LOCK_FILE" ]; do
    local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")

    if [ "$lock_pid" = "$$" ]; then
      log "DEBUG" "Lock file exists but owned by this PID $$"
      LOCK_HELD=1
      return 0
    fi

    if [ $waited -ge $LOCK_TIMEOUT ]; then
      local lock_age=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
      if [ $lock_age -gt 60 ]; then
        log "WARN" "Stale lock detected (${lock_age}s old), removing"
        rm -f "$LOCK_FILE"
        break
      else
        log "ERROR" "Lock timeout after ${LOCK_TIMEOUT}s (held by PID $lock_pid)"
        return 1
      fi
    fi
    sleep 0.1
    waited=$((waited + 1))
  done

  echo "$$" > "$LOCK_FILE"
  LOCK_HELD=1
  log "DEBUG" "Lock acquired by PID $$"
  return 0
}

release_lock() {
  if [ "$LOCK_HELD" -eq 0 ]; then
    log "DEBUG" "No lock to release for PID $$"
    return 0
  fi

  if [ -f "$LOCK_FILE" ]; then
    local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ "$lock_pid" = "$$" ]; then
      rm -f "$LOCK_FILE"
      LOCK_HELD=0
      log "DEBUG" "Lock released by PID $$"
    fi
  fi
}

trap release_lock EXIT INT TERM

# ============================================
# QUEUE VALIDATION & HEALING
# ============================================

validate_json() {
  local file="$1"
  if ! command -v jq &> /dev/null; then
    log "WARN" "jq not installed, skipping validation"
    return 0
  fi

  if [ ! -f "$file" ]; then
    return 1
  fi

  if [ ! -s "$file" ]; then
    log "WARN" "File is empty: $file"
    return 1
  fi

  if jq empty "$file" 2>/dev/null; then
    return 0
  else
    log "ERROR" "Invalid JSON in $file"
    return 1
  fi
}

create_empty_queue() {
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  cat > "$QUEUE_FILE" << EOF
{
  "pending": [],
  "last_compiled": null,
  "scheduled_compile": null,
  "last_validated": "$timestamp",
  "version": "2.2"
}
EOF
  chown $ZAMMAD_USER:$ZAMMAD_GROUP "$QUEUE_FILE"
  chmod 644 "$QUEUE_FILE"
  log "INFO" "Created empty queue file"
}

_init_queue_internal() {
  local needs_init=false

  if [ ! -f "$QUEUE_FILE" ]; then
    log "INFO" "Queue file does not exist"
    needs_init=true
  elif [ ! -s "$QUEUE_FILE" ]; then
    log "WARN" "Queue file is empty (0 bytes)"
    needs_init=true
  elif ! validate_json "$QUEUE_FILE"; then
    log "WARN" "Queue file has invalid JSON, backing up and recreating"
    local backup_file="${QUEUE_FILE}.corrupted.$(date +%Y%m%d_%H%M%S)"
    cp "$QUEUE_FILE" "$backup_file" 2>/dev/null || true
    log "INFO" "Backup created: $backup_file"
    needs_init=true
  fi

  if [ "$needs_init" = true ]; then
    create_empty_queue
  fi
}

init_queue() {
  acquire_lock || return 1
  _init_queue_internal
  release_lock
}

# ============================================
# QUEUE OPERATIONS
# ============================================

_add_to_queue_internal() {
  local action="$1"
  local category="$2"
  local template="$3"
  local admin_email="${4:-system}"

  _init_queue_internal

  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if command -v jq &> /dev/null; then
    local temp_file="${QUEUE_FILE}.tmp.$$"

    jq --arg action "$action" \
       --arg category "$category" \
       --arg template "$template" \
       --arg timestamp "$timestamp" \
       --arg admin "$admin_email" \
       '.pending += [{
         action: $action,
         category: $category,
         template: $template,
         timestamp: $timestamp,
         admin: $admin
       }]' "$QUEUE_FILE" > "$temp_file"

    if validate_json "$temp_file"; then
      mv "$temp_file" "$QUEUE_FILE"
      log "INFO" "Added to pending queue: $action $category/$template"
      return 0
    else
      log "ERROR" "Generated invalid JSON, rolling back"
      rm -f "$temp_file"
      return 1
    fi
  else
    log "WARN" "jq not found, queue append disabled"
    return 1
  fi
}

add_to_queue() {
  local action="$1"
  local category="$2"
  local template="$3"
  local admin_email="${4:-system}"

  acquire_lock || return 1
  _add_to_queue_internal "$action" "$category" "$template" "$admin_email"
  local result=$?
  release_lock
  return $result
}

get_pending_count() {
  acquire_lock || return 1
  _init_queue_internal

  local count=0
  if command -v jq &> /dev/null && validate_json "$QUEUE_FILE"; then
    count=$(jq -r '.pending | length' "$QUEUE_FILE" 2>/dev/null || echo "0")
  else
    log "WARN" "Cannot read queue, returning 0"
  fi

  release_lock
  echo "$count"
}

clear_queue() {
  acquire_lock || return 1
  _init_queue_internal

  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if command -v jq &> /dev/null; then
    local temp_file="${QUEUE_FILE}.tmp.$$"
    jq --arg ts "$timestamp" \
       '.pending = [] | .last_compiled = $ts' \
       "$QUEUE_FILE" > "$temp_file"

    if validate_json "$temp_file"; then
      mv "$temp_file" "$QUEUE_FILE"
      log "INFO" "Pending queue cleared"
    else
      log "ERROR" "Failed to clear queue, invalid JSON generated"
      rm -f "$temp_file"
      release_lock
      return 1
    fi
  else
    create_empty_queue
  fi

  release_lock
}

show_queue() {
  acquire_lock || return 1
  _init_queue_internal

  if validate_json "$QUEUE_FILE"; then
    cat "$QUEUE_FILE"
  else
    echo '{"error":"Queue file is corrupted","pending":[]}'
  fi

  release_lock
}

# ============================================
# 🔥 NEW: APPLY CHANGES FEATURE
# ============================================

apply_changes() {
  local admin_email="${ADMIN_EMAIL:-system}"
  
  deploy_log "=========================================="
  deploy_log "🚀 DEPLOYMENT STARTED by $admin_email"
  deploy_log "=========================================="
  
  # Check if there are pending changes
  local pending_count=$(get_pending_count)
  if [ "$pending_count" -eq 0 ]; then
    deploy_log "⚠️  No pending changes to apply"
    echo '{"success":false,"error":"No pending changes to apply","stage":"validation"}'
    return 1
  fi
  
  deploy_log "📋 Pending changes: $pending_count"
  
  # Stage 1: Assets Precompile
  deploy_log ""
  deploy_log "📦 Stage 1/2: Compiling assets..."
  echo '{"success":true,"stage":"compiling","message":"Compiling assets...","progress":30}'
  
  cd /opt/zammad || {
    deploy_log "❌ ERROR: Cannot cd to /opt/zammad"
    echo '{"success":false,"error":"Cannot access Zammad directory","stage":"compiling"}'
    return 1
  }
  
  # Run assets precompile with timeout
  if timeout 300 rake assets:precompile >> "$DEPLOY_LOG" 2>&1; then
    deploy_log "✅ Assets compiled successfully"
    echo '{"success":true,"stage":"compiled","message":"Assets compiled successfully","progress":60}'
  else
    local exit_code=$?
    deploy_log "❌ ERROR: Assets precompile failed (exit code: $exit_code)"
    echo '{"success":false,"error":"Assets precompile failed","stage":"compiling","exit_code":'$exit_code'}'
    return 1
  fi
  
  # Stage 2: Restart Zammad
  deploy_log ""
  deploy_log "🔄 Stage 2/2: Restarting Zammad..."
  echo '{"success":true,"stage":"restarting","message":"Restarting Zammad service...","progress":80}'
  
  # Try systemctl restart (requires sudoers configuration)
  if sudo systemctl restart zammad >> "$DEPLOY_LOG" 2>&1; then
    deploy_log "✅ Zammad restarted successfully"
    
    # Wait a bit for service to stabilize
    sleep 3
    
    # Check if service is running
    if systemctl is-active --quiet zammad; then
      deploy_log "✅ Zammad service is active"
      
      # Clear the pending queue
      clear_queue
      
      deploy_log ""
      deploy_log "=========================================="
      deploy_log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
      deploy_log "=========================================="
      
      echo '{"success":true,"stage":"completed","message":"Deployment completed successfully! Zammad has been restarted.","progress":100}'
      return 0
    else
      deploy_log "⚠️  WARNING: Zammad service may not be running properly"
      echo '{"success":false,"error":"Service restart completed but status check failed","stage":"restarting"}'
      return 1
    fi
  else
    deploy_log "❌ ERROR: Failed to restart Zammad"
    deploy_log "ℹ️  Make sure sudoers is configured properly:"
    deploy_log "    zammad ALL=(ALL) NOPASSWD: /bin/systemctl restart zammad"
    echo '{"success":false,"error":"Failed to restart Zammad. Check sudoers configuration.","stage":"restarting"}'
    return 1
  fi
}

# Get deployment status (for progress tracking)
get_deploy_status() {
  if [ -f "$DEPLOY_LOG" ]; then
    # Return last 20 lines of deploy log
    tail -n 20 "$DEPLOY_LOG"
  else
    echo "No deployment log found"
  fi
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

validate_category_id() {
  local id="$1"
  if [[ ! "$id" =~ ^[a-z0-9_-]+$ ]]; then
    log "ERROR" "Invalid category ID: $id (must be lowercase alphanumeric with _ or -)"
    exit 1
  fi
  local len=${#id}
  if [ $len -lt 3 ] || [ $len -gt 50 ]; then
    log "ERROR" "Category ID must be 3-50 characters"
    exit 1
  fi
}

validate_template_id() {
  local id="$1"
  if [[ ! "$id" =~ ^[a-z0-9_-]+$ ]]; then
    log "ERROR" "Invalid template ID: $id"
    exit 1
  fi
  local len=${#id}
  if [ $len -lt 3 ] || [ $len -gt 50 ]; then
    log "ERROR" "Template ID must be 3-50 characters"
    exit 1
  fi
}

# ============================================
# CATEGORY & TEMPLATE OPERATIONS
# ============================================

create_category() {
  local category_id="$1"
  local category_json="$2"

  log "INFO" "Creating category: $category_id"
  validate_category_id "$category_id"

  local category_path="$TEMPLATES_BASE_PATH/$category_id"
  if [ -d "$category_path" ]; then
    log "ERROR" "Category '$category_id' already exists at $category_path"
    exit 1
  fi

  mkdir -p "$category_path"
  log "INFO" "Directory created: $category_path"

  echo "$category_json" > "$category_path/category.json"
  log "INFO" "category.json created"

  chown -R $ZAMMAD_USER:$ZAMMAD_GROUP "$category_path"
  chmod 755 "$category_path"
  chmod 644 "$category_path/category.json"

  log "SUCCESS" "Category '$category_id' created successfully"

  acquire_lock || { log "ERROR" "Failed to acquire lock for queue update"; exit 1; }
  _add_to_queue_internal "create_category" "$category_id" "" "${ADMIN_EMAIL:-system}"
  release_lock

  echo "SUCCESS: Category '$category_id' created and added to pending queue"
}

create_template() {
  local category_id="$1"
  local template_id="$2"
  local temp_file="$3"

  log "INFO" "Creating template: $template_id in category: $category_id"

  validate_category_id "$category_id"
  validate_template_id "$template_id"

  local category_path="$TEMPLATES_BASE_PATH/$category_id"
  if [ ! -d "$category_path" ]; then
    log "ERROR" "Category '$category_id' does not exist at $category_path"
    exit 1
  fi

  if [ ! -f "$temp_file" ]; then
    log "ERROR" "Template source file not found: $temp_file"
    exit 1
  fi

  local template_file="$category_path/${template_id}.js"
  if [ -f "$template_file" ]; then
    log "ERROR" "Template '$template_id' already exists in category '$category_id'"
    exit 1
  fi

  if command -v node &> /dev/null; then
    if ! node -c "$temp_file" 2>/dev/null; then
      log "WARN" "JavaScript syntax check failed (non-blocking)"
    fi
  fi

  cp "$temp_file" "$template_file"
  chown $ZAMMAD_USER:$ZAMMAD_GROUP "$template_file"
  chmod 644 "$template_file"

  log "SUCCESS" "Template '$template_id' created successfully"

  acquire_lock || { log "ERROR" "Failed to acquire lock for queue update"; exit 1; }
  _add_to_queue_internal "create_template" "$category_id" "$template_id" "${ADMIN_EMAIL:-system}"
  release_lock

  echo "SUCCESS: Template '$template_id' created and added to pending queue"
}

delete_category() {
  local category_id="$1"
  log "INFO" "Deleting category: $category_id"
  validate_category_id "$category_id"

  local category_path="$TEMPLATES_BASE_PATH/$category_id"
  if [ ! -d "$category_path" ]; then
    log "ERROR" "Category '$category_id' does not exist"
    exit 1
  fi

  local template_count=$(find "$category_path" -name "*.js" -type f 2>/dev/null | wc -l)
  if [ $template_count -gt 0 ]; then
    log "ERROR" "Category contains $template_count template(s). Delete templates first."
    echo "ERROR: Category contains $template_count template(s). Delete templates first."
    exit 1
  fi

  rm -rf "$category_path"
  log "SUCCESS" "Category '$category_id' deleted"

  acquire_lock || { log "WARN" "Failed to acquire lock for queue update"; }
  _add_to_queue_internal "delete_category" "$category_id" "" "${ADMIN_EMAIL:-system}"
  release_lock

  echo "SUCCESS: Category '$category_id' deleted"
}

delete_template() {
  local category_id="$1"
  local template_id="$2"

  log "INFO" "Deleting template: $template_id from category: $category_id"

  validate_category_id "$category_id"
  validate_template_id "$template_id"

  local template_file="$TEMPLATES_BASE_PATH/$category_id/${template_id}.js"
  if [ ! -f "$template_file" ]; then
    log "ERROR" "Template file not found: $template_file"
    exit 1
  fi

  local backup_dir="$TEMPLATES_BASE_PATH/.backups"
  mkdir -p "$backup_dir"
  local backup_file="$backup_dir/${category_id}_${template_id}_$(date +%Y%m%d_%H%M%S).js"

  cp "$template_file" "$backup_file"
  rm -f "$template_file"

  log "SUCCESS" "Template '$template_id' deleted from category '$category_id'"

  acquire_lock || { log "WARN" "Failed to acquire lock for queue update"; }
  _add_to_queue_internal "delete_template" "$category_id" "$template_id" "${ADMIN_EMAIL:-system}"
  release_lock

  echo "SUCCESS: Template '$template_id' deleted (backup: $backup_file)"
}

list_categories() {
  if [ ! -d "$TEMPLATES_BASE_PATH" ]; then
    echo ""
    return
  fi

  local categories=""
  for dir in "$TEMPLATES_BASE_PATH"/*/ ; do
    if [ -d "$dir" ]; then
      local category_name=$(basename "$dir")
      [[ "$category_name" == .* ]] && continue
      [[ "$category_name" == "backups" ]] && continue

      if [[ "$category_name" =~ ^[a-z0-9_-]+$ ]]; then
        categories="$categories$category_name "
      fi
    fi
  done

  echo "$categories" | xargs
}

list_templates() {
  local category_id="$1"

  {
    local category_path="$TEMPLATES_BASE_PATH/$category_id"

    if [ ! -d "$category_path" ]; then
      echo ""
      return
    fi

    local templates=""
    for file in "$category_path"/*.js ; do
      if [ -f "$file" ]; then
        local template_name=$(basename "$file" .js)
        templates="$templates$template_name "
      fi
    done

    echo "$templates" | xargs
  } 2>&1 | grep -v "^\[" || true
}

show_help() {
  cat << EOF
Template Manager Script v2.2 (with Apply Changes)

Usage: $0 <command> [args]

Commands:
  create_category       <category_id> <category_json>
  create_template       <category_id> <template_id> <temp_file>
  delete_category       <category_id>
  delete_template       <category_id> <template_id>
  list_categories
  list_templates        <category_id>
  show_queue
  get_pending_count
  clear_queue
  init_queue            (force initialization/repair)
  
  🔥 NEW:
  apply_changes         (compile assets and restart Zammad)
  get_deploy_status     (get deployment log)
EOF
}

# ============================================
# COMMAND DISPATCHER
# ============================================

case "$1" in
  create_category)
    [ -z "$2" ] || [ -z "$3" ] && { echo "ERROR: Missing arguments"; exit 1; }
    create_category "$2" "$3"
    ;;
  create_template)
    [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] && { echo "ERROR: Missing arguments"; exit 1; }
    create_template "$2" "$3" "$4"
    ;;
  delete_category)
    [ -z "$2" ] && { echo "ERROR: Missing category_id"; exit 1; }
    delete_category "$2"
    ;;
  delete_template)
    [ -z "$2" ] || [ -z "$3" ] && { echo "ERROR: Missing arguments"; exit 1; }
    delete_template "$2" "$3"
    ;;
  list_categories)
    list_categories
    ;;
  list_templates)
    [ -z "$2" ] && { echo "ERROR: Missing category_id"; exit 1; }
    list_templates "$2"
    ;;
  show_queue)
    show_queue
    ;;
  get_pending_count)
    get_pending_count
    ;;
  clear_queue)
    clear_queue
    ;;
  init_queue)
    init_queue
    echo "Queue initialized/repaired"
    ;;
  apply_changes)
    apply_changes
    ;;
  get_deploy_status)
    get_deploy_status
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "ERROR: Unknown command '$1'"
    show_help
    exit 1
    ;;
esac