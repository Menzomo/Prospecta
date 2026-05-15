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
