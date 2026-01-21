# File: app/controllers/template_management_controller.rb
# Updated version with Apply Changes endpoint

require 'open3'
require 'tempfile'
require 'json'

class TemplateManagementController < ApplicationController
  prepend_before_action :authentication_check
  
  # 🔥 Only require admin access for write operations
  before_action :check_admin_access, except: [:list_categories, :list_templates, :get_template_content]

  SCRIPT_PATH = '/opt/zammad/script/template_manager.sh'
  DEPLOY_LOG = Rails.root.join('log', 'template_deploy.log')

  # GET /api/v1/template_admin/categories
  def list_categories
    Rails.logger.info "📂 [#{current_user.email}] Fetching categories..."
    templates_base_dir = Rails.root.join('app/assets/javascripts/custom/templates')
    
    unless Dir.exist?(templates_base_dir)
      Rails.logger.warn "⚠️ Templates directory not found: #{templates_base_dir}"
      render json: { categories: [] }
      return
    end

    # Get all subdirectories (categories)
    category_dirs = Dir.glob(templates_base_dir.join('*')).select { |f| File.directory?(f) }
    categories = []

    category_dirs.each do |dir|
      cat_id = File.basename(dir)
      
      # Skip invalid directory names
      next unless cat_id.match?(/^[a-z0-9_-]{3,50}$/)
      
      # Try to read category.json
      json_path = File.join(dir, 'category.json')
      if File.exist?(json_path)
        begin
          category_data = JSON.parse(File.read(json_path))
          categories << category_data
          Rails.logger.info "✅ Loaded category: #{cat_id}"
        rescue JSON::ParserError => e
          Rails.logger.error "❌ Invalid JSON in #{json_path}: #{e.message}"
          # Fallback if JSON is invalid
          categories << { id: cat_id, name: cat_id.capitalize, icon: '📋', description: '' }
        end
      else
        # Fallback if category.json doesn't exist
        Rails.logger.warn "⚠️ No category.json for #{cat_id}, using fallback"
        categories << { id: cat_id, name: cat_id.capitalize, icon: '📋', description: '' }
      end
    end

    Rails.logger.info "📂 [#{current_user.email}] Returning #{categories.length} categories"
    render json: { categories: categories }
  end

  # POST /api/v1/template_admin/categories
  def create_category
    id = params[:id]
    name = params[:name]
    icon = params[:icon] || '📋'
    description = params[:description] || ''

    if id.blank? || name.blank?
      render json: { error: 'ID and Name are required' }, status: 400
      return
    end

    # Validate ID format
    unless id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid category ID format. Use lowercase letters, numbers, underscore or hyphen only.' }, status: 400
      return
    end

    category_json = {
      id: id,
      name: name,
      icon: icon,
      description: description
    }.to_json

    ENV['ADMIN_EMAIL'] = current_user.email

    output, status = run_script('create_category', id, category_json)

    if status.success?
      render json: { success: true, message: "Category #{id} created", id: id }
    else
      render_error(output)
    end
  end

  # DELETE /api/v1/template_admin/categories/:id
  def delete_category
    id = params[:id]

    # Validate ID format
    unless id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid category ID format' }, status: 400
      return
    end

    output, status = run_script('delete_category', id)

    if status.success?
      render json: { success: true, message: "Category #{id} deleted" }
    else
      render_error(output)
    end
  end

  # GET /api/v1/template_admin/categories/:id/templates
  def list_templates
    category_id = params[:id]
    Rails.logger.info "📄 [#{current_user.email}] Fetching templates for: #{category_id}"

    # Validate ID format
    unless category_id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid category ID format' }, status: 400
      return
    end

    templates_dir = Rails.root.join('app/assets/javascripts/custom/templates', category_id)
    
    unless Dir.exist?(templates_dir)
      Rails.logger.info "📄 [#{current_user.email}] No templates directory for #{category_id}"
      render json: { templates: [] }
      return
    end

    # List all .js files in the category directory
    template_files = Dir.glob(templates_dir.join("*.js")).map do |file|
      basename = File.basename(file, '.js')
      
      # Remove timestamp prefix if present (pattern: 1234567890_name -> name)
      if basename =~ /^\d+_(.+)$/
        $1
      else
        basename
      end
    end.compact.uniq

    Rails.logger.info "📄 [#{current_user.email}] Found #{template_files.length} template(s) in #{category_id}: #{template_files.join(', ')}"
    render json: { templates: template_files }
  end

  # GET /api/v1/template_admin/categories/:id/templates/:template_id/content
  def get_template_content
    category_id = params[:id]
    template_id = params[:template_id]
    Rails.logger.info "📥 [#{current_user.email}] Loading template: #{category_id}/#{template_id}"

    # Validate ID formats
    unless category_id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid category ID format' }, status: 400
      return
    end

    templates_dir = Rails.root.join('app/assets/javascripts/custom/templates', category_id)
    
    unless Dir.exist?(templates_dir)
      Rails.logger.warn "⚠️ Category directory not found: #{templates_dir}"
      render json: { error: 'Category directory not found' }, status: 404
      return
    end

    # Search for template file with or without timestamp prefix
    matching_files = Dir.glob(templates_dir.join("*#{template_id}.js")).select do |file|
      basename = File.basename(file, '.js')
      basename == template_id || basename =~ /^\d+_#{Regexp.escape(template_id)}$/
    end

    if matching_files.empty?
      Rails.logger.warn "⚠️ Template not found: #{category_id}/#{template_id}"
      render json: { error: 'Template not found' }, status: 404
      return
    end

    template_path = matching_files.first

    begin
      content = File.read(template_path)
      Rails.logger.info "✅ [#{current_user.email}] Template content loaded: #{category_id}/#{File.basename(template_path)}"
      render json: {
        success: true,
        content: content,
        category_id: category_id,
        template_id: template_id,
        file_name: File.basename(template_path)
      }
    rescue => e
      Rails.logger.error "❌ Error reading template file: #{e.message}"
      render json: { error: "Failed to read template: #{e.message}" }, status: 500
    end
  end

  # POST /api/v1/template_admin/categories/:id/templates
  def create_template
    category_id = params[:id]
    template_id = params[:template_id]
    content = params[:content]

    if category_id.blank? || template_id.blank? || content.blank?
      render json: { error: 'Missing parameters' }, status: 400
      return
    end

    # Validate ID formats
    unless category_id.match?(/^[a-z0-9_-]{3,50}$/) && template_id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid ID format. Use lowercase letters, numbers, underscore or hyphen only.' }, status: 400
      return
    end

    ENV['ADMIN_EMAIL'] = current_user.email

    Tempfile.open(['zammad_tpl', '.js']) do |f|
      f.write(content)
      f.flush
      
      output, status = run_script('create_template', category_id, template_id, f.path)
      
      if status.success?
        render json: {
          success: true,
          message: "Template #{template_id} created and added to pending queue",
          pending: true
        }
      else
        render_error(output)
      end
    end
  end

  # DELETE /api/v1/template_admin/categories/:id/templates/:template_id
  def delete_template
    category_id = params[:id]
    template_id = params[:template_id]

    # Validate ID formats
    unless category_id.match?(/^[a-z0-9_-]{3,50}$/) && template_id.match?(/^[a-z0-9_-]{3,50}$/)
      render json: { error: 'Invalid ID format' }, status: 400
      return
    end

    output, status = run_script('delete_template', category_id, template_id)

    if status.success?
      render json: { success: true, message: "Template #{template_id} deleted (backup created)" }
    else
      render_error(output)
    end
  end

  # GET /api/v1/template_admin/pending
  def show_pending
    output, status = run_script('show_queue')

    if status.success?
      begin
        queue_data = JSON.parse(output)
        render json: queue_data
      rescue JSON::ParserError => e
        Rails.logger.error "Invalid JSON from show_queue: #{e.message}"
        render json: { error: 'Invalid queue data', pending: [] }, status: 500
      end
    else
      render_error(output)
    end
  end

  # GET /api/v1/template_admin/pending/count
  def pending_count
    # Try reading directly from file first (faster and more reliable)
    queue_file = Rails.root.join('tmp', 'template_pending_queue.json')
    
    if File.exist?(queue_file)
      begin
        data = JSON.parse(File.read(queue_file))
        count = data['pending']&.length || 0
        Rails.logger.info "Pending count from file: #{count}"
        render json: { count: count }
        return
      rescue JSON::ParserError => e
        Rails.logger.error "Invalid JSON in queue file: #{e.message}"
        # Fall through to script method
      rescue => e
        Rails.logger.error "Error reading queue file: #{e.message}"
        # Fall through to script method
      end
    end

    # Fallback: use script
    output, status = run_script('get_pending_count')

    if status.success?
      count = output.strip.to_i
      Rails.logger.info "Pending count from script: #{count}"
      render json: { count: count }
    else
      Rails.logger.error "Script failed: #{output}"
      # Return 0 on error to not break the UI
      render json: { count: 0 }
    end
  end

  # 🔥 NEW: POST /api/v1/template_admin/apply_changes
  # This endpoint triggers the deployment process
  def apply_changes
    Rails.logger.info "🚀 [#{current_user.email}] Apply changes requested"
    
    # Check if there are pending changes
    pending_count = get_pending_changes_count
    
    if pending_count.zero?
      Rails.logger.warn "⚠️ No pending changes to apply"
      render json: { success: false, error: "No pending changes to apply", stage: "validation" }, status: 400
      return
    end

    Rails.logger.info "📋 Pending changes: #{pending_count}"

    # Set environment variable for logging
    ENV['ADMIN_EMAIL'] = current_user.email

    # Start deployment in a background thread to avoid timeout
    Thread.new do
        begin
        log_deployment("🚀 DEPLOYMENT STARTED")
        
        # Fix 1: Timeout 2 menit
        success = Timeout.timeout(120) do
            execute_precompile
        end
        
        if success
            execute_restart_zammad
            clear_pending_queue
            log_deployment("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY")
        else
            log_deployment("❌ DEPLOYMENT FAILED")
        end
        rescue Timeout::Error
        log_deployment("⏰ TIMEOUT - Deployment cancelled")
        rescue => e
        log_deployment("💥 ERROR: #{e.message}")
        end
    end
    render json: { success: true, stage: 'initiated' }
  end

  # 🔥 NEW: GET /api/v1/template_admin/deploy_status
  # This endpoint returns the current deployment status
  def deploy_status
    begin
      if File.exist?(DEPLOY_LOG)
        # Read last 50 lines of deploy log for status
        lines = File.readlines(DEPLOY_LOG).last(50)
        
        # Parse status from log
        status = {
          success: true,
          stage: determine_stage_from_logs(lines),
          message: lines.last&.strip || "No logs yet"
        }

        # Check if deployment is complete
        if lines.any? { |l| l.include?("DEPLOYMENT COMPLETED SUCCESSFULLY") }
          status[:success] = true
          status[:stage] = "completed"
        elsif lines.any? { |l| l.include?("ERROR") || l.include?("FATAL") }
          status[:success] = false
          status[:stage] = "failed"
        end

        render json: status
      else
        render json: { success: true, stage: "pending", message: "Waiting to start deployment..." }
      end
    rescue => e
      Rails.logger.error "Error reading deploy status: #{e.message}"
      render json: { success: false, error: "Error reading deployment status", stage: "error" }, status: 500
    end
  end

  private

  def get_pending_changes_count
    output, status = run_script('get_pending_count')
    status.success? ? output.strip.to_i : 0
  end

  def execute_precompile
    cd_zammad && execute_command_with_timeout(
      "zammad run rake assets:precompile",
      300  # 5 minute timeout
    )
  end

  def execute_restart_zammad
    execute_command_with_timeout(
      "sudo systemctl restart zammad",
      60  # 1 minute timeout
    )
  end

  def check_zammad_running
    sleep 3  # Wait for service to stabilize
    execute_command("systemctl is-active --quiet zammad")
  end

  def cd_zammad
    Dir.chdir('/opt/zammad')
    true
  rescue => e
    log_deployment("❌ Cannot cd to /opt/zammad: #{e.message}")
    false
  end

  def execute_command(cmd)
    stdout, stderr, status = Open3.capture3(cmd)
    status.success?
  rescue => e
    log_deployment("❌ Command execution error: #{e.message}")
    false
  end

  def execute_command_with_timeout(cmd, timeout_seconds)
    begin
      stdout, stderr, status = Open3.capture3("timeout #{timeout_seconds} #{cmd}")
      
      if status.success?
        log_deployment("✅ Command succeeded: #{cmd}")
        return true
      else
        log_deployment("❌ Command failed (exit code: #{status.exitstatus}): #{cmd}")
        log_deployment("STDOUT: #{stdout}") if stdout.present?
        log_deployment("STDERR: #{stderr}") if stderr.present?
        return false
      end
    rescue => e
      log_deployment("❌ Error executing command: #{e.message}")
      return false
    end
  end

  def clear_pending_queue
    output, status = run_script('clear_queue')
    
    if status.success?
      log_deployment("✅ Pending queue cleared")
    else
      log_deployment("⚠️ Failed to clear queue: #{output}")
    end
  end

  def determine_stage_from_logs(lines)
    log_text = lines.join

    if log_text.include?("DEPLOYMENT COMPLETED SUCCESSFULLY")
      "completed"
    elsif log_text.include?("Restarting Zammad")
      "restarting"
    elsif log_text.include?("Assets compiled")
      "compiled"
    elsif log_text.include?("Compiling assets")
      "compiling"
    else
      "initializing"
    end
  end

  def log_deployment(message)
    timestamp = Time.now.strftime("%Y-%m-%d %H:%M:%S")
    log_line = "[#{timestamp}] #{message}"
    
    # Ensure log file exists
    FileUtils.mkdir_p(File.dirname(DEPLOY_LOG))
    
    File.open(DEPLOY_LOG, 'a') do |f|
      f.puts log_line
    end
    
    Rails.logger.info log_line
  end

  def run_script(command, *args)
    cmd = [SCRIPT_PATH, command] + args
    
    # Capture stdout and stderr separately
    stdout, stderr, status = Open3.capture3(*cmd)
    
    # Clean stdout: remove any lines that start with [ (log lines)
    clean_stdout = stdout.lines.reject { |line| line.strip.start_with?('[') }.join
    
    result = status.success? ? clean_stdout : (stderr.presence || clean_stdout)
    
    [result.strip, status]
  end

  def render_error(message)
    render json: { error: message.to_s.strip }, status: 422
  end

  def check_admin_access
    unless current_user.permissions?('admin')
      Rails.logger.warn "⚠️ Non-admin user attempted admin action: #{current_user.email}"
      render json: { error: 'Unauthorized. Admin access required.' }, status: :forbidden
    end
  end
end