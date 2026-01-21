# Copyright (C) 2012-2025 Zammad Foundation, https://zammad-foundation.org/

Zammad::Application.routes.draw do
  api_path = Rails.configuration.api_path

  # Attachment Quota API
  match api_path + '/tickets/:ticket_id/attachment_quota',                to: 'ticket_attachment_quotas#show',   via: :get
end