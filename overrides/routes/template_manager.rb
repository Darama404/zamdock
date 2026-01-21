# File: config/routes/template_manager.rb

Zammad::Application.routes.draw do
  api_path = Rails.configuration.api_path

  match api_path + '/template_admin/categories',             to: 'template_management#list_categories',   via: :get
  match api_path + '/template_admin/categories',             to: 'template_management#create_category',   via: :post
  match api_path + '/template_admin/categories/:id',         to: 'template_management#delete_category',   via: :delete

  match api_path + '/template_admin/categories/:id/templates',              to: 'template_management#list_templates',    via: :get
  match api_path + '/template_admin/categories/:id/templates',              to: 'template_management#create_template',   via: :post
  match api_path + '/template_admin/categories/:id/templates/:template_id', to: 'template_management#delete_template',   via: :delete
  
  match api_path + '/template_admin/categories/:id/templates/:template_id/content', to: 'template_management#get_template_content', via: :get

  match api_path + '/template_admin/pending',        to: 'template_management#show_pending',   via: :get
  match api_path + '/template_admin/pending/count',  to: 'template_management#pending_count',  via: :get
  
  match api_path + '/template_admin/apply_changes',  to: 'template_management#apply_changes',  via: :post
  match api_path + '/template_admin/deploy_status',  to: 'template_management#deploy_status',  via: :get
end