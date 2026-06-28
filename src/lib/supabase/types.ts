export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          oauth_notification_sent: boolean
          gmail_request_email: string | null
          gmail_request_status: string
          gmail_requested_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          oauth_notification_sent?: boolean
          gmail_request_email?: string | null
          gmail_request_status?: string
          gmail_requested_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          oauth_notification_sent?: boolean
          gmail_request_email?: string | null
          gmail_request_status?: string
          gmail_requested_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          subject: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          subject: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          subject?: string
          body?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          user_id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          website: string | null
          city: string | null
          source: string
          status: string
          notes: string | null
          is_hidden: boolean
          hidden_at: string | null
          last_contacted_at: string | null
          last_reply_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          city?: string | null
          source?: string
          status?: string
          notes?: string | null
          is_hidden?: boolean
          hidden_at?: string | null
          last_contacted_at?: string | null
          last_reply_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          city?: string | null
          source?: string
          status?: string
          notes?: string | null
          is_hidden?: boolean
          hidden_at?: string | null
          last_contacted_at?: string | null
          last_reply_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          user_lead_id: string | null
          gmail_thread_id: string
          subject: string
          last_reply_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          user_lead_id?: string | null
          gmail_thread_id: string
          subject: string
          last_reply_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          gmail_thread_id?: string
          subject?: string
          last_reply_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          user_lead_id: string | null
          thread_id: string
          template_id: string | null
          subject: string
          body: string
          direction: string
          gmail_message_id: string
          from_email: string | null
          sent_at: string
          created_at: string
          is_read: boolean
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          user_lead_id?: string | null
          thread_id: string
          template_id?: string | null
          subject: string
          body: string
          direction?: string
          gmail_message_id: string
          from_email?: string | null
          sent_at?: string
          created_at?: string
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          last_reply_at?: string | null
          is_read?: boolean
          read_at?: string | null
        }
        Relationships: []
      }
      gmail_connections: {
        Row: {
          id: string
          user_id: string
          gmail_email: string
          provider_account_id: string | null
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          scope: string | null
          is_connected: boolean
          connected_at: string
          disconnected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gmail_email: string
          provider_account_id?: string | null
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          is_connected?: boolean
          connected_at?: string
          disconnected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          gmail_email?: string
          provider_account_id?: string | null
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          is_connected?: boolean
          connected_at?: string
          disconnected_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string
          description: string | null
          city: string | null
          phone: string | null
          commercial_email: string | null
          website: string | null
          logo_path: string | null
          presentation_pdf_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          description?: string | null
          city?: string | null
          phone?: string | null
          commercial_email?: string | null
          website?: string | null
          logo_path?: string | null
          presentation_pdf_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          description?: string | null
          city?: string | null
          phone?: string | null
          commercial_email?: string | null
          website?: string | null
          logo_path?: string | null
          presentation_pdf_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      followups: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          user_lead_id: string | null
          title: string
          notes: string | null
          due_at: string
          status: string
          type: string
          email_message_id: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          user_lead_id?: string | null
          title: string
          notes?: string | null
          due_at: string
          status?: string
          type?: string
          email_message_id?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          notes?: string | null
          due_at?: string
          status?: string
          type?: string
          email_message_id?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_categories: {
        Row: {
          id: string
          name: string
          slug: string
          search_terms: string[]
          confidence_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          search_terms?: string[]
          confidence_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          search_terms?: string[]
          confidence_rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      global_leads: {
        Row: {
          id: string
          company_name: string
          email: string | null
          website: string | null
          phone: string | null
          city: string | null
          state: string | null
          category_id: string | null
          confidence_score: number
          provider_source: string | null
          provider_external_id: string | null
          status: string
          review_required: boolean
          lead_quality_status: string
          last_enrichment_at: string | null
          enrichment_attempts: number
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          email?: string | null
          website?: string | null
          phone?: string | null
          city?: string | null
          state?: string | null
          category_id?: string | null
          confidence_score?: number
          provider_source?: string | null
          provider_external_id?: string | null
          status?: string
          review_required?: boolean
          lead_quality_status?: string
          last_enrichment_at?: string | null
          enrichment_attempts?: number
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          email?: string | null
          website?: string | null
          phone?: string | null
          city?: string | null
          state?: string | null
          category_id?: string | null
          confidence_score?: number
          provider_source?: string | null
          provider_external_id?: string | null
          status?: string
          review_required?: boolean
          lead_quality_status?: string
          last_enrichment_at?: string | null
          enrichment_attempts?: number
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_leads: {
        Row: {
          id: string
          user_id: string
          global_lead_id: string
          status: string
          hidden: boolean
          notes: string | null
          last_contacted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          global_lead_id: string
          status?: string
          hidden?: boolean
          notes?: string | null
          last_contacted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          hidden?: boolean
          notes?: string | null
          last_contacted?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: string
          name: string
          state: string
          state_code: string
          search_text: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          state: string
          state_code: string
          search_text: string
          created_at?: string
        }
        Update: {
          name?: string
          state?: string
          state_code?: string
          search_text?: string
        }
        Relationships: []
      }
      template_attachments: {
        Row: {
          id: string
          user_id: string
          template_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          created_at?: string
        }
        Update: {
          file_name?: string
        }
        Relationships: []
      }
      apify_import_jobs: {
        Row: {
          id: string
          created_by: string
          category_id: string | null
          category_name: string
          city: string
          requested_limit: number
          status: string
          apify_run_id: string | null
          apify_dataset_id: string | null
          imported_count: number
          skipped_duplicate_count: number
          email_found_count: number
          website_only_count: number
          manual_review_count: number
          invalid_count: number
          error_message: string | null
          payload: Json | null
          created_at: string
          updated_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          created_by: string
          category_id?: string | null
          category_name: string
          city: string
          requested_limit: number
          status?: string
          apify_run_id?: string | null
          apify_dataset_id?: string | null
          imported_count?: number
          skipped_duplicate_count?: number
          email_found_count?: number
          website_only_count?: number
          manual_review_count?: number
          invalid_count?: number
          error_message?: string | null
          payload?: Json | null
          created_at?: string
          updated_at?: string
          finished_at?: string | null
        }
        Update: {
          status?: string
          apify_run_id?: string | null
          apify_dataset_id?: string | null
          imported_count?: number
          skipped_duplicate_count?: number
          email_found_count?: number
          website_only_count?: number
          manual_review_count?: number
          invalid_count?: number
          error_message?: string | null
          updated_at?: string
          finished_at?: string | null
        }
        Relationships: []
      }
      telephony_settings: {
        Row: {
          id: string
          user_id: string
          account_sid: string
          auth_token_encrypted: string
          api_key_sid: string | null
          api_key_secret_encrypted: string | null
          phone_number: string
          twiml_app_sid: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_sid: string
          auth_token_encrypted: string
          api_key_sid?: string | null
          api_key_secret_encrypted?: string | null
          phone_number: string
          twiml_app_sid?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          account_sid?: string
          auth_token_encrypted?: string
          api_key_sid?: string | null
          api_key_secret_encrypted?: string | null
          phone_number?: string
          twiml_app_sid?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          id: string
          user_id: string
          lead_id: string | null
          user_lead_id: string | null
          call_sid: string
          to_number: string
          from_number: string
          direction: string
          status: string
          duration_seconds: number | null
          created_at: string
          ended_at: string | null
          recording_sid: string | null
          recording_url: string | null
          recording_expires_at: string | null
          recording_deleted_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          lead_id?: string | null
          user_lead_id?: string | null
          call_sid: string
          to_number: string
          from_number: string
          direction?: string
          status?: string
          duration_seconds?: number | null
          created_at?: string
          ended_at?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          recording_expires_at?: string | null
          recording_deleted_at?: string | null
          notes?: string | null
        }
        Update: {
          status?: string
          duration_seconds?: number | null
          ended_at?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          recording_expires_at?: string | null
          recording_deleted_at?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      call_analyses: {
        Row: {
          id: string
          call_id: string
          user_id: string
          status: string
          transcript: string | null
          summary: string | null
          key_points: Json | null
          objections: Json | null
          conversion_strategies: Json | null
          suggested_status: string | null
          suggested_followup_days: number | null
          suggested_followup_notes: string | null
          ai_model: string | null
          processing_started_at: string | null
          processing_completed_at: string | null
          error_message: string | null
          credits_used: number
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          user_id: string
          status?: string
          transcript?: string | null
          summary?: string | null
          key_points?: Json | null
          objections?: Json | null
          conversion_strategies?: Json | null
          suggested_status?: string | null
          suggested_followup_days?: number | null
          suggested_followup_notes?: string | null
          ai_model?: string | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          error_message?: string | null
          credits_used?: number
          created_at?: string
        }
        Update: {
          status?: string
          transcript?: string | null
          summary?: string | null
          key_points?: Json | null
          objections?: Json | null
          conversion_strategies?: Json | null
          suggested_status?: string | null
          suggested_followup_days?: number | null
          suggested_followup_notes?: string | null
          ai_model?: string | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      analysis_credits: {
        Row: {
          id: string
          user_id: string
          plan_name: string
          credits_total: number
          credits_used: number
          period_start: string
          period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name?: string
          credits_total?: number
          credits_used?: number
          period_start: string
          period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          credits_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_sync_status: {
        Row: {
          id: string
          user_id: string
          last_email_sync: string | null
          last_call_sync: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          last_email_sync?: string | null
          last_call_sync?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          last_email_sync?: string | null
          last_call_sync?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
