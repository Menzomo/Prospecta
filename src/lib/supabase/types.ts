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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
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
          lead_id: string
          gmail_thread_id: string
          subject: string
          last_reply_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id: string
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
          lead_id: string
          thread_id: string
          template_id: string | null
          subject: string
          body: string
          direction: string
          gmail_message_id: string
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id: string
          thread_id: string
          template_id?: string | null
          subject: string
          body: string
          direction?: string
          gmail_message_id: string
          sent_at?: string
          created_at?: string
        }
        Update: {
          last_reply_at?: string | null
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
          lead_id: string
          title: string
          notes: string | null
          due_at: string
          status: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lead_id: string
          title: string
          notes?: string | null
          due_at: string
          status?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          notes?: string | null
          due_at?: string
          status?: string
          completed_at?: string | null
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
