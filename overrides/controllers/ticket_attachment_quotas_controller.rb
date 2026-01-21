# Copyright (C) 2012-2025 Zammad Foundation, https://zammad-foundation.org/

class TicketAttachmentQuotasController < ApplicationController
  prepend_before_action :authentication_check

  # GET /api/v1/tickets/:ticket_id/attachment_quota
  def show
    # Get ticket and check permission
    ticket = Ticket.find(params[:ticket_id])
    authorize!(ticket, :show?)

    # Configuration (dapat dipindah ke Setting nanti)
    max_count = 5
    max_size = 10 * 1024 * 1024 # 10 MB

    # Get existing attachments from all articles
    existing_attachments = []
    ticket.articles.each do |article|
      article.attachments.each do |attachment|
        # Skip inline images (content_preview)
        next if attachment.preferences && attachment.preferences[:content_preview]
        
        existing_attachments << attachment
      end
    end

    existing_count = existing_attachments.count
    existing_size = existing_attachments.sum(&:size)

    # Calculate remaining quota
    remaining_count = [max_count - existing_count, 0].max
    remaining_size = [max_size - existing_size, 0].max

    # Return quota information
    render json: {
      ticket_id: ticket.id,
      existing: {
        count: existing_count,
        size: existing_size,
        files: existing_attachments.map do |attachment|
          {
            id: attachment.id,
            name: attachment.filename,
            size: attachment.size
          }
        end
      },
      limits: {
        max_count: max_count,
        max_size: max_size
      },
      remaining: {
        count: remaining_count,
        size: remaining_size
      }
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Ticket not found' }, status: :not_found
  rescue Pundit::NotAuthorizedError
    render json: { error: 'Not authorized' }, status: :forbidden
  end
end