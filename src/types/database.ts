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
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          video_id: string
          video_title: string
          video_url: string
          content: string
          has_timestamps: boolean
          source: 'official' | 'whisper'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          video_id: string
          video_title: string
          video_url: string
          content: string
          has_timestamps?: boolean
          source: 'official' | 'whisper'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          video_id?: string
          video_title?: string
          video_url?: string
          content?: string
          has_timestamps?: boolean
          source?: 'official' | 'whisper'
          created_at?: string
        }
      }
      generated_content: {
        Row: {
          id: string
          user_id: string
          transcript_ids: string[]
          content: string
          format: string
          voice: string
          tone_profile_id: string | null
          image_url: string | null
          image_prompt: string | null
          seo_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transcript_ids: string[]
          content: string
          format: string
          voice: string
          tone_profile_id?: string | null
          image_url?: string | null
          image_prompt?: string | null
          seo_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transcript_ids?: string[]
          content?: string
          format?: string
          voice?: string
          tone_profile_id?: string | null
          image_url?: string | null
          image_prompt?: string | null
          seo_metadata?: Json | null
          created_at?: string
        }
      }
      tone_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          style_dna: string
          sample_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          style_dna: string
          sample_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          style_dna?: string
          sample_text?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
