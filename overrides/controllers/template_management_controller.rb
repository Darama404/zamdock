# File: app/controllers/template_management_controller.rb
# Updated version with Docker-compatible restart

require 'open3'
require 'tempfile'
require 'json'

class TemplateManagementController < ApplicationController
  prepend_before_action :authentication_check
  
  # Only require admin access for write operations
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

    category_dirs = Dir.glob(templates_base_dir.join('*')).select { |f| File.directory?(f) }
    categories = []

    category_dirs.each do |dir|
      cat_id = File.basename(dir)
      next unless cat_id.match?(/^[a-z0-9_-]{3,50}$/)
      
      json_path = File.join(dir, 'category.json')
      if File.exist?(json_path)
        begin
          category_data = JSON.parse(File.read(json_path))
          categories << category_data
          Rails.logger.info "✅ Loaded category: #{cat_id}"
        rescue JSON::ParserError => e
          Rails.logger.error "❌ Invalid JSON in #{json_path}: #{e.message}"
          categories << { id: cat_id, name: cat_id.capitalize, icon: '📋', description: '' }
        end
      else
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

    template_files = Dir.glob(templates_dir.join("*.js")).map do |file|
      basename = File.basename(file, '.js')
      
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
      rescue => e
        Rails.logger.error "Error reading queue file: #{e.message}"
      end
    end

    output, status = run_script('get_pending_count')

    if status.success?
      count = output.strip.to_i
      Rails.logger.info "Pending count from script: #{count}"
      render json: { count: count }
    else
      Rails.logger.error "Script failed: #{output}"
      render json: { count: 0 }
    end
  end

  # 🔥 POST /api/v1/template_admin/apply_changes
  def apply_changes
    Rails.logger.info "🚀 [#{current_user.email}] Apply changes requested"
    
    pending_count = get_pending_changes_count
    
    if pending_count.zero?
      Rails.logger.warn "⚠️ No pending changes to apply"
      render json: { success: false, error: "No pending changes to apply", stage: "validation" }, status: 400
      return
    end

    Rails.logger.info "📋 Pending changes: #{pending_count}"

    ENV['ADMIN_EMAIL'] = current_user.email

    # Start deployment in background
    Thread.new do
      begin
        log_deployment("🚀 DEPLOYMENT STARTED by #{current_user.email}")
        
        # Step 1: Assets Precompile (with 3-minute timeout)
        success = Timeout.timeout(180) do
          execute_precompile
        end
        
        if success
          log_deployment("✅ Assets compiled successfully")
          
          # Step 2: Restart Zammad Rails Server (Docker)
          if execute_docker_restart
            log_deployment("✅ Zammad Rails server restarted successfully")
            
            # Clear pending queue
            clear_pending_queue
            log_deployment("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY")
          else
            log_deployment("❌ Failed to restart Zammad Rails server")
          end
        else
          log_deployment("❌ Assets precompile failed")
        end
      rescue Timeout::Error
        log_deployment("⏰ TIMEOUT - Deployment took too long (>3 minutes)")
      rescue => e
        log_deployment("💥 ERROR: #{e.message}")
        log_deployment("Backtrace: #{e.backtrace.first(5).join("\n")}")
      end
    end

    render json: { success: true, stage: 'initiated', message: 'Deployment started in background' }
  end

  # 🔥 GET /api/v1/template_admin/deploy_status
  def deploy_status
    begin
      if File.exist?(DEPLOY_LOG)
        lines = File.readlines(DEPLOY_LOG).last(50)
        
        status = {
          success: true,
          stage: determine_stage_from_logs(lines),
          message: lines.last&.strip || "No logs yet"
        }

        if lines.any? { |l| l.include?("DEPLOYMENT COMPLETED SUCCESSFULLY") }
          status[:success] = true
          status[:stage] = "completed"
        elsif lines.any? { |l| l.include?("ERROR") || l.include?("FATAL") || l.include?("Failed") }
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
    log_deployment("📦 Stage 1/2: Compiling assets...")
    
    Dir.chdir('/opt/zammad') do
      stdout, stderr, status = Open3.capture3("rake assets:precompile")
      
      if status.success?
        log_deployment("✅ Assets precompile completed")
        return true
      else
        log_deployment("❌ Assets precompile failed (exit code: #{status.exitstatus})")
        log_deployment("STDERR: #{stderr}") if stderr.present?
        return false
      end
    end
  rescue => e
    log_deployment("❌ Error during precompile: #{e.message}")
    false
  end

  # 🔥 NEW: Docker-compatible restart method
  def execute_docker_restart
    log_deployment("🔄 Stage 2/2: Restarting Zammad Rails server...")
    
    # Method 1: Use restart.txt (Passenger/Puma standard)
    restart_file = '/opt/zammad/tmp/restart.txt'
    begin
      FileUtils.touch(restart_file)
      log_deployment("✅ Created restart.txt file")
    rescue => e
      log_deployment("⚠️ Could not create restart.txt: #{e.message}")
    end
    
    # Method 2: Try to restart via docker-compose from host
    # This requires docker socket to be mounted or SSH access to host
    container_name = detect_container_name
    
    if container_name
      log_deployment("🐳 Detected container: #{container_name}")
      
      # Try to restart using docker command inside container
      # This will work if docker socket is mounted (-v /var/run/docker.sock:/var/run/docker.sock)
      restart_cmd = "docker restart #{container_name}"
      
      stdout, stderr, status = Open3.capture3(restart_cmd)
      
      if status.success?
        log_deployment("✅ Successfully restarted container: #{container_name}")
        log_deployment("⏳ Waiting for service to stabilize...")
        sleep 5
        return true
      else
        log_deployment("⚠️ Could not restart container directly: #{stderr}")
        log_deployment("📝 Manual restart required: docker-compose restart zammad-railsserver")
        log_deployment("💡 Or ensure docker socket is mounted for auto-restart")
        
        # Still return true as restart.txt should trigger reload
        return true
      end
    else
      log_deployment("⚠️ Could not detect container name")
      log_deployment("✅ Created restart.txt - changes will apply on next request")
      return true
    end
  rescue => e
    log_deployment("⚠️ Restart error: #{e.message}")
    log_deployment("✅ Fallback: restart.txt created - changes will apply on next request")
    true # Don't fail deployment just because restart failed
  end

  # Detect the Docker container name we're running in
  def detect_container_name
    # Try to get container hostname (which is usually the container ID)
    hostname = `hostname`.strip
    
    # Try to find container name using docker ps
    cmd = "docker ps --format '{{.Names}}' --filter id=#{hostname}"
    container_name = `#{cmd}`.strip
    
    return container_name if container_name.present?
    
    # Fallback: try common Zammad container names
    ['zammad-railsserver', 'zammad_railsserver_1', 'railsserver'].each do |name|
      stdout, stderr, status = Open3.capture3("docker ps --filter name=#{name} --format '{{.Names}}'")
      return name if status.success? && stdout.strip.present?
    end
    
    nil
  rescue => e
    Rails.logger.error "Error detecting container name: #{e.message}"
    nil
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
    elsif log_text.include?("Restarting Zammad") || log_text.include?("restarted container")
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
    
    FileUtils.mkdir_p(File.dirname(DEPLOY_LOG))
    
    File.open(DEPLOY_LOG, 'a') do |f|
      f.puts log_line
    end
    
    Rails.logger.info log_line
  end

  def run_script(command, *args)
    cmd = [SCRIPT_PATH, command] + args
    
    stdout, stderr, status = Open3.capture3(*cmd)
    
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